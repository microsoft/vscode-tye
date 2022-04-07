// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { Observable, timer } from 'rxjs'
import { distinctUntilChanged, first, switchMap } from 'rxjs/operators';
import { TyeClientProvider } from './tyeClient';
import { TyeProcess, TyeProcessProvider } from './tyeProcessProvider';
import { arrayComparer } from '../util/comparison';

export type KnownServiceType = 'project' | 'function';

export type TyeProjectService = {
    replicas: { [key: string]: number | undefined };
    serviceType: KnownServiceType;
};

export type TyeApplication = {
    readonly dashboard: vscode.Uri;
    readonly id: string;
    readonly name: string;
    readonly pid?: number;
    readonly projectServices: { [key: string]: TyeProjectService };
};

export interface TyeApplicationProvider {
    readonly applications: Observable<TyeApplication[]>;

    getApplications(): Promise<TyeApplication[]>;
}

function nameSorter(x: { name: string }, y: { name: string }): number {
    return x.name.localeCompare(y.name);
}

function serviceComparer(x: TyeProjectService, y: TyeProjectService): boolean {
    if (x.serviceType !== y.serviceType) {
        return false;
    }

    const xReplicas = Object.keys(x.replicas).map(name => ({ name, replica: x.replicas[name] })).sort(nameSorter);
    const yReplicas = Object.keys(y.replicas).map(name => ({ name, replica: y.replicas[name] })).sort(nameSorter);

    if (xReplicas.length !== yReplicas.length) {
        return false;
    }

    for (let i = 0; i < xReplicas.length; i++) {
        const xiReplica = xReplicas[i].replica;
        const yiReplica = yReplicas[i].replica;

        if (xiReplica !== yiReplica) {
            return false;
        }
    }

    return true;
}

export function applicationComparer(x: TyeApplication | undefined, y: TyeApplication | undefined): boolean {
    if (x === undefined && y === undefined) {
        return true;
    }

    if (x === undefined || y === undefined) {
        return false;
    }

    if (x.id !== y.id
        || x.name !== y.name
        || x.dashboard.toString() !== y.dashboard.toString()
        || x.pid !== y.pid) {
        return false;
    }

    const xServices = Object.keys(x.projectServices).map(name => ({ name, service: x.projectServices[name] })).sort(nameSorter);
    const yServices = Object.keys(y.projectServices).map(name => ({ name, service: y.projectServices[name] })).sort(nameSorter);

    if (xServices.length !== yServices.length) {
        return false;
    }

    for (let j = 0; j < xServices.length; j++) {
        const xijService = xServices[j];
        const yijService = yServices[j];

        if (xijService.name !== yijService.name
            || !serviceComparer(xijService.service, yijService.service)) {
            return false;
        }
    }

    return true;
}

function applicationsComparer(x: TyeApplication[], y: TyeApplication[]): boolean {
    return arrayComparer(x, y, nameSorter, applicationComparer);
}

export class TaskBasedTyeApplicationProvider implements TyeApplicationProvider {
    private readonly _applications: Observable<TyeApplication[]>;

    constructor(private readonly tyeProcessProvider: TyeProcessProvider, private readonly tyeClientProvider: TyeClientProvider) {
        this._applications =
            tyeProcessProvider
                .processes
                .pipe(switchMap(processes => this.toApplicationsStream(processes)));
    }

    get applications(): Observable<TyeApplication[]> {
        return this._applications;
    }

    async getApplications(): Promise<TyeApplication[]> {
        const firstApplications = await this.applications.pipe(first()).toPromise();

        return firstApplications ?? [];
    }

    private toApplicationsStream(processes: TyeProcess[]): Observable<TyeApplication[]> {
        // TODO: Adjust and/or make interval configurable.
        return timer(0, 2000)
        .pipe(
            switchMap(() => this.toApplications(processes)),
            distinctUntilChanged(applicationsComparer));
    }

    private async toApplications(processes: TyeProcess[]): Promise<TyeApplication[]> {
        const applications =
            processes
                .map(process => ({
                    dashboard: vscode.Uri.parse(`http://localhost:${process.dashboardPort}`),
                    pid: process.pid
                }))
                .map(process => ({
                    ...process, tyeClient: this.tyeClientProvider(process.dashboard)
                }))
                .filter(process => process.tyeClient !== undefined)
                .map(async process => {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const application = await process.tyeClient!.getApplication();

                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const services = await process.tyeClient!.getServices();

                    const projectServices =
                        (services ?? [])
                            .filter(service => (service.serviceType === 'project') || (service.serviceType === 'function'))
                            .reduce<{ [key: string]: TyeProjectService }>(
                                (serviceMap, service) => {
                                    serviceMap[service.description.name] = {
                                        replicas:
                                            Object.keys(service.replicas)
                                                .reduce<{ [key: string]: number | undefined }>(
                                                    (replicaMap, replicaName) => {
                                                        replicaMap[replicaName] = service.replicas[replicaName].pid;
                                                        return replicaMap;
                                                    },
                                                    {}),
                                        serviceType: <KnownServiceType>service.serviceType
                                    };
                                    return serviceMap;
                                },
                                {});
    
                    return {
                        dashboard: process.dashboard,
                        id: application.id,
                        name: application.name,
                        pid: process.pid,
                        projectServices
                    };
                });                

        // Ignore processes for which we were unable to obtain application metadata.
        // TODO: Log failures (or retry?).
        const result = await Promise.allSettled(applications);

        function isFulfilled<T>(r: PromiseSettledResult<T>): r is PromiseFulfilledResult<T> {
            return r.status === 'fulfilled';
        }

        return result.filter(isFulfilled).map(r => r.value);
    }
}