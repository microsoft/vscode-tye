// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { TyeApplication, TyeApplicationProvider } from 'src/services/tyeApplicationProvider';
import { Subscription } from 'rxjs';
import { TyeNode } from '../tyeNode';
import { TyeApplicationNode } from './tyeApplicationNode';
import { TyeClientProvider } from 'src/services/tyeClient';

export class TyeServicesTreeDataProvider extends vscode.Disposable implements vscode.TreeDataProvider<TyeNode> {
    private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<void | TyeNode | null | undefined>();
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

    readonly onDidChangeTreeData?: vscode.Event<void | TyeNode | null | undefined> | undefined = this.onDidChangeTreeDataEmitter.event;

    getTreeItem(element: TyeNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element.getTreeItem();
    }

    getChildren(element?: TyeNode): vscode.ProviderResult<TyeNode[]> {
        if (element) {
            return element.getChildren();
        } else {
            return this.cachedApplications.map(application => new TyeApplicationNode(application, this.tyeClientProvider));
        }
    }

    refresh(): void {
        this.onDidChangeTreeDataEmitter.fire();
    }
}