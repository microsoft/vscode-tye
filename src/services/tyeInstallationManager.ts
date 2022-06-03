// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as semver from 'semver';
import { TyeCliClient } from './tyeCliClient';
import * as nls from 'vscode-nls';
import { getLocalizationPathForFile } from '../util/localization';
import { IErrorHandlingContext } from '@microsoft/vscode-azext-utils';
import { UserInput } from './userInput';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

export interface TyeInstallationManager {
    ensureInstalled(context?: IErrorHandlingContext): Promise<void>;
    ensureInstalledVersion(version: string, context?: IErrorHandlingContext): Promise<void>;
    
    isInstalled(): Promise<boolean>;
    isVersionInstalled(version: string): Promise<boolean>;
}

export default class LocalTyeInstallationManager implements TyeInstallationManager {
    private readonly satisfiedVersions = new Set<string>();

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
                            await this.ui.executeCommand('vscode-tye.commands.help.installTye')
                        },
                        title: localize('services.tyeInstallationManager.installLatestTitle', 'Install Latest Tye')
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
        if (this.satisfiedVersions.has(version)) {
            return true;
        }

        try {
            const cliVersion = await this.tyeCliClient.version();
            
            if (semver.satisfies(cliVersion, version, { includePrerelease: true })) {
                this.satisfiedVersions.add(version);

                return true;
            }
        }
        catch {
            // No-op.
        }
        
        return false;
    }
}
