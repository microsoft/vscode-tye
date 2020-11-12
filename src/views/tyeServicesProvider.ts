// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TaskMonitor } from 'src/tasks/taskMonitor';
import * as vscode from 'vscode';
import { TyeClient } from '../services/tyeClient';

export class TyeServicesProvider extends vscode.Disposable implements vscode.TreeDataProvider<vscode.TreeItem> {
    private readonly listener: vscode.Disposable;

    constructor(private workspaceRoot: readonly vscode.WorkspaceFolder[] | undefined,
                private readonly taskMonitor: TaskMonitor,
                private readonly tyeClient: TyeClient) {
        super(
            () => {
                this.listener.dispose();
            });

        this.listener = taskMonitor.tasksChanged(
            () => {
                this.refresh();
            });
    }

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


abstract class TyeNode extends vscode.TreeItem {
  constructor(label: string, collapsibleState?: vscode.TreeItemCollapsibleState) {
    super(label, collapsibleState);
  }
}

class DashboardNode extends TyeNode {
  constructor() {
    super('Dashboard', vscode.TreeItemCollapsibleState.None);
  }

  command = {command: 'vscode-tye.commands.launchTyeDashboard', title: '', arguments: []};

  iconPath = new vscode.ThemeIcon('book');

  contextValue = 'information';
}

export class ServiceNode extends TyeNode {
  service: TyeService;

  constructor(service: TyeService) {
    super(service.description.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.service = service;
    this.contextValue = service.serviceType;
    this.contextValue += " hasLogs"

    if(this.service.serviceType === 'container') {
      this.iconPath = new vscode.ThemeIcon('package');
    } else {
      this.iconPath = new vscode.ThemeIcon('project');
    }
  }
}

export class ReplicaNode extends TyeNode {

  replica: TyeReplica;
  service: TyeService;

  constructor(service: TyeService, replica: TyeReplica) {
    super(`${replica.name}`, vscode.TreeItemCollapsibleState.None);
    this.replica = replica;
    this.service = service;
    this.contextValue = service.serviceType;
    if(this.service.serviceType === 'project') {
      this.contextValue += ' attachable'
    }
    if(this.isBrowsable) {
      this.contextValue += ' browsable';
    }
  }

  get isBrowsable(): boolean {
    if(this.replica.environment) {
      return this.replica.environment[`service__${this.service.description.name}__host`.toUpperCase()] !== undefined;
    }

    if(this.service.serviceType === 'ingress') {
      return true;
    }

    return false;
  }

  get BrowserUri() : vscode.Uri | undefined {

    if(!this.isBrowsable){
      return undefined;
    }

    let host = 'localhost';
    let port = this.replica.ports[0];
    let protocol = 'http';

    //We want to prefer the environment variable so that it matches as closely as possible to GetServiceUri.
    //Which is what code would get if accessing this service.
    if(this.replica.environment) {
      host = this.replica.environment[`service__${this.service.description.name}__host`.toUpperCase()];
      port = Number.parseInt(this.replica.environment[`service__${this.service.description.name}__port`.toUpperCase()]);
      protocol = this.replica.environment[`service__${this.service.description.name}__protocol`.toUpperCase()] ?? 'http';
    }

    return vscode.Uri.parse(`${protocol}://${host}:${port}`);
  }
}