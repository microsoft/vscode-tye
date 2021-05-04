// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';

export interface SettingsProvider {
    readonly tyePath: (string | undefined);
}

export default class VsCodeSettingsProvider implements SettingsProvider {
    get tyePath(): (string | undefined) {
        return this.getConfigurationValue('tyePath');
    }

    private getConfigurationValue(name: string): (string | undefined) {
        const configuration = vscode.workspace.getConfiguration('tye.paths');

        return configuration.get(name);
    }
}