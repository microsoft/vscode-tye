import * as vscode from 'vscode';
import { TyeNode } from "../tyeNode";
import { TyeReplicaNode } from "./tyeReplicaNode";

export class TyeServiceNode implements TyeNode {
    constructor(private readonly service: TyeService) {
    }

    getChildren(): vscode.ProviderResult<TyeNode[]> {
        return this.service.replicas
            ? Object.values(this.service.replicas).map(replica => new TyeReplicaNode(replica))
            : undefined;
    }

    getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return new vscode.TreeItem(this.service.description.name, vscode.TreeItemCollapsibleState.Collapsed);
    }
}
