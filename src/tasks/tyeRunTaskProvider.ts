// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import CommandLineBuilder from "../util/commandLineBuilder";
import { TaskDefinition } from "vscode";
import CommandTaskProvider from "./commandTaskProvider";
import { TaskMonitorReporter } from "./taskMonitor";

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
    constructor(taskMonitorReporter: TaskMonitorReporter) {
        super(
            (name, definition, callback) => {
                let isRunning = false;
                let dashboard: vscode.Uri | undefined = undefined;

                return taskMonitorReporter.reportTask(
                    name,
                    definition.type,
                    reportTaskRunning => {
                        const tyeDefinition = <TyeRunTaskDefinition>definition;

                        const command =
                            CommandLineBuilder
                                .create('tye run')
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

                        return callback(
                            command,
                            {
                                cwd: definition.cwd,
                                onStdOut:
                                    data => {
                                        if (!isRunning) {
                                            if (dashboard === undefined) {
                                                const match = dashboardRunningOn.exec(data);
                                                
                                                if (match?.groups?.location) {
                                                    dashboard = vscode.Uri.parse(match.groups.location, true);
                                                }
                                            }
                                            
                                            if (listeningForPipeEvents.test(data)) {
                                                isRunning = true;

                                                reportTaskRunning(
                                                    {
                                                        applicationName: tyeDefinition.applicationName,
                                                        dashboard
                                                    });
                                            }
                                        }
                                    }
                            });
                    });
            },
            /* isBackgroundTask: */ true,
            /* problemMatchers: */ ['$tye-run']);
    }
}