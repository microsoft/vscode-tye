import * as vscode from 'vscode';
import { TyeClient } from 'src/services/tyeClient';

export interface TyeDebugConfiguration extends vscode.DebugConfiguration {
    services?: string[];
}

export class TyeDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
    constructor(private readonly tyeClient: TyeClient) {
    }

    async resolveDebugConfigurationWithSubstitutedVariables(folder: vscode.WorkspaceFolder | undefined, debugConfiguration: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration | null | undefined> {
        const tyeDebugConfiguration = <TyeDebugConfiguration>debugConfiguration;

        const services = await this.tyeClient.getServices();

        for (const debuggedService of (services ?? []).filter(service => service.serviceType === 'project' && (tyeDebugConfiguration.services === undefined || tyeDebugConfiguration.services.includes(service.description.name)))) {
            for (const replicaName of Object.keys(debuggedService.replicas)) {
                await vscode.debug.startDebugging(
                    folder,
                    {
                        name:`Tye Replica: ${replicaName}`,
                        type:'coreclr',
                        request:'attach',
                        processId: `${debuggedService.replicas[replicaName].pid}`
                    });
            }
        }

        return undefined;
    }
}