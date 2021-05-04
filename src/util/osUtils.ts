/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as os from 'os';

export function isWindows(): boolean {
    return os.platform() === 'win32';
}

export function isMac(): boolean {
    return os.platform() === 'darwin';
}

export function isLinux(): boolean {
    return os.platform() !== 'win32' && os.platform() !== 'darwin';
}