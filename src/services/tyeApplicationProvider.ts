// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { Observable } from 'rxjs'
import { first, switchMap } from 'rxjs/operators';
import { TyeClient, TyeClientProvider } from './tyeClient';
import { TyeProcess, TyeProcessProvider } from './tyeProcessProvider';

export type KnownServiceType = 'project' | 'function';

export type TyeProjectService = {
    replicas: { [key: string]: number | undefined };
    serviceType: KnownServiceType;
};

export type TyeApplication = {
    readonly dashboard: vscode.Uri;
    readonly name: string;
    readonly pid?: number;
    readonly projectServices: { [key: string]: TyeProjectService };
};

export interface TyeApplicationProvider {
    readonly applications: Observable<TyeApplication[]>;

    getApplications(): Promise<TyeApplication[]>;
}

export class TaskBasedTyeApplicationProvider implements TyeApplicationProvider {
    private readonly _applications: Observable<TyeApplication[]>;

    constructor(private readonly tyeProcessProvider: TyeProcessProvider, private readonly tyeClientProvider: TyeClientProvider) {
        this._applications =
            tyeProcessProvider
                .processes
                .pipe(switchMap(processes => this.toApplications(processes)));
    }

    get applications(): Observable<TyeApplication[]> {
        return this._applications;
    }

    getApplications(): Promise<TyeApplication[]> {
        return this.applications.pipe(first()).toPromise();
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