// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IActionContext } from "vscode-azureextensionui";

export async function initializeTye(context: IActionContext): Promise<void> {
    return Promise.resolve();
}

const createInitializeTyeCommand = () => (context: IActionContext): Promise<void> => initializeTye(context);

export default createInitializeTyeCommand;
