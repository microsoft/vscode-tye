import { MonitoredTask, TaskMonitor } from 'src/tasks/taskMonitor';
import * as vscode from 'vscode';

export type TyeApplication = {
    readonly dashboard?: vscode.Uri;
};

export interface TyeApplicationProvider {
    readonly applications: TyeApplication[];

    readonly applicationsChanged: vscode.Event<TyeApplication[]>;
}

type TyeRunTaskOptions = {
    readonly dashboard?: vscode.Uri;
};

export class TaskBasedTyeApplicationProvider extends vscode.Disposable implements TyeApplicationProvider {
    private readonly applicationsChangedEmitter = new vscode.EventEmitter<TyeApplication[]>();
    private readonly listener: vscode.Disposable;
    
    private _applications: TyeApplication[] = [];

    constructor(taskMonitor: TaskMonitor) {
        super(
            () => {
                this.listener.dispose();

                this.applicationsChangedEmitter.dispose();
            });

        this.listener = taskMonitor.tasksChanged(
            () => {
                this.updateApplications(taskMonitor);
                
                this.applicationsChangedEmitter.fire(this.applications);
            });

        this.updateApplications(taskMonitor);
    }

    get applications(): TyeApplication[] {
        return this._applications;
    }

    get applicationsChanged(): vscode.Event<TyeApplication[]> {
        return this.applicationsChangedEmitter.event;
    }

    private updateApplications(taskMonitor: TaskMonitor) {
        this._applications =
            taskMonitor
                .tasks
                .filter(task => task.type === 'tye-run')
                .map(task => TaskBasedTyeApplicationProvider.ToApplication(task));
    }

    private static ToApplication(task: MonitoredTask): TyeApplication {
        const options = task.options as TyeRunTaskOptions;

        return {
            dashboard: options?.dashboard
        };
    }
}