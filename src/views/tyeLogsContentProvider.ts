// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as querystring from 'querystring';
import * as vscode from 'vscode';
import { TyeClientProvider } from 'src/services/tyeClient';

export class TyeLogsContentProvider implements vscode.TextDocumentContentProvider {
    
    constructor(private readonly tyeClientProvider: TyeClientProvider) {
    }

    //TODO: onDidChangeEmmitter.fire can cause the document to reload, need to work out if we want to hook that
    onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    onDidChange = this.onDidChangeEmitter.event;

    async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Promise<string> {
        // Tye Log URI Schema: tye-log://<service>?dashboard=<dashboard>
        //
        // TODO: Switch to something like: tye-log://<application>/<service>
        //       This requires the ability to map application names to dashboards (theoretically possible given Tye YAML schema),
        //       but requires a dashboard endpoint that returns the application name.

        const query = querystring.parse(uri.query);
        
        if (query.dashboard) {
            const dashboardString = Array.isArray(query.dashboard) ? query.dashboard[0] : query.dashboard;
            const dashboardUri = vscode.Uri.parse(dashboardString, true);

            if (dashboardUri) {
                const tyeClient = this.tyeClientProvider(dashboardUri);

                if (tyeClient) {
                    return await tyeClient.getLog(uri.authority, token);
                }
            }
        }

        throw new Error('Unable to retrieve Tye service log.');
    }
}