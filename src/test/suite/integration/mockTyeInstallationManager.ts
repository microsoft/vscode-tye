// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TyeInstallationManager } from '../../../services/tyeInstallationManager';

export default class MockTyeInstallationManager implements TyeInstallationManager {
    constructor(private readonly _isInstalled: boolean = true) {
    }

    ensureInstalled(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    ensureInstalledVersion(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    isInstalled(): Promise<boolean> {
        return Promise.resolve(this._isInstalled);
    }

    isVersionInstalled(): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
}