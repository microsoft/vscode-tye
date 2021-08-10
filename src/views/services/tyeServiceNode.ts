// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { TyeApplication } from '../../services/tyeApplicationProvider';
import TyeNode from '../treeNode';
import TyeReplicaNode, { getReplicaBrowseUrl, isAttachable, isReplicaBrowsable } from './tyeReplicaNode';

function toThemeIconId(service: TyeService): string {
    switch (service.serviceType) {
        case 'container':
            return 'package';

        case 'external':
            return 'link-external';

        case 'ingress':
            return 'globe';

        case 'function':
            return 'github-action';

        case 'executable':
        case 'project':
        default:
            return 'server-process';
    }
}

export default class TyeServiceNode implements TyeNode {
    private readonly id: string;

    constructor(public readonly application: TyeApplication, public readonly service: TyeService, private parentId: string) {
        this.id = `${parentId}.${service.description.name}`;
    }

    getChildren(): TyeNode[] {
        return this.service.replicas
            ? Object.values(this.service.replicas).map(replica => new TyeReplicaNode(this.service, replica, this.id))
            : [];
    }

    getTreeItem(): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(this.service.description.name, vscode.TreeItemCollapsibleState.Collapsed);

        treeItem.contextValue = this.service.serviceType;
        treeItem.contextValue += ' hasLogs service'

        treeItem.id = this.id;

        if (isAttachable(this.service)) {
            // TODO: Disable debugging when no workspace is open.  (Does it matter?  What if the *wrong* workspace is currently open?)
            treeItem.contextValue += ' attachable'
        }
        
        treeItem.iconPath = new vscode.ThemeIcon(toThemeIconId(this.service));

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