import { TyeNode } from "../tyeNode";

import * as vscode from 'vscode';
import { TyeApplication } from "src/services/tyeApplicationProvider";
import { TyeDashboardNode } from "./tyeDashboardNode";

export class ApplicationNode implements TyeNode {
    constructor(private readonly application: TyeApplication) {
    }

    getChildren(): vscode.ProviderResult<TyeNode[]> {
        return this.application.dashboard
            ? [ new TyeDashboardNode(this.application.dashboard) ]
            : undefined;
    }

    getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return new vscode.TreeItem(this.application.name ?? '<unknown>', vscode.TreeItemCollapsibleState.Expanded);
    }
}