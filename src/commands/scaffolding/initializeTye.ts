// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { IActionContext } from '@microsoft/vscode-azext-utils';
import { getLocalizationPathForFile } from '../../util/localization';
import { TyeCliClient } from '../../services/tyeCliClient';
import { TyeApplicationConfigurationProvider } from '../../services/tyeApplicationConfiguration';
import { TyeInstallationManager } from '../../services/tyeInstallationManager';
import { UserInput } from '../../services/userInput';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

function folderProvider(): readonly vscode.WorkspaceFolder[] | undefined {
    return vscode.workspace.workspaceFolders;
}

async function openProvider(uri: vscode.Uri): Promise<void> {
    const document = await vscode.workspace.openTextDocument(uri);

    await vscode.window.showTextDocument(document);
}

async function promptToOverwriteTyeYamlIfNecessary(folder: vscode.WorkspaceFolder, ui: UserInput) : Promise<boolean> {

    const existingTyeYamlFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, 'tye.{yml,yaml}'));

    if (existingTyeYamlFiles.length > 0)
    {
        const overwrite: vscode.MessageItem = { title: localize('commands.scaffolding.initTye.overwrite', 'Overwrite') };
        const result = await ui.showWarningMessage(
                localize('commands.scaffolding.initTye.tyeYamlExists', 'File \'{0}\' already exists.\n Do you want to overwrite it?', existingTyeYamlFiles[0].fsPath),
                { modal: true },
                overwrite);

        if(result === overwrite)
        {
            // Since the function matches .yml and .yaml files, it could lead to a situation where tye.yml is already present,
            // and tye-init creates tye.yaml causing the user to have both tye.yaml and tye.yml files.
            await vscode.workspace.fs.delete(existingTyeYamlFiles[0]);
            return true;
        }

        return false;
    }

    return true;
}

export async function initializeTye(
    context: IActionContext,
    folderProvider: () => (readonly vscode.WorkspaceFolder[] | undefined),
    openProvider: (uri: vscode.Uri) => Promise<void>,
    ui: UserInput,
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

    await tyeInstallationManager.ensureInstalled(context.errorHandling);

    const shouldInvokeTyeInit = await promptToOverwriteTyeYamlIfNecessary(folder, ui);
    if (shouldInvokeTyeInit)
    {
        await tyeCliClient.init({ force: true, path: folder.uri.fsPath });
    }

    const configurations = await tyeApplicationConfigurationProvider.getConfigurations();
    const configuration = configurations[0];

    if (configuration) {
        await openProvider(configuration.file);
    }
}

const createInitializeTyeCommand = (tyeApplicationConfigurationProvider: TyeApplicationConfigurationProvider, tyeCliClient: TyeCliClient, tyeInstallationManager: TyeInstallationManager, ui: UserInput) => (context: IActionContext): Promise<void> => initializeTye(context, folderProvider, openProvider, ui, tyeApplicationConfigurationProvider, tyeCliClient, tyeInstallationManager);

export default createInitializeTyeCommand;