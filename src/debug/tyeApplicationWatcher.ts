// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { Subscription } from 'rxjs';
import { DebugSessionMonitor } from './debugSessionMonitor';
import { TyeApplicationProvider } from '../services/tyeApplicationProvider';
import { getLocalizationPathForFile } from '../util/localization';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

export interface TyeApplicationWatcher {
    watchApplication(applicationName: string, options?: { folder?: vscode.WorkspaceFolder, services?: string[] }): void;
}

type WatchedApplication = {
    readonly folder?: vscode.WorkspaceFolder;
    readonly services?: string[];
};

export class TyeApplicationDebugSessionWatcher extends vscode.Disposable implements TyeApplicationWatcher {
    private readonly applications: { [key: string]: WatchedApplication } = {};
    private readonly subscription: Subscription;

    constructor(debugSessionMonitor: DebugSessionMonitor, tyeApplicationProvider: TyeApplicationProvider) {
        super(
            () => {
                this.subscription?.unsubscribe();
            });

        this.subscription =
            tyeApplicationProvider
                .applications
                .subscribe(
                    applications => {
                        for (const applicationName of Object.keys(this.applications)) {
                            const application = applications.find(a => a.name === applicationName);

                            if (application) {
                                if (application?.projectServices) {
                                    for (const serviceName of Object.keys(application.projectServices)) {
                                        const service = application.projectServices[serviceName];
                                        
                                        for (const replicaName of Object.keys(service.replicas)) {
                                            const currentPid = service.replicas[replicaName];
        
                                            if (currentPid !== undefined && !debugSessionMonitor.isAttached(currentPid)) {
                                                const watchedApplication = this.applications[applicationName];

                                                void vscode.debug.startDebugging(
                                                    watchedApplication.folder,
                                                    {
                                                        name: localize('debug.tyeDebugConfigurationProvider.sessionName', 'Tye Replica: {0}', replicaName),
                                                        type:'coreclr',
                                                        request:'attach',
                                                        processId: currentPid.toString()
                                                    });
                                            }
                                        }
                                    }
                                }
                            } else {
                                // Application is no longer running, stop watching...
                                delete this.applications[applicationName];
                            }
                        }
                    });
    }

    watchApplication(applicationName: string, options?: { folder?: vscode.WorkspaceFolder, services?: string[] }): void {
        const { folder, services } = options ?? {};

        this.applications[applicationName] = { folder, services };
    }
}