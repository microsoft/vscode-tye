import * as semver from 'semver';
import { TyeCliClient } from './tyeCliClient';
import * as nls from 'vscode-nls';
import { getLocalizationPathForFile } from '../util/localization';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

export interface TyeInstallationManager {
    ensureInstalledVersion(version: string): Promise<void>;
    isVersionInstalled(version: string): Promise<boolean>;
}

export default class LocalTyeInstallationManager implements TyeInstallationManager {
    constructor(private readonly tyeCliClient: TyeCliClient) {
    }

    async ensureInstalledVersion(version: string): Promise<void> {
        const isVersionInstalled = await this.isVersionInstalled(version);

        if (!isVersionInstalled) {
            // TODO: Use UI to show rich error.
            throw new Error(localize('services.tyeInstallationManager.versionNotInstalled', 'A required version of Tye has not been installed. Install a more recent version.'));
        }
    }

    async isVersionInstalled(version: string): Promise<boolean> {
        const cliVersion = await this.tyeCliClient.version();

        return semver.satisfies(cliVersion, version);
    }
}
