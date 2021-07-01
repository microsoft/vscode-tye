// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from 'path';
import * as vscode from 'vscode';
import TreeNode from '../treeNode';
import { TyeApplication } from '../../services/tyeApplicationProvider';
import { TyeDashboardNode } from './tyeDashboardNode';
import TyeServiceNode from './tyeServiceNode';
import { TyeClientProvider } from '../../services/tyeClient';
import ext from '../../ext';

export class TyeApplicationNode implements TreeNode {
    private readonly id: string;

    constructor(private readonly application: TyeApplication, private readonly tyeClientProvider: TyeClientProvider) {
        this.id = `vscode-tye.views.services.${this.application.id}`;  
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

        const nodes: TreeNode[] = [ new TyeDashboardNode(this.application.dashboard, this.id)];
        
        return nodes.concat(services.map(service => new TyeServiceNode(this.application, service, this.id)));
    }

    getTreeItem(): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(this.application.name, vscode.TreeItemCollapsibleState.Expanded);

        treeItem.contextValue = 'application';

        const resourcesPath = ext.context.asAbsolutePath('resources');

        treeItem.iconPath = {
            light: path.join(resourcesPath, 'brand-tye-darkgray.svg'),
            dark: path.join(resourcesPath, 'brand-tye-white.svg')
        };

        treeItem.id = this.id;

        return treeItem;
    }
}