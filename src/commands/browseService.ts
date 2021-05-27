import { UserInput } from '../services/userInput';
import { IActionContext } from 'vscode-azureextensionui';
import TreeNode from '../views/treeNode';
import TyeReplicaNode from '../views/services/tyeReplicaNode';
import TyeServiceNode from '../views/services/tyeServiceNode';

export async function browseService(ui: UserInput, context: IActionContext, node: TreeNode): Promise<void> {
    let uri;

    if (node instanceof TyeReplicaNode) {
        uri = node.browserUrl;
    } else if (node instanceof TyeServiceNode) {
        uri = node.browserUrl;
    }

    if (uri) {
        await ui.openExternal(uri);
    }
}

const createBrowseServiceCommand = (ui: UserInput) => (context: IActionContext, replicaNode: TyeReplicaNode): Promise<void> => browseService(ui, context, replicaNode);

export default createBrowseServiceCommand;
