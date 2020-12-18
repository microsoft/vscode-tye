import { TyeApplication } from 'src/services/tyeApplicationProvider';
import * as vscode from 'vscode';
import { TyeNode } from "../tyeNode";
import { TyeReplicaNode } from "./tyeReplicaNode";

export class TyeServiceNode implements TyeNode {
    constructor(private readonly application: TyeApplication, private readonly service: TyeService) {
    }

    getChildren(): vscode.ProviderResult<TyeNode[]> {
        return this.service.replicas
            ? Object.values(this.service.replicas).map(replica => new TyeReplicaNode(this.service, replica))
            : undefined;
    }

    getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem = new vscode.TreeItem(this.service.description.name, vscode.TreeItemCollapsibleState.Collapsed);

        treeItem.contextValue = this.service.serviceType;

        treeItem.contextValue += " hasLogs"

        if (this.service.serviceType === 'container') {
            treeItem.iconPath = new vscode.ThemeIcon('package');
        } else {
            treeItem.iconPath = new vscode.ThemeIcon('project');
        }

        return treeItem;
    }
}
