// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserInput } from '../services/userInput';
import { IActionContext } from '@microsoft/vscode-azext-utils';
import TreeNode from '../views/treeNode';
import TyeReplicaNode from '../views/services/tyeReplicaNode';
import TyeServiceNode from '../views/services/tyeServiceNode';

export async function browseService(ui: UserInput, context: IActionContext, node: TreeNode): Promise<void> {
    if (node instanceof TyeReplicaNode || node instanceof TyeServiceNode) {
        const uri = node.browserUrl;

        if (uri) {
            await ui.openExternal(uri);
        }
    }
}

const createBrowseServiceCommand = (ui: UserInput) => (context: IActionContext, replicaNode: TyeReplicaNode): Promise<void> => browseService(ui, context, replicaNode);

export default createBrowseServiceCommand;
