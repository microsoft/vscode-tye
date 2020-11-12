// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';

export interface TaskMonitor {
    readonly tasksChanged: vscode.Event<void>;
}

export interface TaskMonitorReporter {
    reportTaskStart(): void;
    reportTaskRunning(): void;
    reportTaskEnd(): void;

    reportTask<T = void>(callback: (reportTaskRunning: () => void) => Promise<T>): Promise<T>;
}

export class DaprTaskMonitor extends vscode.Disposable implements TaskMonitor, TaskMonitorReporter {
    private readonly tasksChangedEmitter = new vscode.EventEmitter<void>();

    constructor() {
        super(
            () => {
                this.tasksChangedEmitter.dispose();
            });
    }

    get tasksChanged(): vscode.Event<void> {
        return this.tasksChangedEmitter.event;
    }

    reportTaskStart(): void {
        this.tasksChangedEmitter.fire();
    }

    reportTaskRunning(): void {
        this.tasksChangedEmitter.fire();
    }

    reportTaskEnd(): void {
        this.tasksChangedEmitter.fire();
    }

    async reportTask<T = void>(callback: (reportTaskRunning: () => void) => Promise<T>): Promise<T> {
        this.reportTaskStart();

        try {
            return await callback(() => this.reportTaskRunning());
        } finally {
            this.reportTaskEnd();
        }
    }
}
