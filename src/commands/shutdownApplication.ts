// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { UserInput } from '../services/userInput';
import { IActionContext } from 'vscode-azureextensionui';
import TreeNode from '../views/treeNode';
import { TyeApplicationNode } from '../views/services/tyeApplicationNode';
import { getLocalizationPathForFile } from '../util/localization';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

export async function shutdownApplication(ui: UserInput, context: IActionContext, node: TreeNode): Promise<void> {
    if (node instanceof TyeApplicationNode) {
        const shutdown: vscode.MessageItem = { title: localize('commands.shutdownApplication.shutdown', 'Shutdown') };

        const result = await ui.showWarningMessage(
                localize('commands.shutdownApplication.areYouSurePrompt', 'Shutdown Tye application "{0}"?', node.application.name),
                { modal: true },
                shutdown);

        if(result === shutdown)
        {
            // TODO: Implement me!
            await Promise.resolve();
        }
    }
}

const createShutdownApplicationCommand = (ui: UserInput) => (context: IActionContext, applicationNode: TyeApplicationNode): Promise<void> => shutdownApplication(ui, context, applicationNode);

export default createShutdownApplicationCommand;
