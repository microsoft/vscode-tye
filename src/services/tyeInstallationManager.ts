import * as semver from 'semver';
import { TyeCliClient } from './tyeCliClient';
import * as nls from 'vscode-nls';
import { getLocalizationPathForFile } from '../util/localization';
import { IErrorHandlingContext } from 'vscode-azureextensionui';
import { UserInput } from './userInput';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

export interface TyeInstallationManager {
    ensureInstalledVersion(version: string, context?: IErrorHandlingContext): Promise<void>;
    isVersionInstalled(version: string): Promise<boolean>;
}

export default class LocalTyeInstallationManager implements TyeInstallationManager {
    constructor(private readonly tyeCliClient: TyeCliClient, private readonly ui: UserInput) {
    }

    async ensureInstalledVersion(version: string, context?: IErrorHandlingContext): Promise<void> {
        const isVersionInstalled = await this.isVersionInstalled(version);

        if (!isVersionInstalled) {
            if (context) {
                context.buttons = [
                    {
                        callback: async () => {
                            await this.ui.openExternal('https://aka.ms/vscode-tye-help-install-tye')
                        },
                        title: 'Install Tye'
                    }
                ];

                context.suppressReportIssue = true;
            }

            // TODO: Use UI to show rich error.
            throw new Error(localize('services.tyeInstallationManager.versionNotInstalled', 'A required version of Tye has not been installed. Install a more recent version.'));
        }
    }

    async isVersionInstalled(version: string): Promise<boolean> {      
        try {
            const cliVersion = await this.tyeCliClient.version();
            
            return semver.satisfies(cliVersion, version);
        }
        catch {
            return false;
        }
    }
}
