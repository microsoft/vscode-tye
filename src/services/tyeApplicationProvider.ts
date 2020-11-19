// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MonitoredTask, TaskMonitor } from 'src/tasks/taskMonitor';
import * as vscode from 'vscode';

export type TyeApplication = {
    readonly dashboard?: vscode.Uri;
    readonly name?: string;
};

export interface TyeApplicationProvider {
    readonly applications: TyeApplication[];

    readonly applicationsChanged: vscode.Event<TyeApplication[]>;
}

type TyeRunTaskOptions = {
    readonly applicationName: string;
    readonly dashboard?: vscode.Uri;
};

export class TaskBasedTyeApplicationProvider extends vscode.Disposable implements TyeApplicationProvider {
    private readonly applicationsChangedEmitter = new vscode.EventEmitter<TyeApplication[]>();
    private readonly listener: vscode.Disposable;
    
    private _applications: TyeApplication[] | undefined = undefined;

    constructor(private readonly taskMonitor: TaskMonitor) {
        super(
            () => {
                this.listener.dispose();

                this.applicationsChangedEmitter.dispose();
            });

        this.listener = this.taskMonitor.tasksChanged(
            () => {
                void this.updateApplications();
            });

        void this.updateApplications();
    }

    get applications(): TyeApplication[] {
        if (this._applications === undefined) {
            // TODO: Ensure this is called only once.
            void this.updateApplications();
        }

        return this._applications ?? [];
    }

    get applicationsChanged(): vscode.Event<TyeApplication[]> {
        return this.applicationsChangedEmitter.event;
    }

    private updateApplications(): Promise<void> {
        let newApplications =
            this.taskMonitor
                .tasks
                .filter(task => task.type === 'tye-run')
                .map(task => TaskBasedTyeApplicationProvider.ToApplication(task));

        if (newApplications.length === 0) {
            newApplications = [
                { dashboard: vscode.Uri.parse('http://localhost:8000') }
            ];
        }

        this._applications = newApplications;

        this.applicationsChangedEmitter.fire(this._applications);

        return Promise.resolve();
    }

    private static ToApplication(task: MonitoredTask): TyeApplication {
        const options = task.options as TyeRunTaskOptions;

        return {
            dashboard: options?.dashboard,
            name: options.applicationName
        };
    }
}