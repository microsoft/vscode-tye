// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import CommandLineBuilder from '../util/commandLineBuilder';
import { Process } from '../util/process';
import * as nls from 'vscode-nls';
import { getLocalizationPathForFile } from '../util/localization';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

export interface InitOptions {
    readonly force?: boolean;
    readonly noDefault?: boolean;
    readonly path?: string;
}

export interface TyeCliClient {
    init(options?: InitOptions): Promise<void>;
    version(): Promise<string>;
}

export default class LocalTyeCliClient implements TyeCliClient {
    constructor(private readonly tyePathProvider: () => Promise<string>) {
    }

    async init(options?: InitOptions): Promise<void> {
        const tyePath = await this.tyePathProvider();
        const command =
            CommandLineBuilder
                .create(tyePath, 'init')
                .withFlagArg('--force', options?.force === true)
                .withFlagArg('--no-default', options?.noDefault === true)
                .withQuotedArg(options?.path)
                .build();

        const result = await Process.exec(command);

        if (result.code !== 0) {
            throw new Error(localize('services.tyeCliClient.initFailed', 'Initializing Tye failed: {0}', result.stderr));
        }
    }

    async version(): Promise<string> {
        const tyePath = await this.tyePathProvider();
        const command =
            CommandLineBuilder
                .create(tyePath, '--version')
                .build();

        const result = await Process.exec(command);

        if (result.code !== 0) {
            throw new Error(localize('services.tyeCliClient.versionFailed', 'Retrieving the tye CLI version failed: {0}', result.stderr));
        }

        return result.stdout;
    }
}