// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from 'os';
import * as path from 'path';
import { SettingsProvider } from './settingsProvider';
import LocalTyeCliClient from './tyeCliClient';

export interface TyePathProvider {
    getTyePath() : Promise<string>;
}

export default class LocalTyePathProvider implements TyePathProvider {
    constructor(private readonly settingsProvider: SettingsProvider) {
    }

    private cachedTyePath : string | undefined = undefined;

    async getTyePath(): Promise<string> {
        
        if (this.settingsProvider.tyePath)
        {
            return this.settingsProvider.tyePath;
        }
        if (!this.cachedTyePath)
        {
            this.cachedTyePath = await this.tryGetTyePath();
        }

        return this.cachedTyePath;
    }

    private async tryGetTyePath() : Promise<string>
    {
        try
        {
            const tyePath = 'tye';
            const tyeCliClient = new LocalTyeCliClient(() => Promise.resolve(tyePath));

            await tyeCliClient.version();
                
            return tyePath;
        }
        catch
        {
            // Best effort; In case of error, fallback to homedir.
        }

        return path.join(os.homedir(), '.dotnet', 'tools', os.platform() === 'win32' ? 'tye.exe' : 'tye');
    }
}