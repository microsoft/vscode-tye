// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import TyeNode from '../treeNode';

export function isReplicaBrowsable(service: TyeService, replica: TyeReplica): boolean {
    if (replica.environment) {
        return replica.environment[`service__${service.description.name}__host`.toUpperCase()] !== undefined;
    }

    if (service.serviceType === 'ingress') {
        return true;
    }

    return false;
}

export function getReplicaBrowseUrl(service: TyeService, replica: TyeReplica): string | undefined {
    if (!isReplicaBrowsable(service, replica)) {
        return undefined;
    }

    let host = 'localhost';
    let port = replica.ports[0];
    let protocol = 'http';

    //We want to prefer the environment variable so that it matches as closely as possible to GetServiceUri.
    //Which is what code would get if accessing this service.
    if (replica.environment) {
        host = replica.environment[`service__${service.description.name}__host`.toUpperCase()];
        port = Number.parseInt(replica.environment[`service__${service.description.name}__port`.toUpperCase()]);
        protocol = replica.environment[`service__${service.description.name}__protocol`.toUpperCase()] ?? 'http';
    }

    return `${protocol}://${host}:${port}`;
}

export function isAttachable(service: TyeService): boolean {
    return (service.serviceType === 'project') || (service.serviceType === 'function');
}

export default class TyeReplicaNode implements TyeNode {
    private readonly id: string;

    constructor(public readonly service: TyeService, public readonly replica: TyeReplica, parentId: string) {
        this.id = `${parentId}.${replica.name}`;
    }

    getTreeItem(): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(this.replica.name);

        treeItem.contextValue = `${this.service.serviceType} replica`;
        treeItem.iconPath = new vscode.ThemeIcon('server-process');
        treeItem.id = this.id;

        if (isAttachable(this.service)) {
            // TODO: Disable debugging when no workspace is open.  (Does it matter?  What if the *wrong* workspace is currently open?)
            treeItem.contextValue += ' attachable'
        }

        if (this.isBrowsable) {
            treeItem.contextValue += ' browsable';
        }

        return treeItem;
    }

    get isBrowsable(): boolean {
        return isReplicaBrowsable(this.service, this.replica);
    }

    get browserUrl() : string | undefined {
        return getReplicaBrowseUrl(this.service, this.replica);
    }
}