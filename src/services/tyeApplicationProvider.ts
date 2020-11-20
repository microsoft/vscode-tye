// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { Observable } from 'rxjs'
import { mergeMap } from 'rxjs/operators';
import { MonitoredTask, TaskMonitor } from 'src/tasks/taskMonitor';
import { TyeClientProvider } from './tyeClient';

export type TyeApplication = {
    readonly dashboard?: vscode.Uri;
    readonly name?: string;
    readonly replicaPids?: { [key: string]: number };
};

export interface TyeApplicationProvider {
    readonly applications: Observable<TyeApplication[]>;
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
                .pipe(mergeMap(tasks => this.toApplications(tasks)));
    }

    get applications(): Observable<TyeApplication[]> {
        return this._applications;
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
            const projectServices = (services ?? []).filter(service => service.serviceType === 'project');
            const replicaPids=
                projectServices
                    .map(service => Object.keys(service.replicas).map(replicaName => ({ name: replicaName, pid: service.replicas[replicaName].pid })))
                    .flat()
                    .reduce<{ [key: string]: number }>(
                        (previous, current) => {
                            previous[current.name] = current.pid;
                            return previous;
                        },
                        {});

            return { ...application, replicaPids };
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