// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { getLocalizationPathForFile } from '../../util/localization';
import TyeNode from '../treeNode';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

export class TyeDashboardNode implements TyeNode {
    constructor(private readonly dashboard: vscode.Uri) {
    }

    getTreeItem(): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(localize('views.services.tyeDashboardNode.label', 'Dashboard'));

        treeItem.command = {
            arguments: [ this.dashboard ],
            command: 'vscode-tye.commands.launchTyeDashboard',
            title: localize('views.services.tyeDashboardNode.command.title', 'Open Dashboard in Browser')
        };

        treeItem.contextValue = 'information';

        treeItem.iconPath = new vscode.ThemeIcon('dashboard');

        return treeItem;
    }
}