// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { IActionContext } from "vscode-azureextensionui";
import { getLocalizationPathForFile } from '../../util/localization';
import { TyeCliClient } from "../../services/tyeCliClient";

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

export async function initializeTye(context: IActionContext, folderProvider: () => (readonly vscode.WorkspaceFolder[] | undefined), tyeCliClient: TyeCliClient): Promise<void> {
    const folders = folderProvider();

    if (!folders || folders.length === 0) {
        context.errorHandling.suppressReportIssue = true;

        throw new Error(localize('commands.scaffolding.initializeTye.noFolder', 'No workspace or folder has been opened.'));
    }

    // TODO: Support multiple folders.
    const folder = folders[0];

    // TODO: Add conflict resolution.
    await tyeCliClient.init({ force: true, path: folder.uri.fsPath });
}

const createInitializeTyeCommand = (tyeCliClient: TyeCliClient) => (context: IActionContext): Promise<void> => initializeTye(context, () => vscode.workspace.workspaceFolders, tyeCliClient);

export default createInitializeTyeCommand;
