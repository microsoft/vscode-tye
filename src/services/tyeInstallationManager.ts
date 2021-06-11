import * as semver from 'semver';
import { TyeCliClient } from './tyeCliClient';
import * as nls from 'vscode-nls';
import { getLocalizationPathForFile } from '../util/localization';
import { IErrorHandlingContext } from 'vscode-azureextensionui';
import { UserInput } from './userInput';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

export interface TyeInstallationManager {
    ensureInstalled(context?: IErrorHandlingContext): Promise<void>;
    ensureInstalledVersion(version: string, context?: IErrorHandlingContext): Promise<void>;
    
    isInstalled(): Promise<boolean>;
    isVersionInstalled(version: string): Promise<boolean>;
}

export default class LocalTyeInstallationManager implements TyeInstallationManager {
    constructor(private readonly expectedVersion: string, private readonly tyeCliClient: TyeCliClient, private readonly ui: UserInput) {
    }

    ensureInstalled(context?: IErrorHandlingContext): Promise<void> {
        return this.ensureInstalledVersion(this.expectedVersion, context);
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
                        title: localize('services.tyeInstallationManager.installLatestTitle', 'Install Latest')
                    }
                ];

                context.suppressReportIssue = true;
            }

            throw new Error(localize('services.tyeInstallationManager.versionNotInstalled', 'A compatible version of Tye has not been found. You may need to install a more recent version.'));
        }
    }

    isInstalled(): Promise<boolean> {
        return this.isVersionInstalled(this.expectedVersion);
    }

    async isVersionInstalled(version: string): Promise<boolean> {      
        try {
            const cliVersion = await this.tyeCliClient.version();
            
            return semver.satisfies(cliVersion, version, { includePrerelease: true });
        }
        catch {
            return false;
        }
    }
}
