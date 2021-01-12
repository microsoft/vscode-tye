// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { TyeRunTaskDefinition } from "../../tasks/tyeRunTaskProvider";
import { UserInput } from '../../services/userInput';
import { IActionContext } from 'vscode-azureextensionui';
import { ConflictHandler, ConflictUniquenessPredicate } from '../../scaffolding/conflicts';
import { names, range } from '../../util/generators';
import { getLocalizationPathForFile } from '../../util/localization';
import { Scaffolder } from 'src/scaffolding/scaffolder';
import { TyeApplicationConfigurationProvider } from 'src/services/tyeApplicationConfiguration';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

async function createUniqueName(prefix: string, isUnique: ConflictUniquenessPredicate): Promise<string> {
    const nameGenerator = names(prefix, range(1));
    let name = nameGenerator.next();

    while (!name.done && !await isUnique(name.value)) {
        name = nameGenerator.next();
    }

    if (name.done) {
        throw new Error(localize('commands.scaffoldDaprTasks.uniqueNameError', 'Unable to generate a unique name.'));
    }

    return name.value;
}

export async function scaffoldTyeTasks(context: IActionContext, configurationProvider: TyeApplicationConfigurationProvider, scaffolder: Scaffolder, ui: UserInput): Promise<void> {
    const configurations = await configurationProvider.getConfigurations();

    if (configurations.length === 0) {
        context.errorHandling.suppressReportIssue = true;

        throw new Error(localize('commands.scaffolding.scaffoldTyeTasks.noTyeYaml', 'No Tye YAML file exists in the open workspace, or no workspace or folder has been opened.'));
    }

    // TODO: Support multiple configuration files.
    if (configurations.length > 1) {
        context.errorHandling.suppressReportIssue = true;

        throw new Error(localize('commands.scaffolding.scaffoldTyeTasks.tooManyTyeYamls', 'Scaffolding supports only a single Tye YAML file per workspace.'));
    }

    const workspaceConfiguration = configurations[0];
    const configuration = await workspaceConfiguration.getConfiguration();

    const onTaskConflict: ConflictHandler =
        async (label, isUnique) => {
            const overwrite: vscode.MessageItem = { title: localize('commands.scaffolding.scaffoldTyeTasks.overwriteTask', 'Overwrite') };
            const newTask: vscode.MessageItem = { title: localize('commands.scaffolding.scaffoldTyeTasks.createTask', 'Create task') };

            const result = await ui.showWarningMessage(
                localize('commands.scaffolding.scaffoldTyeTasks.taskExists', 'The task \'{0}\' already exists. Do you want to overwrite it or create a new task?', label),
                { modal: true },
                overwrite, newTask);

            if (result === overwrite) {
                return { 'type': 'overwrite' };
            } else {
                label = await createUniqueName(localize('commands.scaffolding.scaffoldTyeTasks.taskPrefix', '{0}-', label), isUnique);

                return { 'type': 'rename', name: label };
            }
        };

    await scaffolder.scaffoldTask(
        'tye-run',
        workspaceConfiguration.folder,
        label => {
            const tyeRunTask: TyeRunTaskDefinition = {
                applicationName: configuration.name,
                label,
                type: 'tye-run'
            };

            return tyeRunTask;
        },
        onTaskConflict);
}

const createScaffoldTyeTasksCommand = (configurationProvider: TyeApplicationConfigurationProvider, scaffolder: Scaffolder, ui: UserInput) => (context: IActionContext): Promise<void> => scaffoldTyeTasks(context, configurationProvider, scaffolder, ui);

export default createScaffoldTyeTasksCommand;
