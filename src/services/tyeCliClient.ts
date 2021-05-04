// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import CommandLineBuilder from '../util/commandLineBuilder';
import { Process } from '../util/process';

export interface InitOptions {
    readonly force?: boolean;
    readonly noDefault?: boolean;
    readonly path?: string;
}

export interface TyeCliClient {
    init(options?: InitOptions): Promise<void>;
}

export default class LocalTyeCliClient implements TyeCliClient {
    async init(options?: InitOptions): Promise<void> {
        const command =
            CommandLineBuilder
                .create('tye init')
                .withFlagArg('--force', options?.force === true)
                .withFlagArg('--no-default', options?.noDefault === true)
                .withQuotedArg(options?.path)
                .build();

        await Process.exec(command);
    }
}