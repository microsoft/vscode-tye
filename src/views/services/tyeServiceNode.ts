import { TyeNode } from "../tyeNode";

import * as vscode from 'vscode';

export class TyeServiceNode implements TyeNode {
    constructor(private readonly service: TyeService) {
    }

    getChildren(): vscode.ProviderResult<TyeNode[]> {
        return undefined;
    }

    getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return new vscode.TreeItem(this.service.description.name, vscode.TreeItemCollapsibleState.Collapsed);
    }
}