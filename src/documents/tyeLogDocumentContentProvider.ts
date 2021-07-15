// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { TyeApplicationProvider } from '../services/tyeApplicationProvider';
import { TyeClientProvider } from '../services/tyeClient';

export class TyeLogDocumentContentProvider extends vscode.Disposable implements vscode.TextDocumentContentProvider {
    private readonly onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    
    constructor(private readonly tyeApplicationProvider: TyeApplicationProvider, private readonly tyeClientProvider: TyeClientProvider) {
        super(() => this.onDidChangeEmitter.dispose());
    }

    //TODO: onDidChangeEmmitter.fire can cause the document to reload, need to work out if we want to hook that
    onDidChange = this.onDidChangeEmitter.event;

    async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Promise<string> {
        //
        // Tye Log URI Schema: tye-log://logs/<applicationId>/<service>
        //
        // NOTE: Using 'logs' as the authority is for the benefit of VS Code, which only displays the URI path in editor title.
        //

        // NOTE: VS Code doesn't close documents immediately after the editor is closed, but at some lazy future time.
        //       But, it also won't ask to provide content while the document is open, unless we notify it of change.
        //       So, if you immediately re-open the document in the editor, VS Code may show the same content.

        // NOTE: We expect '/<applicationId>/<service>[/...]'
        const splitPath = uri.path.split('/');

        if (splitPath.length >= 3) {
            const applicationId = splitPath[1];
            const service = splitPath[2];

            const applications = await this.tyeApplicationProvider.getApplications();
            const application = applications.find(app => app.id === applicationId);

            if (application) {
                const tyeClient = this.tyeClientProvider(application.dashboard);

                if (tyeClient) {
                    return await tyeClient.getLog(service, token);
                }
            }
        }

        throw new Error('Unable to retrieve Tye service log.');
    }
}