// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Subscription } from 'rxjs';
import * as vscode from 'vscode';
import { TyeApplication, TyeApplicationProvider } from 'src/services/tyeApplicationProvider';
import { TyeClientProvider } from '../services/tyeClient';

export class TyeServicesProvider extends vscode.Disposable implements vscode.TreeDataProvider<vscode.TreeItem> {
    private readonly listener: Subscription;
    private cachedApplications: TyeApplication[] = [];

    constructor(private workspaceRoot: readonly vscode.WorkspaceFolder[] | undefined,
                private readonly tyeApplicationProvider: TyeApplicationProvider,
                private readonly tyeClientProvider: TyeClientProvider) {
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

  getTreeItem(element: ServiceNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ServiceNode): Promise<vscode.TreeItem[]> {
    // TODO: Support multiple services; currently, just pick the first one...
    const application = this.cachedApplications[0];
    const tyeClient = this.tyeClientProvider(application?.dashboard);

    if (tyeClient) {
      const services = await tyeClient.getServices();

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
            const nodes:TyeNode[] = services.map(service => new ServiceNode(service, application));
            
            if (application.dashboard) {
                nodes.unshift(new DashboardNode(application.dashboard));
            }
            
            return nodes;
          }
          
          return [];
        } else {
          //vscode.window.showInformationMessage('Unable to reach Tye service on http://localhost:8000/api/v1/services');
        }
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
  constructor(private readonly dashboard: vscode.Uri) {
    super('Dashboard', vscode.TreeItemCollapsibleState.None);
  }

  command = {command: 'vscode-tye.commands.launchTyeDashboard', title: '', arguments: [this.dashboard]};

  iconPath = new vscode.ThemeIcon('book');

  contextValue = 'information';
}

export class ServiceNode extends TyeNode {
  service: TyeService;

  constructor(service: TyeService, public readonly application: TyeApplication) {
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
      // TODO: Disable debugging when no workspace is open.  (Does it matter?  What if the *wrong* workspace is currently open?)
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