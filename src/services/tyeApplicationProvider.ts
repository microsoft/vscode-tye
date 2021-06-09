// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { Observable } from 'rxjs'
import { first, switchMap } from 'rxjs/operators';
import { TyeClientProvider } from './tyeClient';
import { TyeProcess, TyeProcessProvider } from './tyeProcessProvider';

export type KnownServiceType = 'project' | 'function';

export type TyeProjectService = {
    replicas: { [key: string]: number | undefined };
    serviceType: KnownServiceType;
};

export type TyeApplication = {
    readonly dashboard?: vscode.Uri;
    readonly name?: string;
    readonly projectServices?: { [key: string]: TyeProjectService };
};

export interface TyeApplicationProvider {
    readonly applications: Observable<TyeApplication[]>;

    getApplications(): Promise<TyeApplication[]>;
}

type TyeRunTaskOptions = {
    readonly applicationName: string;
    readonly dashboard?: vscode.Uri;
};

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
        const applications = processes.map(process => TaskBasedTyeApplicationProvider.toApplication(process));

        return await Promise.all(applications.map(application => this.withPids(application)));
    }

    private async withPids(application: TyeApplication): Promise<TyeApplication> {
        const tyeClient = this.tyeClientProvider(application.dashboard);

        if (tyeClient) {
            const services = await tyeClient.getServices();
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

            return { ...application, projectServices };
        }

        return application;
    }

    private static toApplication(process: TyeProcess): TyeApplication {
        return {
            dashboard: vscode.Uri.parse(`http://localhost:${process.dashboardPort}`),
            // TODO: What is this name used for?
            name: `PID:${process.pid.toString()}`
        };
    }
}