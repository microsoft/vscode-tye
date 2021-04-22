// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import TyeNode from '../treeNode';

export class TyeReplicaNode implements TyeNode {
    constructor(public readonly service: TyeService, public readonly replica: TyeReplica) {
    }

    getTreeItem(): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(this.replica.name);

        treeItem.contextValue = this.service.serviceType;
        treeItem.iconPath = new vscode.ThemeIcon('server-process');

        if (this.service.serviceType === 'project') {
            // TODO: Disable debugging when no workspace is open.  (Does it matter?  What if the *wrong* workspace is currently open?)
            treeItem.contextValue += ' attachable'
        }

        if (this.isBrowsable) {
            treeItem.contextValue += ' browsable';
        }

        return treeItem;
    }

    get isBrowsable(): boolean {
        if (this.replica.environment) {
            return this.replica.environment[`service__${this.service.description.name}__host`.toUpperCase()] !== undefined;
        }

        if (this.service.serviceType === 'ingress') {
            return true;
        }

        return false;
    }

    get BrowserUri() : vscode.Uri | undefined {
        if (!this.isBrowsable){
            return undefined;
        }

        let host = 'localhost';
        let port = this.replica.ports[0];
        let protocol = 'http';
    
        //We want to prefer the environment variable so that it matches as closely as possible to GetServiceUri.
        //Which is what code would get if accessing this service.
        if (this.replica.environment) {
            host = this.replica.environment[`service__${this.service.description.name}__host`.toUpperCase()];
            port = Number.parseInt(this.replica.environment[`service__${this.service.description.name}__port`.toUpperCase()]);
            protocol = this.replica.environment[`service__${this.service.description.name}__protocol`.toUpperCase()] ?? 'http';
        }

        return vscode.Uri.parse(`${protocol}://${host}:${port}`);
    }
}