import * as vscode from 'vscode';

export interface TyeNode {
    getChildren(): vscode.ProviderResult<TyeNode[]>;
    getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem>;
}