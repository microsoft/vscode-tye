// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TyeClient } from '../../../services/tyeClient';

export class MockTyeClient implements TyeClient {
    constructor(private readonly data: TyeService[]) {
    }

    public shutDown(): Promise<void> {
        return Promise.resolve();
    }

    public getLog(): Promise<string> {
        return Promise.resolve('');
    }

    public async getServices(): Promise<TyeService[]> {
        return await Promise.resolve(this.data);
    }
}
