// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import CommandLineBuilder from '../util/commandLineBuilder';
import { Process } from '../util/process';
import { SettingsProvider } from './settingsProvider';

export interface InitOptions {
    readonly force?: boolean;
    readonly noDefault?: boolean;
    readonly path?: string;
}

export interface TyeCliClient {
    init(options?: InitOptions): Promise<void>;
}

export default class LocalTyeCliClient implements TyeCliClient {
    constructor(settingsProvider : SettingsProvider) {
        this.settingsProvider = settingsProvider;
    }

    private readonly settingsProvider : SettingsProvider;

    async init(options?: InitOptions): Promise<void> {
        const command =
            CommandLineBuilder
                .create(this.settingsProvider.tyePath, 'init')
                .withFlagArg('--force', options?.force === true)
                .withFlagArg('--no-default', options?.noDefault === true)
                .withQuotedArg(options?.path)
                .build();

        await Process.exec(command);
    }
}