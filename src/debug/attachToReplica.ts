// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { KnownServiceType } from 'src/services/tyeApplicationProvider';
import * as psTree from 'ps-tree';
import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { getLocalizationPathForFile } from '../util/localization';
import { DebugSessionMonitor } from './debugSessionMonitor';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

function getProcessTree(pid: number): Promise<readonly psTree.PS[]> {
    return new Promise(
        (resolve, reject) => {
            psTree(
                pid,
                (error, children) => {
                    if (error) {
                        return reject(error);
                    }

                    resolve(children);
                });
        });
}

async function getFunctionProcess(pid: number): Promise<string | undefined> {
    const processes = await getProcessTree(pid);

    const functionProcess = processes.slice().reverse().find(c => /(dotnet|func)(\.exe|)$/i.test(c.COMMAND || ''));

    return functionProcess ? functionProcess.PID : undefined;
}

export async function attachToReplica(debugSessionMonitor: DebugSessionMonitor, folder: vscode.WorkspaceFolder | undefined, serviceType: KnownServiceType, replicaName: string, replicaPid: number | undefined): Promise<void> {
    if (replicaPid !== undefined && !debugSessionMonitor.isAttached(replicaPid)) {
        let actualPid: string | undefined = replicaPid.toString();

        if (serviceType === 'function') {
            actualPid = await getFunctionProcess(replicaPid);
        }

        if (actualPid !== undefined) {           
            await vscode.debug.startDebugging(
                folder,
                {
                    type: 'coreclr',
                    name: localize('debug.attachToReplica.sessionName', 'Tye Replica: {0}', replicaName),
                    request: 'attach',
                    processId: actualPid
                });
        }
    }
}