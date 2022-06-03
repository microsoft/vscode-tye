// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import CommandLineBuilder from '../util/commandLineBuilder';
import { TaskDefinition } from 'vscode';
import CommandTaskProvider from './commandTaskProvider';
import { TelemetryProvider } from '../services/telemetryProvider';
import { TyePathProvider } from '../services/tyePathProvider';
import { TyeClientProvider } from '../services/tyeClient';
import { TyeApplicationProvider } from '../services/tyeApplicationProvider';
import { ProcessCancellationOptions } from '../util/process';
import { TyeInstallationManager } from '../services/tyeInstallationManager';
import { IActionContext } from '@microsoft/vscode-azext-utils';

export type TyeLogProvider = 'console' | 'elastic' | 'ai' | 'seq';
export type TyeDistributedTraceProvider = 'zipkin';
export type TyeVerbosity = 'Debug' | 'Info' | 'Quiet';

export interface TyeRunTaskDefinition extends TaskDefinition {
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

const tyeAppStartedRegex = new RegExp('started successfully with Pid: (?<pid>[0-9]+)');

export default class TyeRunCommandTaskProvider extends CommandTaskProvider {
    constructor(
        telemetryProvider: TelemetryProvider,
        tyeApplicationProvider: TyeApplicationProvider,
        tyeClientProvider: TyeClientProvider,
        tyeInstallationManager: TyeInstallationManager,
        tyePathProvider: TyePathProvider) {
        super(
            (name, definition, callback) => {
                let tyePid: number | undefined = undefined;

                return telemetryProvider.callWithTelemetry(
                    'vscode-tye.tasks.tye-run',
                    async (context: IActionContext) => {
                        await tyeInstallationManager.ensureInstalled(context.errorHandling);

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

                        await callback(
                            command,
                            {
                                cwd: definition.cwd,
                                onCancellation: async () : Promise<ProcessCancellationOptions> => {
                                    if (tyePid !== undefined) {
                                        const applications = await tyeApplicationProvider.getApplications();                                               
                                        const application = applications.find(application => application.pid === tyePid);

                                        if (application) {
                                            const tyeClient = tyeClientProvider(application.dashboard);

                                            if (tyeClient) {
                                                await tyeClient.shutDown();
                                                const tyeProcessShutdownTimeout = 60 * 1000; // set timeout to be 1 minute for the tye process to shutdown.
                                                return { 
                                                    waitForProcessClose: true,
                                                    waitForProcessCloseTimeout: tyeProcessShutdownTimeout
                                                };
                                            }
                                        }                                               
                                    }

                                    return {
                                        waitForProcessClose: false
                                    };
                                },
                                onStdOut: stdOut => {
                                    const matchingLogLine = tyeAppStartedRegex.exec(stdOut);
                                    if (matchingLogLine != null)
                                    {
                                        tyePid = parseInt(matchingLogLine[1], 10);
                                    }
                                }
                            });
                    });
            },
            /* isBackgroundTask: */ true,
            /* problemMatchers: */ ['$tye-run']);
    }
}