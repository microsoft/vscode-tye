import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { getLocalizationPathForFile } from '../util/localization';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

export async function attachToReplica(folder: vscode.WorkspaceFolder | undefined, replicaName: string, pid: number): Promise<void> {
    await vscode.debug.startDebugging(
        folder,
        {
            type: 'coreclr',
            name: localize('debug.attachToReplica.sessionName', 'Tye Replica: {0}', replicaName),
            request: 'attach',
            processId: pid.toString()
        });
}
