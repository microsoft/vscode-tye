import { UserInput } from '../services/userInput';
import { IActionContext } from 'vscode-azureextensionui';
import { TyeReplicaNode } from '../views/services/tyeReplicaNode';

export async function browseService(ui: UserInput, context: IActionContext, replicaNode: TyeReplicaNode) {
    const uri = replicaNode.BrowserUri;
    
    if (uri) {
        await ui.openExternal(uri.toString());
    }
}

const createBrowseServiceCommand = (ui: UserInput) => (context: IActionContext, replicaNode: TyeReplicaNode) => browseService(ui, context, replicaNode);

export default createBrowseServiceCommand;
