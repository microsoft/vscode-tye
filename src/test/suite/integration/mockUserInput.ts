// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { QuickPickItem, MessageItem } from 'vscode';
import { UserInput } from '../../../services/userInput';

export default class MockUserInput implements UserInput {
    executeCommand(): Promise<void> {
        return Promise.resolve();
    }

    openExternal(): Promise<boolean> {
        throw new Error('Method not implemented.');
    }

    showInputBox(): Promise<string> {
        throw new Error('Method not implemented.');
    }

    showIssueReporter(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    showQuickPick<T extends QuickPickItem>(): Promise<T> {
        throw new Error('Method not implemented.');
    }

    showWarningMessage<T extends MessageItem>(): Promise<T> {
        throw new Error('Method not implemented.');
    }

    showWizard<T>(): Promise<T> {
        throw new Error('Method not implemented.');
    }

    withProgress<T>(): Promise<T> {
        throw new Error('Method not implemented.');
    }
}