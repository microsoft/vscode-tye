// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { UserInput } from '../services/userInput';
import { IActionContext } from '@microsoft/vscode-azext-utils';
import TreeNode from '../views/treeNode';
import TyeApplicationNode from '../views/services/tyeApplicationNode';
import { getLocalizationPathForFile } from '../util/localization';
import { TyeClientProvider } from '../services/tyeClient';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

export async function shutdownApplication(tyeClientProvider: TyeClientProvider, ui: UserInput, context: IActionContext, node: TreeNode): Promise<void> {
    if (node instanceof TyeApplicationNode) {
        const shutdown: vscode.MessageItem = { title: localize('commands.shutdownApplication.shutdown', 'Shutdown') };

        const result = await ui.showWarningMessage(
                localize('commands.shutdownApplication.areYouSurePrompt', 'Shutdown Tye application "{0}"?', node.application.name),
                { modal: true },
                shutdown);

        if(result === shutdown)
        {
            const tyeClient = tyeClientProvider(node.application.dashboard);

            if (!tyeClient) {
                throw new Error(localize('commands.shutdownApplication.noClient', 'Unable to establish a connection to the application.'));
            }

            await tyeClient.shutDown();
        }
    }
}

const createShutdownApplicationCommand = (tyeClientProvider: TyeClientProvider, ui: UserInput) => (context: IActionContext, applicationNode: TyeApplicationNode): Promise<void> => shutdownApplication(tyeClientProvider, ui, context, applicationNode);

export default createShutdownApplicationCommand;
