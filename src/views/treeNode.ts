// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';

export default interface TreeNode {
    getChildren?: () => TreeNode[] | Promise<TreeNode[]>;   
    getTreeItem(): vscode.TreeItem | Promise<vscode.TreeItem>;
}
