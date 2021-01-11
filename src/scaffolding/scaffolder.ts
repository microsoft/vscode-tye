// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import scaffoldTask, { TaskContentFactory } from './taskScaffolder';
import { ConflictHandler } from './conflicts';

export type FileContentFactory = (path: string) => Promise<string>;

export interface Scaffolder {
    scaffoldTask(label: string, folder: vscode.WorkspaceFolder, contentFactory: TaskContentFactory, onConflict: ConflictHandler): Promise<string | undefined>;
}

export default class LocalScaffolder implements Scaffolder {
    scaffoldTask(label: string, folder: vscode.WorkspaceFolder, contentFactory: TaskContentFactory, onConflict: ConflictHandler): Promise<string | undefined> {
        return scaffoldTask(label, folder, contentFactory, onConflict);
    }
}