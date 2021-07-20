// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from 'path';
import * as vscode from 'vscode';
import TreeNode from '../treeNode';
import { TyeApplication } from '../../services/tyeApplicationProvider';
import TyeServiceNode from './tyeServiceNode';
import { TyeClientProvider } from '../../services/tyeClient';
import ext from '../../ext';
import TyeOtherServicesNode from './tyeOtherServicesNode';

function isConfigurationServiceNode(node: TyeServiceNode): boolean {
    switch (node.service.serviceSource) {
        case 'extension':
        case 'host':
            return false;

        case 'configuration':
        default:
                return true;
    }
}

export default class TyeApplicationNode implements TreeNode {
    private readonly id: string;

    constructor(public readonly application: TyeApplication, private readonly tyeClientProvider: TyeClientProvider) {
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

        const serviceNodes = services.map(service => new TyeServiceNode(this.application, service, this.id));
        
        const [configurationServiceNodes, otherServiceNodes] =
            serviceNodes
                .reduce<[TyeServiceNode[], TyeServiceNode[]]>(
                    (acc, serviceNode) => {
                        acc[isConfigurationServiceNode(serviceNode) ? 0 : 1].push(serviceNode)

                        return acc;
                    },
                    [[], []]);
        
        return (<TreeNode[]>[])
            .concat(configurationServiceNodes)
            .concat(otherServiceNodes.length > 0 ? [new TyeOtherServicesNode(otherServiceNodes)] : []);
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