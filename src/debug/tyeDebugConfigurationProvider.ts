import { TyeClient } from 'src/services/tyeClient';
import * as vscode from 'vscode';

export class TyeDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
    constructor(private readonly tyeClient: TyeClient) {
    }

    async resolveDebugConfigurationWithSubstitutedVariables(folder: vscode.WorkspaceFolder | undefined, debugConfiguration: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration | null | undefined> {
        const services = await this.tyeClient.getServices();
        if(services) {
            for(const service of services) {
                if(service.serviceType === 'project') {
                    for(const replicaName of Object.keys(service.replicas)) {
                        const config = {type:'coreclr', name:`Attach to Tye PID: ${service.replicas[replicaName].pid}`,request:'attach', processId:`${service.replicas[replicaName].pid}`};
                        await vscode.debug.startDebugging(undefined, config);
                    }
                }
            }
        }

        return undefined;
    }
}