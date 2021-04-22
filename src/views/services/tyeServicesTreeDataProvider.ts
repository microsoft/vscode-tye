// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { TyeApplication, TyeApplicationProvider } from '../../services/tyeApplicationProvider';
import { Subscription } from 'rxjs';
import TreeNode from '../treeNode';
import { TyeApplicationNode } from './tyeApplicationNode';
import { TyeClientProvider } from '../../services/tyeClient';

export class TyeServicesTreeDataProvider extends vscode.Disposable implements vscode.TreeDataProvider<TreeNode> {
    private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<void | TreeNode | null | undefined>();
    private readonly listener: Subscription;
    private cachedApplications: TyeApplication[] = [];

    constructor(tyeApplicationProvider: TyeApplicationProvider, private readonly tyeClientProvider: TyeClientProvider) {
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

    getChildren(element?: TreeNode): vscode.ProviderResult<TreeNode[]> {
        if (element) {
            return element.getChildren?.() ?? [];
        } else {
            const applications = this.cachedApplications.map(application => new TyeApplicationNode(application, this.tyeClientProvider));

            if (applications.length === 1) {
                return applications[0].getChildren();
            } else {
                return applications;
            }
        }
    }

    refresh(): void {
        this.onDidChangeTreeDataEmitter.fire();
    }
}