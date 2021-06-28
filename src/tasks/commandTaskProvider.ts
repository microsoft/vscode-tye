// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as cp from 'child_process';
import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import CustomExecutionTaskProvider from './customExecutionTaskProvider';
import { Process, ProcessCancellationOptions } from '../util/process';
import { TaskDefinition } from './taskDefinition';
import { getLocalizationPathForFile } from '../util/localization';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

interface CommandTaskSpawnOptions extends cp.SpawnOptions {
    onStarted?: (pid: number) => void;
    onStdOut?: (data: string) => void;
    onStdErr?: (data: string) => void;
    onCancellation?: () => Promise<ProcessCancellationOptions>;
}

export type CommandTaskSpawnCallback = (command: string, options?: CommandTaskSpawnOptions) => Promise<void>;
export type CommandTaskProviderCallback = (name: string, definition: TaskDefinition, callback: CommandTaskSpawnCallback, token?: vscode.CancellationToken) => Promise<void>;

export default class CommandTaskProvider extends CustomExecutionTaskProvider {
    constructor(
        callback: CommandTaskProviderCallback,
        isBackgroundTask?: boolean,
        problemMatchers?: string[]) {
        super(
            (name, definition, writer, token) => {
                return callback(
                    name,
                    definition,
                    async (command, options) => {
                        const spawnOptions = options || {};

                        const process = new Process();

                        try {
                            if (spawnOptions.onStarted) {
                                process.onStarted(spawnOptions.onStarted);
                            }
                        
                            process.onStdErr(
                                data => {
                                    writer.write(data);

                                    spawnOptions.onStdErr?.(data);
                                });

                            process.onStdOut(
                                data => {
                                    writer.write(data);

                                    spawnOptions.onStdOut?.(data);
                                });

                            if (spawnOptions.cwd === undefined) {
                                if (vscode.workspace.workspaceFolders === undefined || vscode.workspace.workspaceFolders.length === 0) {
                                    throw new Error(localize('tasks.commandTaskProvider.noWorkspaceError', 'If no current working directory is set, you must open a workspace before running a Tye task.'));
                                }

                                spawnOptions.cwd = vscode.workspace.workspaceFolders[0].uri.fsPath;
                            }

                            writer.writeLine(localize('tasks.commandTaskProvider.executingMessage', '> Executing command: {0} <', command), 'bold');
                            writer.writeLine('');

                            await process.spawn(command, spawnOptions, token);
                        } finally {
                            process.dispose();
                        }
                    },
                    token);
            },
            isBackgroundTask,
            problemMatchers);
    }
}