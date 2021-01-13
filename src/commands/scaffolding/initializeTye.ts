// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { IActionContext } from "vscode-azureextensionui";
import { getLocalizationPathForFile } from '../../util/localization';
import { TyeCliClient } from "../../services/tyeCliClient";

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

export async function initializeTye(context: IActionContext, tyeCliClient: TyeCliClient): Promise<void> {
    const folders = vscode.workspace.workspaceFolders;

    if (!folders || folders.length === 0) {
        context.errorHandling.suppressReportIssue = true;

        throw new Error(localize('commands.scaffolding.initializeTye.noFolder', 'No workspace or folder has been opened.'));
    }

    // TODO: Support multiple folders.
    const folder = folders[0];

    await tyeCliClient.init({ path: folder.uri.fsPath });
}

const createInitializeTyeCommand = (tyeCliClient: TyeCliClient) => (context: IActionContext): Promise<void> => initializeTye(context, tyeCliClient);

export default createInitializeTyeCommand;
