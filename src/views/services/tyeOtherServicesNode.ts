import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import TreeNode from '../treeNode';
import { getLocalizationPathForFile } from '../../util/localization';
import TyeServiceNode from './tyeServiceNode';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

export default class TyeOtherServicesNode implements TreeNode {
    constructor(private readonly services: TyeServiceNode[]) {
    }

    getChildren(): TreeNode[] {
        return this.services;
    }
    
    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(localize('views.services.tyeOtherServicesNode.label', 'Other Services'), vscode.TreeItemCollapsibleState.Collapsed);

        return item;
    }
}
