// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { IActionContext } from 'vscode-azureextensionui';
import { getLocalizationPathForFile } from '../../util/localization';
import { TyeCliClient } from '../../services/tyeCliClient';
import { TyeApplicationConfigurationProvider } from '../../services/tyeApplicationConfiguration';
import { TyeInstallationManager } from 'src/services/tyeInstallationManager';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

function folderProvider(): readonly vscode.WorkspaceFolder[] | undefined {
    return vscode.workspace.workspaceFolders;
}

async function openProvider(uri: vscode.Uri): Promise<void> {
    const document = await vscode.workspace.openTextDocument(uri);

    await vscode.window.showTextDocument(document);
}

export async function initializeTye(
    context: IActionContext,
    folderProvider: () => (readonly vscode.WorkspaceFolder[] | undefined),
    openProvider: (uri: vscode.Uri) => Promise<void>,
    tyeApplicationConfigurationProvider: TyeApplicationConfigurationProvider,
    tyeCliClient: TyeCliClient,
    tyeInstallationManager: TyeInstallationManager): Promise<void> {
    const folders = folderProvider();

    if (!folders || folders.length === 0) {
        context.errorHandling.suppressReportIssue = true;

        throw new Error(localize('commands.scaffolding.initializeTye.noFolder', 'No workspace or folder has been opened.'));
    }

    // TODO: Support multiple folders.
    const folder = folders[0];

    await tyeInstallationManager.ensureInstalledVersion('>=0.9', context.errorHandling);

    // TODO: Add conflict resolution.
    await tyeCliClient.init({ force: true, path: folder.uri.fsPath });

    const configurations = await tyeApplicationConfigurationProvider.getConfigurations();
    const configuration = configurations[0];

    if (configuration) {
        await openProvider(configuration.file);
    }
}

const createInitializeTyeCommand = (tyeApplicationConfigurationProvider: TyeApplicationConfigurationProvider, tyeCliClient: TyeCliClient, tyeInstallationManager: TyeInstallationManager) => (context: IActionContext): Promise<void> => initializeTye(context, folderProvider, openProvider, tyeApplicationConfigurationProvider, tyeCliClient, tyeInstallationManager);

export default createInitializeTyeCommand;
