// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { first } from 'rxjs/operators';
import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { TyeApplicationProvider } from 'src/services/tyeApplicationProvider';
import { TyeClientProvider } from '../services/tyeClient';
import { getLocalizationPathForFile } from '../util/localization';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

export interface TyeDebugConfiguration extends vscode.DebugConfiguration {
    applicationName : string;
    services?: string[];
    watch?: boolean;
}

export class TyeDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
    constructor(private readonly tyeApplicationProvider: TyeApplicationProvider, private readonly tyeClientProvider: TyeClientProvider) {
    }

    async resolveDebugConfigurationWithSubstitutedVariables(folder: vscode.WorkspaceFolder | undefined, debugConfiguration: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration | null | undefined> {
        const tyeDebugConfiguration = <TyeDebugConfiguration>debugConfiguration;

        const applications = await this.tyeApplicationProvider.applications.pipe(first()).toPromise();
        const application = applications.find(a => a.name === tyeDebugConfiguration.applicationName);

        if (!application) {
            throw new Error(localize('debug.tyeDebugConfigurationProvider.applicationNotRunning', 'The Tye application "{0}" is not running.', tyeDebugConfiguration.applicationName));
        }

        const tyeClient = this.tyeClientProvider(application.dashboard);

        if (!tyeClient) {
            throw new Error(localize('debug.tyeDebugConfigurationProvider.noTyeClient', 'Unable to get a client for the Tye application "{0}".', tyeDebugConfiguration.applicationName));
        }

        const services = await tyeClient.getServices(token);
        const debuggableServices =
            services
                .filter(service => service.serviceType === 'project')
                .reduce<{ [key: string]: TyeService }>(
                    (previous, current) => {
                        previous[current.description.name] = current;
                        return previous;
                    },
                    {});

        const debuggableServiceNames = Object.keys(debuggableServices);

        if (debuggableServiceNames.length === 0) {
            throw new Error(localize('debug.tyeDebugConfigurationProvider.noDebuggableServices', 'The Tye application "{0}" does not have any debuggable services.', tyeDebugConfiguration.applicationName));
        }

        const debuggedServiceNames = tyeDebugConfiguration.services ?? debuggableServiceNames;

        if (debuggedServiceNames.length === 0) {
            throw new Error(localize('debug.tyeDebugConfigurationProvider.noDebuggedServices', 'No services were set to be debugged.'));
        }

        for (const serviceName of debuggedServiceNames) {
            const service = debuggableServices[serviceName];

            if (service === undefined) {
                throw new Error(localize('debug.tyeDebugConfigurationProvider.noDebuggedService', 'The Tye application "{0}" does not have the debugged service "{1}".', tyeDebugConfiguration.applicationName, serviceName));
            }

            for (const replicaName of Object.keys(service.replicas)) {
                await vscode.debug.startDebugging(
                    folder,
                    {
                        name: localize('debug.tyeDebugConfigurationProvider.sessionName', 'Tye Replica: {0}', replicaName),
                        type:'coreclr',
                        request:'attach',
                        processId: `${service.replicas[replicaName].pid}`
                    });
            }
        }

        return undefined;
    }
}