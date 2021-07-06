// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { TyeApplication, TyeApplicationProvider } from '../../services/tyeApplicationProvider';
import { Subscription } from 'rxjs';
import TreeNode from '../treeNode';
import TyeApplicationNode from './tyeApplicationNode';
import { TyeClientProvider } from '../../services/tyeClient';
import { TyeInstallationManager } from '../../services/tyeInstallationManager';
import { UserInput } from '../../services/userInput';

export class TyeServicesTreeDataProvider extends vscode.Disposable implements vscode.TreeDataProvider<TreeNode> {
    private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<void | TreeNode | null | undefined>();
    private readonly listener: Subscription;
    private cachedApplications: TyeApplication[] = [];

    constructor(
        tyeApplicationProvider: TyeApplicationProvider,
        private readonly tyeClientProvider: TyeClientProvider,
        private readonly tyeInstallationManager: TyeInstallationManager,
        private readonly ui: UserInput) {
        super(
            () => {
                this.listener.unsubscribe();
            });

            this.listener = tyeApplicationProvider.applications.subscribe(
                applications => {
                    this.cachedApplications =
                        applications
                            .slice()
                            .sort((a, b) => a.name.localeCompare(b.name));
                    
                    this.refresh();
                });
            }

    readonly onDidChangeTreeData?: vscode.Event<void | TreeNode | null | undefined> | undefined = this.onDidChangeTreeDataEmitter.event;

    getTreeItem(element: TreeNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element.getTreeItem();
    }

    async getChildren(element?: TreeNode): Promise<TreeNode[]> {
        let children: TreeNode[] = [];

        if (element) {
            children = await element.getChildren?.() ?? [];
        } else {
            children = this.cachedApplications.map(application => new TyeApplicationNode(application, this.tyeClientProvider));
        }

        if (children.length === 0) {
            const isInstalled = await this.tyeInstallationManager.isInstalled();

            await this.ui.executeCommand('setContext', 'vscode-tye.views.services.state', isInstalled ? 'notRunning' : 'notInstalled');
        }

        return children;
    }

    refresh(): void {
        this.onDidChangeTreeDataEmitter.fire();
    }
}