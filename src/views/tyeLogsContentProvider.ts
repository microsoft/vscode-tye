// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import AxiosHttpClient from '../services/httpClient';

export class TyeLogsContentProvider implements vscode.TextDocumentContentProvider {
    
    constructor(private readonly httpClient: AxiosHttpClient) {
    }

    //TODO: onDidChangeEmmitter.fire can cause the document to reload, need to work out if we want to hook that
    onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    onDidChange = this.onDidChangeEmitter.event;

    async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Promise<string> {
        const resp = await this.httpClient.get(`http://localhost:8000/api/v1/logs/${uri.path}`, token);
        const ar:string[] = resp.data as string[];
        return ar.join('\n');
    }
}