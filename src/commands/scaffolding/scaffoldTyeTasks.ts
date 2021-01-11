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

export async function scaffoldTyeTasks(context: IActionContext, scaffolder: Scaffolder, ui: UserInput): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];

    if (!folder) {
        context.errorHandling.suppressReportIssue = true;

        throw new Error(localize('commands.scaffolding.scaffoldTyeTasks.noFolderOrWorkspace', 'Open a folder or workspace.'));
    }

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
        folder,
        label => {
            const tyeRunTask: TyeRunTaskDefinition = {
                applicationName: 'tyeAppChangeThis',
                label,
                type: 'tye-run'
            };

            return tyeRunTask;
        },
        onTaskConflict);
}

const createScaffoldTyeTasksCommand = (scaffolder: Scaffolder, ui: UserInput) => (context: IActionContext): Promise<void> => scaffoldTyeTasks(context, scaffolder, ui);

export default createScaffoldTyeTasksCommand;
