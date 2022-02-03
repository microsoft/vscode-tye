// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { race } from 'rxjs';
import { filter, first, map, timeout } from 'rxjs/operators';
import { TyeApplication, TyeApplicationProvider } from '../services/tyeApplicationProvider';
import { getLocalizationPathForFile } from '../util/localization';
import { TyeApplicationWatcher } from './tyeApplicationWatcher';
import { attachToReplica } from './attachToReplica';
import { DebugSessionMonitor } from './debugSessionMonitor';
import { UserInput } from '../services/userInput';
import { observableFromCancellationToken } from '../util/observableUtil';

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
        private readonly tyeApplicationWatcher: TyeApplicationWatcher,
        private readonly userInput: UserInput) {
    }

    async resolveDebugConfigurationWithSubstitutedVariables(folder: vscode.WorkspaceFolder | undefined, debugConfiguration: vscode.DebugConfiguration): Promise<vscode.DebugConfiguration | null | undefined> {
        const tyeDebugConfiguration = <TyeDebugConfiguration>debugConfiguration;

        // NOTE: In the unlikely event of multiple same-named applications running, we arbitrarily use the first match.
        // TODO: Cache applications started via our `tye-run` tasks, and give preference to those.

        function isValidApplication(a: TyeApplication | undefined): a is TyeApplication {
            return a !== undefined;
        }

        function allServicesRunning(a: TyeApplication): boolean {
            return Object
                .values(a.projectServices)
                .every(service => Object.values(service.replicas).length);
        }

        let application: TyeApplication | undefined;

        try
        {
            application = await this.userInput.withProgress(
                localize('debug.tyeDebugConfigurationProvider.waitingForApplication', 'Waiting for Tye application to start...'),
                (progress, cancellationToken) => {

                    const cancellation = observableFromCancellationToken<TyeApplication>(cancellationToken);

                    const applicationMonitor =
                        this.tyeApplicationProvider
                            .applications
                            .pipe(
                                map(applications => applications.find(a => a.name.toLowerCase() === tyeDebugConfiguration.applicationName.toLowerCase())),
                                filter(isValidApplication),
                                filter(allServicesRunning),
                                first(),
                                timeout(60000));

                    return race(applicationMonitor, cancellation).toPromise();
                }
            );
        }
        catch {
            // Trap any timeout exception.
        }

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

                await attachToReplica(this.debugSessionMonitor, folder, service.serviceType, replicaName, pid);
            }
        }

        if (tyeDebugConfiguration.watch) {
            this.tyeApplicationWatcher.watchApplication(application.id, { folder, services: tyeDebugConfiguration.services });
        }

        return undefined;
    }
}