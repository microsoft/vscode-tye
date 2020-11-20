// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { BehaviorSubject, Observable } from 'rxjs'

export type MonitoredTask = {
    readonly name: string;
    readonly options?: unknown;
    readonly state: 'started' | 'running';
    readonly type: string;
}

export interface TaskMonitor {
    readonly tasks: Observable<MonitoredTask[]>;
}

export interface TaskMonitorReporter {
    reportTaskStart(name: string, type: string): void;
    reportTaskRunning(name: string, type: string, options?: unknown): void;
    reportTaskEnd(name: string): void;

    reportTask<T = void>(name: string, type: string, callback: (reportTaskRunning: (options?: unknown) => void) => Promise<T>): Promise<T>;
}

export class TyeTaskMonitor extends vscode.Disposable implements TaskMonitor, TaskMonitorReporter {
    private readonly taskMap: { [key: string]: MonitoredTask } = {};

    private readonly _tasks = new BehaviorSubject<MonitoredTask[]>([]);

    constructor() {
        super(
            () => {
                // TODO: Is this general practice for "disposing" of observables?
                this._tasks.unsubscribe();
            });
    }

    get tasks(): Observable<MonitoredTask[]> {
        return this._tasks;
    }

    reportTaskStart(name: string, type: string): void {
        this.taskMap[name] = { name, state: 'started', type };

        this._tasks.next(Object.values(this.taskMap));
    }

    reportTaskRunning(name: string, type: string, options?: unknown): void {
        this.taskMap[name] = { name, options, state: 'running', type};

        this._tasks.next(Object.values(this.taskMap));
    }

    reportTaskEnd(name: string): void {
        delete this.taskMap[name];

        this._tasks.next(Object.values(this.taskMap));
    }

    async reportTask<T = void>(name: string, type: string, callback: (reportTaskRunning: (options?: unknown) => void) => Promise<T>): Promise<T> {
        this.reportTaskStart(name, type);

        try {
            return await callback(options => this.reportTaskRunning(name, type, options));
        } finally {
            this.reportTaskEnd(name);
        }
    }
}
