// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { Observable } from 'rxjs'
import { first, switchMap } from 'rxjs/operators';
import { MonitoredTask, TaskMonitor } from 'src/tasks/taskMonitor';
import { TyeClientProvider } from './tyeClient';

export type TyeProjectService = {
    replicas: { [key: string]: number | undefined };
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

export class TaskBasedTyeApplicationProvider extends vscode.Disposable implements TyeApplicationProvider {
    private readonly _applications: Observable<TyeApplication[]>;

    constructor(private readonly taskMonitor: TaskMonitor, private readonly tyeClientProvider: TyeClientProvider) {
        super(
            () => {
                // TODO: Is this general practice for "disposing" of observables?
                //this._applications.unsubscribe();
            });

        this._applications =
            taskMonitor
                .tasks
                .pipe(switchMap(tasks => this.toApplications(tasks)));
    }

    get applications(): Observable<TyeApplication[]> {
        return this._applications;
    }

    getApplications(): Promise<TyeApplication[]> {
        return this.applications.pipe(first()).toPromise();
    }

    private async toApplications(tasks: MonitoredTask[]): Promise<TyeApplication[]> {
        let applications =
            tasks
                .filter(task => task.type === 'tye-run')
                .map(task => TaskBasedTyeApplicationProvider.toApplication(task));

        if (applications.length === 0) {
            applications = [
                { dashboard: vscode.Uri.parse('http://localhost:8000') }
            ];
        }

        return await Promise.all(applications.map(application => this.withPids(application)));
    }

    private async withPids(application: TyeApplication): Promise<TyeApplication> {
        const tyeClient = this.tyeClientProvider(application.dashboard);

        if (tyeClient) {
            const services = await tyeClient.getServices();
            const projectServices =
                (services ?? [])
                    .filter(service => service.serviceType === 'project')
                    .reduce<{ [key: string]: TyeProjectService }>(
                        (serviceMap, service) => {
                            serviceMap[service.description.name] = {
                                replicas:
                                    Object.keys(service.replicas)
                                        .reduce<{ [key: string]: number }>(
                                            (replicaMap, replicaName) => {
                                                replicaMap[replicaName] = service.replicas[replicaName].pid;
                                                return replicaMap;
                                            },
                                            {})
                            };
                            return serviceMap;
                        },
                        {});

            return { ...application, projectServices };
        }

        return application;
    }

    private static toApplication(task: MonitoredTask): TyeApplication {
        const options = task.options as TyeRunTaskOptions;

        return {
            dashboard: options?.dashboard,
            name: options?.applicationName
        };
    }
}