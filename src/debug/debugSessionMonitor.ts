import * as vscode from 'vscode';

export interface DebugSessionMonitor {
    isAttached(pid: number): boolean;
}

export class CoreClrDebugSessionMonitor extends vscode.Disposable implements DebugSessionMonitor {
    private readonly onDidStartListener: vscode.Disposable;
    private readonly onDidTerminateListener: vscode.Disposable;

    private readonly pids = new Set<number>();

    constructor() {
        super(
            () => {
                this.onDidStartListener?.dispose();
                this.onDidTerminateListener?.dispose();
            });

        this.onDidStartListener = vscode.debug.onDidStartDebugSession(
            debugSession => {
                if (debugSession.type === 'coreclr' && debugSession.configuration.request === 'attach' && debugSession.configuration.processId) {
                    this.pids.add(parseInt(debugSession.configuration.processId, 10));
                }
            });

            this.onDidTerminateListener = vscode.debug.onDidTerminateDebugSession(
                debugSession => {
                    if (debugSession.type === 'coreclr' && debugSession.configuration.request === 'attach' && debugSession.configuration.processId) {
                        this.pids.delete(parseInt(debugSession.configuration.processId, 10));
                    }
                });
            }

    isAttached(pid: number): boolean {
        return this.pids.has(pid);
    }
}
