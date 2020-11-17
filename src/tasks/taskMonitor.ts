// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';

export type MonitoredTask = {
    readonly name: string;
    readonly options?: unknown;
    readonly state: 'started' | 'running';
}

export interface TaskMonitor {
    readonly tasks: MonitoredTask[];

    readonly tasksChanged: vscode.Event<void>;
}

export interface TaskMonitorReporter {
    reportTaskStart(name: string): void;
    reportTaskRunning(name: string, options?: unknown): void;
    reportTaskEnd(name: string): void;

    reportTask<T = void>(name: string, callback: (reportTaskRunning: (options?: unknown) => void) => Promise<T>): Promise<T>;
}

export class TyeTaskMonitor extends vscode.Disposable implements TaskMonitor, TaskMonitorReporter {
    private readonly tasksChangedEmitter = new vscode.EventEmitter<void>();
    private readonly taskMap: { [key: string]: MonitoredTask } = {};

    constructor() {
        super(
            () => {
                this.tasksChangedEmitter.dispose();
            });
    }

    get tasks(): MonitoredTask[] {
        return Object.values(this.taskMap);
    }

    get tasksChanged(): vscode.Event<void> {
        return this.tasksChangedEmitter.event;
    }

    reportTaskStart(name: string): void {
        this.taskMap[name] = { name, state: 'started' };

        this.tasksChangedEmitter.fire();
    }

    reportTaskRunning(name: string, options?: unknown): void {
        this.taskMap[name] = { name, options, state: 'running' };

        this.tasksChangedEmitter.fire();
    }

    reportTaskEnd(name: string): void {
        delete this.taskMap[name];

        this.tasksChangedEmitter.fire();
    }

    async reportTask<T = void>(name: string, callback: (reportTaskRunning: (options?: unknown) => void) => Promise<T>): Promise<T> {
        this.reportTaskStart(name);

        try {
            return await callback(options => this.reportTaskRunning(name, options));
        } finally {
            this.reportTaskEnd(name);
        }
    }
}
