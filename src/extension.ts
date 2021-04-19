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
import { AzureUserInput, createAzExtOutputChannel, registerUIExtensionVariables, IActionContext } from 'vscode-azureextensionui';
import ext from './ext';
import AzureTelemetryProvider from './services/telemetryProvider';
import createScaffoldTyeTasksCommand from './commands/scaffolding/scaffoldTyeTasks';
import LocalScaffolder from './scaffolding/scaffolder';
import { AggregateUserInput } from './services/userInput';
import { WorkspaceTyeApplicationConfigurationProvider, YamlTyeApplicationConfigurationReader } from './services/tyeApplicationConfiguration';
import createInitializeTyeCommand from './commands/scaffolding/initializeTye';
import LocalTyeCliClient from './services/tyeCliClient';
import HelpTreeDataProvider from './views/help/helpTreeDataProvider';
import createReadDocumentationCommand from './commands/help/readDocumentation';
import createGetStartedCommand from './commands/help/getStarted';
import createReportIssueCommand from './commands/help/reportIssue';
import createReviewIssuesCommand from './commands/help/reviewIssues';

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
			actionContext.telemetry.properties.isActivationEvent = 'true';

			const httpClient = new AxiosHttpClient();
			const taskMonitor = registerDisposable(new TyeTaskMonitor());

			const tyeClientProvider = httpTyeClientProvider(httpClient);
			const tyeApplicationProvider = new TaskBasedTyeApplicationProvider(taskMonitor, tyeClientProvider);

			registerDisposable(vscode.workspace.registerTextDocumentContentProvider('tye-log', new TyeLogsContentProvider(tyeClientProvider)));
		
			const treeProvider = new TyeServicesProvider(vscode.workspace.workspaceFolders, tyeApplicationProvider, tyeClientProvider);

			registerDisposable(vscode.window.registerTreeDataProvider(
				'vscode-tye.views.services',
				treeProvider
			));

			registerDisposable(
				vscode.window.registerTreeDataProvider(
					'vscode-tye.views.help',
					new HelpTreeDataProvider()));

			telemetryProvider.registerCommandWithTelemetry(
				'vscode-tye.commands.refreshEntry',
				() => {
					treeProvider.refresh()
				});

			telemetryProvider.registerCommandWithTelemetry(
				'vscode-tye.commands.browseService',
				async (contextx, serviceNode: ReplicaNode) => {
					const uri = serviceNode.BrowserUri;
					if(uri) {
						await vscode.env.openExternal(uri);
					}
				});

			telemetryProvider.registerCommandWithTelemetry(
				'vscode-tye.commands.launchTyeDashboard',
				async (context, dashboard: vscode.Uri) => {
					if (dashboard?.scheme === 'http' || dashboard?.scheme === 'https') {
						await vscode.env.openExternal(dashboard);
					}
				});

			telemetryProvider.registerCommandWithTelemetry(
				'vscode-tye.commands.attachService',
				async (context, node: ReplicaNode) => {
					const replica: TyeReplica = node.replica;
					await attachToReplica(undefined, replica.name, replica.pid);
				});

			const scaffolder = new LocalScaffolder();
			const ui = new AggregateUserInput(ext.ui);
			const tyeApplicationConfigurationProvider = new WorkspaceTyeApplicationConfigurationProvider(new YamlTyeApplicationConfigurationReader());

			telemetryProvider.registerCommandWithTelemetry(
				'vscode-tye.commands.scaffolding.initTye',
				createInitializeTyeCommand(tyeApplicationConfigurationProvider, new LocalTyeCliClient()));

			telemetryProvider.registerCommandWithTelemetry(
				'vscode-tye.commands.scaffolding.scaffoldTyeTasks',
				createScaffoldTyeTasksCommand(tyeApplicationConfigurationProvider, scaffolder, ui));

			telemetryProvider.registerCommandWithTelemetry(
				'vscode-tye.commands.showLogs',
				async (context, node: ServiceNode) => {
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
				});

			telemetryProvider.registerCommandWithTelemetry(
				'vscode-tye.commands.debugAll',
				async () => {
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
				});
		
			telemetryProvider.registerCommandWithTelemetry('vscode-tye.help.readDocumentation', createReadDocumentationCommand(ui));
			telemetryProvider.registerCommandWithTelemetry('vscode-tye.help.getStarted', createGetStartedCommand(ui));
			telemetryProvider.registerCommandWithTelemetry('vscode-tye.help.reportIssue', createReportIssueCommand(ui));
			telemetryProvider.registerCommandWithTelemetry('vscode-tye.help.reviewIssues', createReviewIssuesCommand(ui));
	
			const debugSessionMonitor = registerDisposable(new CoreClrDebugSessionMonitor());
			const applicationWatcher = registerDisposable(new TyeApplicationDebugSessionWatcher(debugSessionMonitor, tyeApplicationProvider));
		
			registerDisposable(vscode.debug.registerDebugConfigurationProvider('tye', new TyeDebugConfigurationProvider(tyeApplicationProvider, applicationWatcher)));
		
			registerDisposable(vscode.tasks.registerTaskProvider('tye-run', new TyeRunCommandTaskProvider(taskMonitor, telemetryProvider)));

			return Promise.resolve();
		});
}
