// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { TyeApplication } from '../../services/tyeApplicationProvider';
import TyeNode from '../treeNode';
import TyeReplicaNode, { getReplicaBrowseUrl, isAttachable, isReplicaBrowsable } from './tyeReplicaNode';

export default class TyeServiceNode implements TyeNode {
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

        treeItem.contextValue += ' hasLogs'

        if (isAttachable(this.service)) {
            // TODO: Disable debugging when no workspace is open.  (Does it matter?  What if the *wrong* workspace is currently open?)
            treeItem.contextValue += ' attachable'
        }
        
        if (this.service.serviceType === 'container') {
            treeItem.iconPath = new vscode.ThemeIcon('package');
        } else {
            treeItem.iconPath = new vscode.ThemeIcon('project');
        }

        if (this.isBrowsable) {
            treeItem.contextValue += ' browsable';
        }

        return treeItem;
    }

    get isBrowsable(): boolean {
        const replicas = Object.values(this.service.replicas);

        if (replicas.length !== 1) {
            return false;
        }

        return isReplicaBrowsable(this.service, replicas[0]);
    }

    get browserUrl() : string | undefined {
        const replicas = Object.values(this.service.replicas);

        if (replicas.length !== 1) {
            return undefined;
        }
 
        return getReplicaBrowseUrl(this.service, replicas[0]);
    }
}