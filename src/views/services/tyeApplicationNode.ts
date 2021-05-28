// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import TreeNode from '../treeNode';
import { TyeApplication } from '../../services/tyeApplicationProvider';
import { TyeDashboardNode } from './tyeDashboardNode';
import TyeServiceNode from './tyeServiceNode';
import { TyeClientProvider } from '../../services/tyeClient';

export class TyeApplicationNode implements TreeNode {
    constructor(private readonly application: TyeApplication, private readonly tyeClientProvider: TyeClientProvider) {
    }

    async getChildren(): Promise<TreeNode[]> {
        if (!this.application.dashboard) {
            return [];
        }
        
        const tyeClient = this.tyeClientProvider(this.application.dashboard);

        if (!tyeClient) {
            return [];
        }

        const services = await tyeClient.getServices();

        if (!services) {
            return [];
        }

        const nodes: TreeNode[] = [ new TyeDashboardNode(this.application.dashboard)];
        
        return nodes.concat(services.map(service => new TyeServiceNode(this.application, service)));
    }

    getTreeItem(): vscode.TreeItem {
        return new vscode.TreeItem(this.application.name ?? '<unknown>', vscode.TreeItemCollapsibleState.Expanded);
    }
}