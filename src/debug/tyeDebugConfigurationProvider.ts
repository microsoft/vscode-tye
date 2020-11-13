import * as vscode from 'vscode';

export class TyeDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
    resolveDebugConfigurationWithSubstitutedVariables(folder: vscode.WorkspaceFolder | undefined, debugConfiguration: vscode.DebugConfiguration, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration> {
        return undefined;
    }
}