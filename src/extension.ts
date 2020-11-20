// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as querystring from 'querystring';
import { first } from 'rxjs/operators';
import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import AxiosHttpClient from './services/httpClient';
import { TyeServicesProvider, ReplicaNode, ServiceNode } from './views/tyeServicesProvider';
import { httpTyeClientProvider } from './services/tyeClient';
import { TyeLogsContentProvider } from './views/tyeLogsContentProvider';
import TyeRunCommandTaskProvider from './tasks/tyeRunTaskProvider';
import { TyeTaskMonitor } from './tasks/taskMonitor';
import { TyeDebugConfigurationProvider } from './debug/tyeDebugConfigurationProvider';
import { TaskBasedTyeApplicationProvider } from './services/tyeApplicationProvider';
import { getLocalizationPathForFile } from './util/localization';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

export function activate(context: vscode.ExtensionContext): void {

	context.subscriptions.push(vscode.commands.registerCommand('vscode-tye.commands.debugTyeService', async (pid: string) => {
			const config = {type:'coreclr', name:`Attach to Tye PID: ${pid}`,request:'attach', processId:`${pid}`};
			await vscode.debug.startDebugging(undefined, config);
	}));

	const httpClient = new AxiosHttpClient();
	const taskMonitor = new TyeTaskMonitor();
	const tyeClientProvider = httpTyeClientProvider(httpClient);
	const tyeApplicationProvider = new TaskBasedTyeApplicationProvider(taskMonitor, tyeClientProvider);

	const logsContentProvider = new TyeLogsContentProvider(tyeClientProvider);
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('tye-log', logsContentProvider));

	const treeProvider = new TyeServicesProvider(vscode.workspace.workspaceFolders, tyeApplicationProvider, tyeClientProvider);
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

	context.subscriptions.push(vscode.commands.registerCommand('vscode-tye.commands.launchTyeDashboard', async (dashboard: vscode.Uri) => {
		if (dashboard?.scheme === 'http' || dashboard?.scheme === 'https') {
			await vscode.env.openExternal(dashboard);
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('vscode-tye.commands.attachService', async (node: ReplicaNode) => {
		const replica: TyeReplica = node.replica;
		const config = {type:'coreclr', name:`Attach to Tye PID: ${replica.pid}`,request:'attach', processId:`${replica.pid}`};
		await vscode.debug.startDebugging(undefined, config);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('vscode-tye.commands.showLogs', async (node: ServiceNode) => {
		const dashboard = node.application.dashboard;
		const service: TyeService = node.service;

		const logUri =
			vscode.Uri
				.parse(`tye-log://logs/${service.description.name}`)
				.with({
					query: querystring.stringify({ dashboard: dashboard?.toString() })
			});

		const doc = await vscode.workspace.openTextDocument(logUri);

		await vscode.window.showTextDocument(doc, {preview:false});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('vscode-tye.commands.debugAll', async () => {
        const applications = await tyeApplicationProvider.applications.pipe(first()).toPromise();
		const application = applications[0];

		if (application) {
			const tyeClient = tyeClientProvider(application.dashboard);

			if (tyeClient) {
				const services = await tyeClient.getServices();

				for (const service of (services ?? [])) {
					if (service.serviceType === 'project') {
						for (const replicaName of Object.keys(service.replicas)) {
							const config = {
								type: 'coreclr',
								name: localize('extension.sessionName', 'Tye Replica: {0}', replicaName),
								request: 'attach',
								processId: `${service.replicas[replicaName].pid}`
							};
							await vscode.debug.startDebugging(undefined, config);
						}
					}
				}
			}
		}
	}));

	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('tye', new TyeDebugConfigurationProvider(tyeApplicationProvider)));

	context.subscriptions.push(vscode.tasks.registerTaskProvider('tye-run', new TyeRunCommandTaskProvider(taskMonitor)));
}
