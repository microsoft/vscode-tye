// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';

export interface SettingsProvider {
    readonly tyePath: string;
}

export default class VsCodeSettingsProvider implements SettingsProvider {
    get tyePath(): string {
        return this.getConfigurationValue('tyePath') || 'tye';
    }

    private getConfigurationValue(name: string): string | undefined {
        const configuration = vscode.workspace.getConfiguration('tye.paths');

        return configuration.get(name);
    }
}