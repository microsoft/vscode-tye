// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';

export interface DebugSessionMonitor {
    isAttached(pid: number): boolean;
}

const coreClrDebugSessionType = 'coreclr';
const coreClrDebugRequestType = 'attach';

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
                if (debugSession.type === coreClrDebugSessionType && debugSession.configuration.request === coreClrDebugRequestType && debugSession.configuration.processId) {
                    this.pids.add(parseInt(<string>debugSession.configuration.processId, 10));
                }
            });

            this.onDidTerminateListener = vscode.debug.onDidTerminateDebugSession(
                debugSession => {
                    if (debugSession.type === coreClrDebugSessionType && debugSession.configuration.request === coreClrDebugRequestType && debugSession.configuration.processId) {
                        this.pids.delete(parseInt(<string>debugSession.configuration.processId, 10));
                    }
                });
            }

    isAttached(pid: number): boolean {
        return this.pids.has(pid);
    }
}
