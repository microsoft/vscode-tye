import { TaskMonitor } from "src/tasks/taskMonitor";
import * as vscode from 'vscode';

export class MockTaskMonitor implements TaskMonitor {
    private readonly changedEventEmitter = new vscode.EventEmitter<void>();

    get tasksChanged(): vscode.Event<void> {
        return this.changedEventEmitter.event;
    }
}
