// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { TyeApplicationProvider } from 'src/services/tyeApplicationProvider';
import { getLocalizationPathForFile } from '../util/localization';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

export interface TyeDebugConfiguration extends vscode.DebugConfiguration {
    applicationName : string;
    services?: string[];
    watch?: boolean;
}

class TyeDebugWatcher {
    private replicaPids: { [key: string]: number } = {};

    private readonly subscription: Subscription;

    constructor(folder: vscode.WorkspaceFolder | undefined, private readonly applicationName: string, private services: string[] | undefined, private readonly tyeApplicationProvider: TyeApplicationProvider) {
        this.subscription =
            tyeApplicationProvider
                .applications
                .pipe(map(applications => applications.find(application => application.name === applicationName)))
                .subscribe(
                    application => {
                        if (application?.projectServices) {
                            for (const serviceName of Object.keys(application.projectServices)) {
                                const service = application.projectServices[serviceName];
                                
                                for (const replicaName of Object.keys(service.replicas)) {
                                    const currentPid = service.replicas[replicaName];

                                    if (currentPid !== undefined) {
                                        const existingPid = this.replicaPids[replicaName];

                                        if (existingPid !== currentPid) {
                                            // Was not attached or previously attached to a different PID
                                            // TODO: Manage the end of debugging sessions.
                                            // TODO: Manage edge case of replica restarting with same PID
                                            // TODO: Attach debugger
                                            void vscode.debug.startDebugging(
                                                folder,
                                                {
                                                    name: localize('debug.tyeDebugConfigurationProvider.sessionName', 'Tye Replica: {0}', replicaName),
                                                    type:'coreclr',
                                                    request:'attach',
                                                    processId: currentPid.toString()
                                                });

                                            this.replicaPids[replicaName] = currentPid;
                                        }
                                    }
                                }
                            }

                            // Get current list of attached replicas
                            // Compare to latest replica PIDs
                            // Attach to all new replica PIDs (filtered according to subset of services)
                        } else {
                            // The application has stopped; no need to continue listening.
                            this.subscription.unsubscribe();
                        }
                    });
    }
}

export class TyeDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
    private readonly watchers: { [key: string]: TyeDebugWatcher } = {};

    constructor(private readonly tyeApplicationProvider: TyeApplicationProvider) {
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

                if (pid !== undefined) {
                    await vscode.debug.startDebugging(
                        folder,
                        {
                            name: localize('debug.tyeDebugConfigurationProvider.sessionName', 'Tye Replica: {0}', replicaName),
                            type:'coreclr',
                            request:'attach',
                            processId: pid.toString()
                        });
                    }
                }
        }

        if (tyeDebugConfiguration.watch) {
            this.watchers[tyeDebugConfiguration.applicationName] = new TyeDebugWatcher(folder, tyeDebugConfiguration.applicationName, tyeDebugConfiguration.services, this.tyeApplicationProvider);
        }

        return undefined;
    }
}