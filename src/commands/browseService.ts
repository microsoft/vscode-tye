import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { TyeReplicaNode } from '../views/services/tyeReplicaNode';

export async function browseService(context: IActionContext, replicaNode: TyeReplicaNode) {
    const uri = replicaNode.BrowserUri;
    
    if (uri) {
        await vscode.env.openExternal(uri);
    }
}

const createBrowseServiceCommand = () => browseService;

export default createBrowseServiceCommand;
