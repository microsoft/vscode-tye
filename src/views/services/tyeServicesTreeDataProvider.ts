// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { TyeApplication, TyeApplicationProvider } from '../../services/tyeApplicationProvider';
import { Subscription } from 'rxjs';
import TreeNode from '../treeNode';
import { TyeApplicationNode } from './tyeApplicationNode';
import { TyeClientProvider } from '../../services/tyeClient';
import { TyeInstallationManager } from '../../services/tyeInstallationManager';

export class TyeServicesTreeDataProvider extends vscode.Disposable implements vscode.TreeDataProvider<TreeNode> {
    private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<void | TreeNode | null | undefined>();
    private readonly listener: Subscription;
    private cachedApplications: TyeApplication[] = [];

    constructor(
        tyeApplicationProvider: TyeApplicationProvider,
        private readonly tyeClientProvider: TyeClientProvider,
        private readonly tyeInstallationManager: TyeInstallationManager) {
        super(
            () => {
                this.listener.unsubscribe();
            });

            this.listener = tyeApplicationProvider.applications.subscribe(
                applications => {
                    this.cachedApplications = applications;
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
            const applications = this.cachedApplications.map(application => new TyeApplicationNode(application, this.tyeClientProvider));

            if (applications.length === 1) {
                children = await applications[0].getChildren() ?? [];
            } else {
                children = applications;
            }
        }

        if (children.length === 0) {
            const isInstalled = await this.tyeInstallationManager.isInstalled();

            await vscode.commands.executeCommand('setContext', 'vscode-tye.views.services.state', isInstalled ? 'notRunning' : 'notInstalled');
        }

        return children;
    }

    refresh(): void {
        this.onDidChangeTreeDataEmitter.fire();
    }
}