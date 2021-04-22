// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { TyeApplication } from '../../services/tyeApplicationProvider';
import TyeNode from '../treeNode';
import { TyeReplicaNode } from "./tyeReplicaNode";

export class TyeServiceNode implements TyeNode {
    constructor(public readonly application: TyeApplication, public readonly service: TyeService) {
    }

    getChildren(): TyeNode[] {
        return this.service.replicas
            ? Object.values(this.service.replicas).map(replica => new TyeReplicaNode(this.service, replica))
            : [];
    }

    getTreeItem(): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(this.service.description.name, vscode.TreeItemCollapsibleState.Collapsed);

        treeItem.contextValue = this.service.serviceType;

        treeItem.contextValue += " hasLogs"

        if (this.service.serviceType === 'container') {
            treeItem.iconPath = new vscode.ThemeIcon('package');
        } else {
            treeItem.iconPath = new vscode.ThemeIcon('project');
        }

        return treeItem;
    }
}