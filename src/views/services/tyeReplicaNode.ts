import { TyeNode } from "../tyeNode";

import * as vscode from 'vscode';

export class TyeReplicaNode implements TyeNode {
    constructor(private readonly service: TyeService, private readonly replica: TyeReplica) {
    }

    getChildren(): vscode.ProviderResult<TyeNode[]> {
        return undefined;
    }

    getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem = new vscode.TreeItem(this.replica.name);

        treeItem.contextValue = this.service.serviceType;

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
}