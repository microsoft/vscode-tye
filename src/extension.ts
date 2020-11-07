// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import AxiosHttpClient from './services/httpClient';
import { TyeServicesProvider, ReplicaNode, ServiceNode } from './views/tyeServicesProvider';
import { HttpTyeClient } from './services/tyeClient';
import { TyeLogsContentProvider } from './views/tyeLogsContentProvider';
import TyeRunCommandTaskProvider from './tasks/tyeRunTaskProvider';
import { DaprTaskMonitor } from './tasks/taskMonitor';

export function activate(context: vscode.ExtensionContext): void {

	context.subscriptions.push(vscode.commands.registerCommand('vscode-tye.commands.debugTyeService', async (pid: string) => {
			const config = {type:'coreclr', name:`Attach to Tye PID: ${pid}`,request:'attach', processId:`${pid}`};
			await vscode.debug.startDebugging(undefined, config);
	}));

	const httpClient = new AxiosHttpClient();
	const taskMonitor = new DaprTaskMonitor();
	const tyeClient = new HttpTyeClient(httpClient);

	const logsContentProvider = new TyeLogsContentProvider(httpClient);
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('tye', logsContentProvider, ));

	const treeProvider = new TyeServicesProvider(vscode.workspace.workspaceFolders, taskMonitor, tyeClient);
	context.subscriptions.push(vscode.window.registerTreeDataProvider(
		'vscode-tye.views.services',
		treeProvider
	));

	context.subscriptions.push(vscode.commands.registerCommand('vscode-tye.commands.refreshEntry', () =>
		treeProvider.refresh()
	));

	context.subscriptions.push(vscode.commands.registerCommand('vscode-tye.commands.browseService', async (serviceNode: ReplicaNode) => {
		const uri = serviceNode.BrowserUri;
		if(uri) {
			await vscode.env.openExternal(uri);
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('vscode-tye.commands.launchTyeDashboard', () =>
		vscode.env.openExternal(vscode.Uri.parse('http://localhost:8000'))
	));

	context.subscriptions.push(vscode.commands.registerCommand('vscode-tye.commands.attachService', async (node: ReplicaNode) => {
		const replica: TyeReplica = node.replica;
		const config = {type:'coreclr', name:`Attach to Tye PID: ${replica.pid}`,request:'attach', processId:`${replica.pid}`};
		await vscode.debug.startDebugging(undefined, config);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('vscode-tye.commands.showLogs', async (node: ServiceNode) => {
		const service: TyeService = node.service;
		const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse('tye:' + service.description.name));
		await vscode.window.showTextDocument(doc, {preview:false});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('vscode-tye.commands.debugAll', async () => {
		const services = await tyeClient.getServices();
		if(services) {
			for(const service of services) {
				if(service.serviceType === 'project') {
					for(const replicaName of Object.keys(service.replicas)) {
						const config = {type:'coreclr', name:`Attach to Tye PID: ${service.replicas[replicaName].pid}`,request:'attach', processId:`${service.replicas[replicaName].pid}`};
						await vscode.debug.startDebugging(undefined, config);
					}
				}
			}
		}
	}));

	context.subscriptions.push(vscode.tasks.registerTaskProvider('tye-run', new TyeRunCommandTaskProvider(taskMonitor)));
}
