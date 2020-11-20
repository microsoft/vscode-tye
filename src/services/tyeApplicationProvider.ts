// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { Observable } from 'rxjs'
import { mergeMap } from 'rxjs/operators';
import { MonitoredTask, TaskMonitor } from 'src/tasks/taskMonitor';

export type TyeApplication = {
    readonly dashboard?: vscode.Uri;
    readonly name?: string;
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

    constructor(private readonly taskMonitor: TaskMonitor) {
        super(
            () => {
                // TODO: Is this general practice for "disposing" of observables?
                //this._applications.unsubscribe();
            });

        this._applications =
            taskMonitor
                .tasks
                .pipe(mergeMap(tasks => this.updateApplications(tasks)));
    }

    get applications(): Observable<TyeApplication[]> {
        return this._applications;
    }

    private updateApplications(tasks: MonitoredTask[]): Promise<TyeApplication[]> {
        let newApplications =
            tasks
                .filter(task => task.type === 'tye-run')
                .map(task => TaskBasedTyeApplicationProvider.ToApplication(task));

        if (newApplications.length === 0) {
            newApplications = [
                { dashboard: vscode.Uri.parse('http://localhost:8000') }
            ];
        }

        return Promise.resolve(newApplications);
    }

    private static ToApplication(task: MonitoredTask): TyeApplication {
        const options = task.options as TyeRunTaskOptions;

        return {
            dashboard: options?.dashboard,
            name: options?.applicationName
        };
    }
}