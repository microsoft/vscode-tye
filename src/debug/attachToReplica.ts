// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { getLocalizationPathForFile } from '../util/localization';
import { DebugSessionMonitor } from './debugSessionMonitor';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

export async function attachToReplica(debugSessionMonitor: DebugSessionMonitor, folder: vscode.WorkspaceFolder | undefined, replicaName: string, replicaPid: number | undefined): Promise<void> {
    if (replicaPid !== undefined && !debugSessionMonitor.isAttached(replicaPid)) {
        await vscode.debug.startDebugging(
            folder,
            {
                type: 'coreclr',
                name: localize('debug.attachToReplica.sessionName', 'Tye Replica: {0}', replicaName),
                request: 'attach',
                processId: replicaPid.toString()
            });
    }
}
