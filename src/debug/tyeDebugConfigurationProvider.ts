// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { TyeApplicationProvider } from '../services/tyeApplicationProvider';
import { getLocalizationPathForFile } from '../util/localization';
import { TyeApplicationWatcher } from './tyeApplicationWatcher';
import { attachToReplica } from './attachToReplica';
import { DebugSessionMonitor } from './debugSessionMonitor';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

export interface TyeDebugConfiguration extends vscode.DebugConfiguration {
    applicationName : string;
    services?: string[];
    watch?: boolean;
}

export class TyeDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
    constructor(
        private readonly debugSessionMonitor: DebugSessionMonitor,
        private readonly tyeApplicationProvider: TyeApplicationProvider,
        private readonly tyeApplicationWatcher: TyeApplicationWatcher) {
    }

    async resolveDebugConfigurationWithSubstitutedVariables(folder: vscode.WorkspaceFolder | undefined, debugConfiguration: vscode.DebugConfiguration): Promise<vscode.DebugConfiguration | null | undefined> {
        const tyeDebugConfiguration = <TyeDebugConfiguration>debugConfiguration;

        const applications = await this.tyeApplicationProvider.getApplications();
        const application = applications.find(a => a.name === tyeDebugConfiguration.applicationName);

        if (!application) {
            throw new Error(localize('debug.tyeDebugConfigurationProvider.applicationNotRunning', 'The Tye application "{0}" is not running.', tyeDebugConfiguration.applicationName));
        }

        const debuggableServiceNames = Object.keys(application.projectServices ?? {});
        
        if (application.projectServices === undefined || debuggableServiceNames.length === 0) {
            throw new Error(localize('debug.tyeDebugConfigurationProvider.noDebuggableServices', 'The Tye application "{0}" does not have any debuggable services.', tyeDebugConfiguration.applicationName));
        }
        
        const debuggedServiceNames = tyeDebugConfiguration.services ?? debuggableServiceNames;

        if (debuggedServiceNames.length === 0) {
            throw new Error(localize('debug.tyeDebugConfigurationProvider.noDebuggedServices', 'No services were set to be debugged.'));
        }

        for (const serviceName of debuggedServiceNames) {
            const service = application.projectServices[serviceName];

            if (service === undefined) {
                throw new Error(localize('debug.tyeDebugConfigurationProvider.noDebuggedService', 'The Tye application "{0}" does not have the debugged service "{1}".', tyeDebugConfiguration.applicationName, serviceName));
            }

            for (const replicaName of Object.keys(service.replicas)) {
                const pid = service.replicas[replicaName];

                await attachToReplica(this.debugSessionMonitor, folder, replicaName, pid);
            }
        }

        if (tyeDebugConfiguration.watch) {
            this.tyeApplicationWatcher.watchApplication(tyeDebugConfiguration.applicationName, { folder, services: tyeDebugConfiguration.services });
        }

        return undefined;
    }
}