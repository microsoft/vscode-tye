// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Observable, timer } from 'rxjs'
import { distinctUntilChanged, first, switchMap } from 'rxjs/operators';
import { PortProvider } from './portProvider';
import { ProcessProvider } from './processProvider';

export interface TyeProcess {
    pid: number;
    dashboardPort: number;
}

export interface TyeProcessProvider {
    readonly processes: Observable<TyeProcess[]>;
    getProcesses(): Promise<TyeProcess[]>;
}

function tyeProcessComparer(x: TyeProcess, y: TyeProcess): boolean {
    return x.pid !== y.pid || x.dashboardPort !== y.dashboardPort;
}

function tyeProcessesComparer(x: TyeProcess[], y: TyeProcess[]): boolean {
    if (x.length !== y.length) {
        return false;
    }

    const byPid = (a: TyeProcess, b: TyeProcess) => a.pid - b.pid;

    x = x.slice().sort(byPid);
    y = y.slice().sort(byPid);

    for (let i = 0; i < x.length; i++) {
        if (!tyeProcessComparer(x[i], y[i])) {
            return false;
        }
    }

    return true;
}

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type ProspectiveTyeProcess = WithOptional<TyeProcess, 'dashboardPort'>;

export default class LocalTyeProcessProvider implements TyeProcessProvider {
    private readonly _processes: Observable<TyeProcess[]>;

    constructor(
        private readonly portProvider: PortProvider,
        private readonly processProvider: ProcessProvider) {
        this._processes =
            // TODO: Make interval configurable.
            timer(0, 2000)
                .pipe(
                    // NOTE: switchMap() will cancel previous invocations.
                    //       What we really want is an interval after each
                    //       successful attempt.
                    switchMap(() => this.getProcessList()),
                    // NOTE: There is a small (minute?) chance that a tye
                    //       process could be recycled such that it ends
                    //       up with the same PID and dynamically chosen
                    //       port. If possible, perhaps incorporate a
                    //       timestamp into the comparison.
                    distinctUntilChanged(tyeProcessesComparer));
    }

    get processes(): Observable<TyeProcess[]> {
        return this._processes;
    }

    getProcesses(): Promise<TyeProcess[]> {
        return this.processes.pipe(first()).toPromise();
    }

    private async getProcessList(): Promise<TyeProcess[]> {
        const tyeProcesses = await this.processProvider.listProcesses('tye');
        const tyeProcessesWithPorts = await Promise.all(tyeProcesses.map(process => this.getPortForProcess(process.pid)));

        function hasValidPort(process: ProspectiveTyeProcess): process is TyeProcess {
            return !!process.dashboardPort;
        }

        const tyeProcessesWithValidPorts =
            tyeProcessesWithPorts
                .filter(hasValidPort);

        return tyeProcessesWithValidPorts;
    }

    private async getPortForProcess(pid: number): Promise<ProspectiveTyeProcess> {
        const ports = await this.portProvider.getPortsForProcess(pid);

        return { pid, dashboardPort: ports[0] }
    }
}

