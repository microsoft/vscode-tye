// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import * as cp from 'child_process';
import CommandLineBuilder from '../util/commandLineBuilder';
import { TaskDefinition } from 'vscode';
import CommandTaskProvider from './commandTaskProvider';
import { TaskMonitorReporter } from './taskMonitor';
import { TelemetryProvider } from '../services/telemetryProvider';
import { TyePathProvider } from '../services/tyePathProvider';
import { TyeClientProvider } from '../services/tyeClient';
import { TyeApplicationProvider } from '../services/tyeApplicationProvider';

export type TyeLogProvider = 'console' | 'elastic' | 'ai' | 'seq';
export type TyeDistributedTraceProvider = 'zipkin';
export type TyeVerbosity = 'Debug' | 'Info' | 'Quiet';

export interface TyeRunTaskDefinition extends TaskDefinition {
    applicationName: string; // TODO: Infer this from output and/or the dashboard API.
    build?: boolean;
    dashboard?: boolean;
    debug?: '*' | string | string[];
    docker?: boolean;
    dtrace?: TyeDistributedTraceProvider;
    framework?: string;
    logs?: TyeLogProvider;
    metrics?: string;
    path?: string;
    port?: number;
    tags?: string | string[];
    verbosity?: TyeVerbosity;
    watch?: boolean;
}

const dashboardRunningOn = /Dashboard running on (?<location>.*)$/gm;
const listeningForPipeEvents = /Listening for event pipe events/;

export default class TyeRunCommandTaskProvider extends CommandTaskProvider {
    constructor(taskMonitorReporter: TaskMonitorReporter, telemetryProvider: TelemetryProvider, tyePathProvider: TyePathProvider, tyeClientProvider: TyeClientProvider, tyeApplicationProvider: TyeApplicationProvider) {
        super(
            (name, definition, callback) => {
                let dashboard: vscode.Uri | undefined = undefined;

                return telemetryProvider.callWithTelemetry(
                    'vscode-tye.tasks.tye-run',
                    () => {
                        return taskMonitorReporter.reportTask(
                            name,
                            definition.type,
                            async reportTaskRunning => {
                                const tyeDefinition = <TyeRunTaskDefinition>definition;
                                const tyePath = await tyePathProvider.getTyePath();

                                const command =
                                    CommandLineBuilder
                                        .create(tyePath, 'run')
                                        .withFlagArg('--no-build', tyeDefinition.build === false)
                                        .withNamedArg('--port', tyeDefinition.port)
                                        .withNamedArg('--logs', tyeDefinition.logs)
                                        .withNamedArg('--dtrace', tyeDefinition.dtrace)
                                        .withNamedArg('--metrics', tyeDefinition.metrics)
                                        .withNamedArgs('--debug', tyeDefinition.debug)
                                        .withFlagArg('--docker', tyeDefinition.docker)
                                        .withFlagArg('--dashboard', tyeDefinition.dashboard)
                                        .withFlagArg('--watch', tyeDefinition.watch)
                                        .withNamedArg('--framework', tyeDefinition.framework)
                                        .withNamedArgs('--tags', tyeDefinition.tags)
                                        .withNamedArg('--verbosity', tyeDefinition.verbosity)
                                        .withQuotedArg(tyeDefinition.path)
                                        .build();

                                return await callback(
                                    command,
                                    {
                                        cwd: definition.cwd,
                                        onStdOut:
                                            data => {
                                                if (dashboard === undefined) {
                                                    const match = dashboardRunningOn.exec(data);
                                                    
                                                    if (match?.groups?.location) {
                                                        dashboard = vscode.Uri.parse(match.groups.location, true);
                                                    }
                                                }
                                                
                                                if (listeningForPipeEvents.test(data)) {
                                                    // NOTE: This may be fired multiple times:
                                                    //       (1) if the application has more than one service/replica
                                                    //       (2) if the application is in watch mode and a service is rebuilt and restarted
                                                    reportTaskRunning(
                                                        {
                                                            applicationName: tyeDefinition.applicationName,
                                                            dashboard
                                                        });
                                                }
                                            }
                                    });
                            });
                    });
            },
            async (process: cp.ChildProcess) => {
                const applications = await tyeApplicationProvider.getApplications();

                // NOTE: We arbitrarily pick the first application. This matches the tree view, which also shows only that first application.
                //       Future work will refactor this logic to shutdown the appropriate application once Tye has better discovery support.
                const application = applications[0];
                const tyeClient = tyeClientProvider(application.dashboard);

                if (tyeClient)
                {
                    const tyeProcessShutdownTimeoutMs = 10 * 1000; // 10 seconds timeout for the tye process to shutdown.
                    const tyeProcessShutdownPromise = new Promise<void>((resolve) => process.once('close', () => resolve()));

                    await tyeClient.shutDown();
                    await awaitWithTimeout(tyeProcessShutdownTimeoutMs, tyeProcessShutdownPromise);
                }
            },
            /* isBackgroundTask: */ true,
            /* problemMatchers: */ ['$tye-run']);

            function awaitWithTimeout(timeout: number, promise: Promise<void>)
            {
                const timeoutPromise = new Promise((resolve, reject) => {
                    setTimeout(() => reject(), timeout);
                });

                return Promise.race([promise, timeoutPromise]);
            }
    }
}