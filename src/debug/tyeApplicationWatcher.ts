// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { Subscription } from 'rxjs';
import { DebugSessionMonitor } from './debugSessionMonitor';
import { TyeApplicationProvider } from '../services/tyeApplicationProvider';
import { attachToReplica } from './attachToReplica';

export interface TyeApplicationWatcher {
    watchApplication(applicationId: string, options?: { folder?: vscode.WorkspaceFolder, services?: string[] }): void;
}

type WatchedApplication = {
    readonly folder?: vscode.WorkspaceFolder;
    readonly services?: string[];
};

export class TyeApplicationDebugSessionWatcher extends vscode.Disposable implements TyeApplicationWatcher {
    private readonly watchedApplications: { [key: string]: WatchedApplication } = {};
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
                        for (const watchedApplicationId of Object.keys(this.watchedApplications)) {
                            const application = applications.find(a => a.id === watchedApplicationId);

                            if (application) {
                                // Application is still running, see if new replicas need attaching to...

                                if (application.projectServices === undefined) {
                                    continue;
                                }

                                const watchedApplication = this.watchedApplications[watchedApplicationId];

                                for (const serviceName of Object.keys(application.projectServices)) {
                                    if (watchedApplication.services === undefined || watchedApplication.services.includes(serviceName)) {
                                        const service = application.projectServices[serviceName];

                                        for (const replicaName of Object.keys(service.replicas)) {
                                            const currentPid = service.replicas[replicaName];

                                            void attachToReplica(debugSessionMonitor, watchedApplication.folder, service.serviceType, replicaName, currentPid);
                                        }
                                    }
                                }
                            } else {
                                // Application is no longer running, stop watching...
                                delete this.watchedApplications[watchedApplicationId];
                            }
                        }
                    });
    }

    watchApplication(applicationId: string, options?: { folder?: vscode.WorkspaceFolder, services?: string[] }): void {
        const { folder, services } = options ?? {};

        this.watchedApplications[applicationId] = { folder, services };
    }
}