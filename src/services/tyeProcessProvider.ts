// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { Observable, timer } from 'rxjs'
import { distinctUntilChanged, first, switchMap } from 'rxjs/operators';
import { arrayComparer } from '../util/comparison';
import { PortProvider } from './portProvider';
import { ProcessProvider } from './processProvider';
import { TyeClientProvider } from './tyeClient';
import { TyePathProvider } from './tyePathProvider';

export interface TyeProcess {
    pid: number;
    dashboardPort: number;
}

export interface TyeProcessWithPorts {
    pid: number;
    ports: number[];
}

export interface TyeProcessProvider {
    readonly processes: Observable<TyeProcess[]>;
    getProcesses(): Promise<TyeProcess[]>;
}

function tyeProcessComparer(x: TyeProcess, y: TyeProcess): boolean {
    return x.pid === y.pid && x.dashboardPort === y.dashboardPort;
}

function tyeProcessesComparer(x: TyeProcess[], y: TyeProcess[]): boolean {
    return arrayComparer(x, y, (a: TyeProcess, b: TyeProcess) => a.pid - b.pid, tyeProcessComparer);
}

function tyeProcessWithPortsComparer(x: TyeProcessWithPorts, y: TyeProcessWithPorts): boolean {
    return x.pid === y.pid && arrayComparer(x.ports, y.ports, (a, b) => a - b, (a, b) => a === b);
}

function tyeProcessesWithPortsComparer(x: TyeProcessWithPorts[], y: TyeProcessWithPorts[]): boolean {
    return arrayComparer(x, y, (a: TyeProcessWithPorts, b: TyeProcessWithPorts) => a.pid - b.pid, tyeProcessWithPortsComparer);
}

export default class LocalTyeProcessProvider implements TyeProcessProvider {
    private readonly _processes: Observable<TyeProcess[]>;

    constructor(
        private readonly portProvider: PortProvider,
        private readonly processProvider: ProcessProvider,
        private readonly tyeClientProvider: TyeClientProvider,
        private readonly tyePathProvider: TyePathProvider) {
        this._processes =
            // TODO: Make interval configurable.
            // NOTE: switchMap() will cancel previous invocations.
            //       What we really want is an interval after each
            //       successful attempt.
            // NOTE: There is a small (minute?) chance that a tye
            //       process could be recycled such that it ends
            //       up with the same PID and dynamically chosen
            //       port. If possible, perhaps incorporate a
            //       timestamp into the comparison.
            timer(0, 2000)
                .pipe(
                    // Get list of tye processes and their exposed ports...
                    switchMap(() => this.getTyeProcessesWithPorts()),
                    // Ignore updates that don't change the processes or their ports...
                    distinctUntilChanged(tyeProcessesWithPortsComparer),
                    // Identify the dashboard port for each tye process...
                    switchMap(processes => this.determineDashboardPorts(processes)),
                    // Ignore updates that don't change the processes or their dashboard...
                    distinctUntilChanged(tyeProcessesComparer));
    }

    get processes(): Observable<TyeProcess[]> {
        return this._processes;
    }

    async getProcesses(): Promise<TyeProcess[]> {
        const firstProcesses = await this.processes.pipe(first()).toPromise();

        return firstProcesses ?? [];
    }

    private async getTyeProcessesWithPorts(): Promise<TyeProcessWithPorts[]> {
        const tyePath = await this.tyePathProvider.getTyePath();
        const tyeProcesses = await this.processProvider.listProcesses(tyePath);
        
        return await Promise.all(tyeProcesses.map(process => this.getTyeProcessWithPorts(process.pid)));
    }

    private async determineDashboardPorts(processes: TyeProcessWithPorts[]): Promise<TyeProcess[]> {
        const allProcesses = await Promise.all(processes.map(process => this.determineDashboardPort(process)));

        function isValidProcess(process: TyeProcess | undefined): process is TyeProcess {
            return !!process;
        }

        return allProcesses.filter(isValidProcess);
    }

    private async getTyeProcessWithPorts(pid: number): Promise<TyeProcessWithPorts> {
        const ports = await this.portProvider.getPortsForProcess(pid);

        return { pid, ports };
    }

    private async determineDashboardPort(process: TyeProcessWithPorts): Promise<TyeProcess | undefined> {
        for (const port of process.ports) {
            const dashboardUri = vscode.Uri.parse(`http://localhost:${port}`);
            const client = this.tyeClientProvider(dashboardUri);

            if (client) {
                try {
                    // TODO: Ingress may redirect to similarly named endpoints; we should use a more uniquely Tye endpoint.
                    const endpoints = await client.getEndpoints();

                    if (endpoints) {
                        return { pid: process.pid, dashboardPort: port };
                    }
                }
                catch {
                    continue;
                }
            }
        }

        return undefined;
    }
}
