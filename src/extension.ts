// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as querystring from 'querystring';
import * as vscode from 'vscode';
import AxiosHttpClient from './services/httpClient';
import { TyeServicesProvider, ReplicaNode, ServiceNode } from './views/tyeServicesProvider';
import { httpTyeClientProvider } from './services/tyeClient';
import { TyeLogsContentProvider } from './views/tyeLogsContentProvider';
import TyeRunCommandTaskProvider from './tasks/tyeRunTaskProvider';
import { TyeTaskMonitor } from './tasks/taskMonitor';
import { TyeDebugConfigurationProvider } from './debug/tyeDebugConfigurationProvider';
import { TaskBasedTyeApplicationProvider } from './services/tyeApplicationProvider';
import { TyeApplicationDebugSessionWatcher } from './debug/tyeApplicationWatcher';
import { CoreClrDebugSessionMonitor } from './debug/debugSessionMonitor';
import { attachToReplica } from './debug/attachToReplica';

export function activate(context: vscode.ExtensionContext): void {

	const httpClient = new AxiosHttpClient();
	const taskMonitor = new TyeTaskMonitor();

	context.subscriptions.push(taskMonitor);

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
		await attachToReplica(undefined, replica.name, replica.pid);
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
		const applications = await tyeApplicationProvider.getApplications();
		
		// NOTE: We arbitrarily only attach to processes associated with the first application.
		//       This matches the tree view, which also shows only that first application.
		//       Future work will refactor the tree view and debugging for multiple applications
		//       once Tye has better discovery support.
		const application = applications[0];

		if (application?.projectServices) {
			for (const service of Object.values(application.projectServices)) {
					for (const replicaName of Object.keys(service.replicas)) {
						const pid = service.replicas[replicaName];

						if (pid !== undefined) {
							await attachToReplica(undefined, replicaName, pid);
						}
					}
			}
		}
	}));

	const debugSessionMonitor = new CoreClrDebugSessionMonitor();

	context.subscriptions.push(debugSessionMonitor);

	const applicationWatcher = new TyeApplicationDebugSessionWatcher(debugSessionMonitor, tyeApplicationProvider);

	context.subscriptions.push(applicationWatcher);

	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('tye', new TyeDebugConfigurationProvider(tyeApplicationProvider, applicationWatcher)));

	context.subscriptions.push(vscode.tasks.registerTaskProvider('tye-run', new TyeRunCommandTaskProvider(taskMonitor)));
}
