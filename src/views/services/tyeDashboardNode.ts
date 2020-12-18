// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TyeNode } from "../tyeNode";

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { getLocalizationPathForFile } from '../../util/localization';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

export class TyeDashboardNode implements TyeNode {
    constructor(private readonly dashboard: vscode.Uri) {
    }

    getChildren(): vscode.ProviderResult<TyeNode[]> {
        return undefined;
    }

    getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem = new vscode.TreeItem(localize('views.services.tyeDashboardNode.label', 'Dashboard'));

        treeItem.command = {
            arguments: [ this.dashboard ],
            command: 'vscode-tye.commands.launchTyeDashboard',
            title: localize('views.services.tyeDashboardNode.command.title', 'Open Dashboard in Browser')
        };

        treeItem.contextValue = 'information';

        treeItem.iconPath = new vscode.ThemeIcon('book');

        return treeItem;
    }
}