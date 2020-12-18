import { TyeNode } from "../tyeNode";

import * as vscode from 'vscode';

export class TyeReplicaNode implements TyeNode {
    constructor(private readonly replica: TyeReplica) {
    }

    getChildren(): vscode.ProviderResult<TyeNode[]> {
        return undefined;
    }

    getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return new vscode.TreeItem(this.replica.name);
    }
}