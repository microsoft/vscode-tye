import * as vscode from 'vscode';

export interface TaskMonitor {
    readonly tasksChanged: vscode.Event<void>;
}

export interface TaskMonitorReporter {
    reportTaskStart(): void;
    reportTaskEnd(): void;

    reportTask<T = void>(callback: () => Promise<T>): Promise<T>;
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

    reportTaskEnd(): void {
        this.tasksChangedEmitter.fire();
    }

    async reportTask<T = void>(callback: () => Promise<T>): Promise<T> {
        this.reportTaskStart();

        try {
            return await callback();
        } finally {
            this.reportTaskEnd();
        }
    }
}
