// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { TyeClient } from '../services/tyeClient';

export class TyeServicesProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    constructor(private workspaceRoot: readonly vscode.WorkspaceFolder[] | undefined,
                private readonly tyeClient: TyeClient) {}

  getTreeItem(element: ServiceNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ServiceNode): Promise<vscode.TreeItem[]> {
    if (!this.workspaceRoot) {
      //In this case you don't have any code open, so we don't really want to
      //list the nodes for attaching, we will rely on the welcome screen to guide
      //people.
      return Promise.resolve([]);
    }

    const services = await this.tyeClient.getServices();

    if(services) {
      if(element) {
        const clickedService = services.find(a=>a.description.name === element.label);

        if(clickedService?.replicas) {
          return Object.keys(clickedService.replicas).map(replicaName => 
            {
                return new ReplicaNode(clickedService, clickedService.replicas[replicaName]);
            });
        }
      } else {
        const nodes:TyeNode[] = services.map(service => new ServiceNode(service));
        nodes.unshift(new DashboardNode());
        return nodes;
      }
      return [];
    } else {
      //vscode.window.showInformationMessage('Unable to reach Tye service on http://localhost:8000/api/v1/services');
    }
    return [];
  }

  private _onDidChangeTreeData: vscode.EventEmitter<ServiceNode | undefined> = new vscode.EventEmitter<ServiceNode | undefined>();
  readonly onDidChangeTreeData: vscode.Event<ServiceNode | undefined> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}


class TyeNode extends vscode.TreeItem {
  
  command? : vscode.Command;
  
  // get tooltip(): string {
  //   return `${this.label}`;
  // }
  
  get description(): string {
    return '';
  }
}

class DashboardNode extends TyeNode {
  constructor() {
    super('Dashboard', vscode.TreeItemCollapsibleState.None);
  }

  get command() { 
    return {command: 'vscode-tye.commands.launchTyeDashboard', title: '', arguments: []};
  }

  iconPath = new vscode.ThemeIcon('book');

  contextValue = 'information';
}

export class ServiceNode extends TyeNode {
  service: TyeService;

  constructor(service: TyeService) {
    super(service.description.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.service = service;
  }

  get iconPath(): vscode.ThemeIcon {
    if(this.service.serviceType === 'container') {
      return new vscode.ThemeIcon('package');
    }
  
    return new vscode.ThemeIcon('project');
  }

  contextValue = 'browsable';
}

export class ReplicaNode extends TyeNode {

  replica: TyeReplica;
  service: TyeService;

  constructor(service: TyeService, replica: TyeReplica) {
    super(`${replica.name}`, vscode.TreeItemCollapsibleState.None);
    this.replica = replica;
    this.service = service;
    this.contextValue = service.serviceType;
  }
}