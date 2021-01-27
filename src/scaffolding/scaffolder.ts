// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import scaffoldTask, { TaskContentFactory } from './taskScaffolder';
import { ConflictHandler } from './conflicts';
import scaffoldConfiguration, { ConfigurationContentFactory } from './configurationScaffolder';

export type FileContentFactory = (path: string) => Promise<string>;

export interface Scaffolder {
    scaffoldConfiguration(name: string, folder: vscode.WorkspaceFolder, contentFactory: ConfigurationContentFactory, onConflict: ConflictHandler): Promise<string | undefined>;
    scaffoldTask(label: string, folder: vscode.WorkspaceFolder, contentFactory: TaskContentFactory, onConflict: ConflictHandler): Promise<string | undefined>;
}

export default class LocalScaffolder implements Scaffolder {
    scaffoldConfiguration(name: string, folder: vscode.WorkspaceFolder, contentFactory: ConfigurationContentFactory, onConflict: ConflictHandler): Promise<string | undefined> {
        return scaffoldConfiguration(name, folder, contentFactory, onConflict);
    }

    scaffoldTask(label: string, folder: vscode.WorkspaceFolder, contentFactory: TaskContentFactory, onConflict: ConflictHandler): Promise<string | undefined> {
        return scaffoldTask(label, folder, contentFactory, onConflict);
    }
}