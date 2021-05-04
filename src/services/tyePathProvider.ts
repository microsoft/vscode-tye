// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from 'os';
import * as path from 'path';
import CommandLineBuilder from '../util/commandLineBuilder';
import { SettingsProvider } from './settingsProvider';
import { Process } from '../util/process';

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
            const commandLineBuilder = CommandLineBuilder.create('tye', '--version');
            const result = await Process.exec(commandLineBuilder.build());

            if (result.code === 0)
            {
                return 'tye';
            }
        }
        catch
        {
            // Best effort; In case of error, fallback to homedir.
        }

        return path.join(os.homedir(), '.dotnet', 'tools', 'tye');
    }
}