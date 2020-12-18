import { TyeNode } from "../tyeNode";

import * as vscode from 'vscode';
import { TyeApplication } from "src/services/tyeApplicationProvider";

export class ApplicationNode implements TyeNode {
    constructor(private readonly application: TyeApplication) {
    }

    getChildren(): vscode.ProviderResult<TyeNode[]> {
        return undefined;
    }

    getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return new vscode.TreeItem(this.application.name ?? '<unknown>', vscode.TreeItemCollapsibleState.Expanded);
    }
}