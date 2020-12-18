import * as vscode from 'vscode';
import { TyeNode } from "../tyeNode";
import { TyeApplication } from "src/services/tyeApplicationProvider";
import { TyeDashboardNode } from "./tyeDashboardNode";
import { TyeServiceNode } from "./tyeServiceNode";
import { TyeClientProvider } from "src/services/tyeClient";

export class ApplicationNode implements TyeNode {
    constructor(private readonly application: TyeApplication, private readonly tyeClientProvider: TyeClientProvider) {
    }

    getChildren(): vscode.ProviderResult<TyeNode[]> {
        const func: () => Promise<TyeNode[] | undefined> =
            async () => {
                if (!this.application.dashboard) {
                    return undefined;
                }
                
                const nodes: TyeNode[] = [ new TyeDashboardNode(this.application.dashboard) ];
                
                const tyeClient = this.tyeClientProvider(this.application.dashboard);
                
                if (tyeClient) {
                    const services = await tyeClient.getServices();
                    
                    return nodes.concat((services ?? []).map(service => new TyeServiceNode(service)));
                }
                
                return nodes;
            };

        return func();
    }

    getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return new vscode.TreeItem(this.application.name ?? '<unknown>', vscode.TreeItemCollapsibleState.Expanded);
    }
}