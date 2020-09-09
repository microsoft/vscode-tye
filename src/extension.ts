// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import AxiosHttpClient from './services/httpClient';
import { TyeServicesProvider, ReplicaNode, ServiceNode } from './views/tyeServicesProvider';
import { HttpTyeClient } from './services/tyeClient';
import { TyeLogsContentProvider } from './views/tyeLogsContentProvider';
import ext from './ext';
import AzureTelemetryProvider from './services/telemetryProvider';
import { AzureUserInput, createAzExtOutputChannel, registerUIExtensionVariables, IActionContext, registerCommand } from 'vscode-azureextensionui';

export function activate(context: vscode.ExtensionContext): Promise<void> {

	function registerDisposable<T extends vscode.Disposable>(disposable: T): T {
		context.subscriptions.push(disposable);
		
		return disposable;
	}

	ext.context = context;
	ext.ignoreBundle = true;
	ext.outputChannel = registerDisposable(createAzExtOutputChannel('Tye', 'tye'));
	ext.ui = new AzureUserInput(context.globalState);

	registerUIExtensionVariables(ext);

	const telemetryProvider = new AzureTelemetryProvider();

	return telemetryProvider.callWithTelemetry(
		'vscode-tye.extension.activate',
		(actionContext: IActionContext) => {

			const httpClient = new AxiosHttpClient();
			const tyeClient = new HttpTyeClient(httpClient);

			const logsContentProvider = new TyeLogsContentProvider(httpClient);
			const treeProvider = new TyeServicesProvider(vscode.workspace.workspaceFolders, tyeClient);

			telemetryProvider.registerCommandWithTelemetry('vscode-tye.commands.debugTyeService', async (context: IActionContext, pid: number) => {
				const config = {type:'coreclr', name:`Attach to Tye PID: ${pid}`,request:'attach', processId:`${pid}`};
				await vscode.debug.startDebugging(undefined, config);
			});

			registerDisposable(vscode.workspace.registerTextDocumentContentProvider('tye', logsContentProvider));
			registerDisposable(vscode.window.registerTreeDataProvider('vscode-tye.views.services', treeProvider));

			telemetryProvider.registerCommandWithTelemetry('vscode-tye.commands.refreshEntry', () => {
				treeProvider.refresh()
			});

			telemetryProvider.registerContextCommandWithTelemetry('vscode-tye.commands.browseService', async (context: IActionContext, node: ReplicaNode | undefined) => {
				if(node?.isBrowsable) {
					await vscode.env.openExternal(node.GetBrowsableUri());
				}
			});

			telemetryProvider.registerCommandWithTelemetry('vscode-tye.commands.launchTyeDashboard', async () => {
				await vscode.env.openExternal(vscode.Uri.parse('http://localhost:8000'))
			});

			telemetryProvider.registerContextCommandWithTelemetry('vscode-tye.commands.attachService',  async (context:IActionContext, node: ReplicaNode|undefined) => {
				if(node?.replica) {
					const replica: TyeReplica = node.replica;
					const config = {type:'coreclr', name:`Attach to Tye PID: ${replica.pid}`,request:'attach', processId:`${replica.pid}`};
					await vscode.debug.startDebugging(undefined, config);
				}
			});

			telemetryProvider.registerContextCommandWithTelemetry('vscode-tye.commands.showLogs',  async (context:IActionContext, node: ServiceNode|undefined) => {
				if(node?.service) {
					const service: TyeService = node.service;
					const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse('tye:' + service.description.name));
					await vscode.window.showTextDocument(doc, {preview:false});
				}
			});

			telemetryProvider.registerCommandWithTelemetry('vscode-tye.commands.debugAll', async () => {
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
			});

			return Promise.resolve();
	});
}
