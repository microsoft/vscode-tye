// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { Subscription } from 'rxjs';
import { DebugSessionMonitor } from './debugSessionMonitor';
import { applicationComparer, TyeApplicationProvider } from '../services/tyeApplicationProvider';
import { attachToReplica } from './attachToReplica';
import { distinctUntilChanged, map } from 'rxjs/operators';

export interface TyeApplicationWatcher {
    watchApplication(applicationId: string, options?: { folder?: vscode.WorkspaceFolder, services?: string[] }): void;
}

export class TyeApplicationDebugSessionWatcher extends vscode.Disposable implements TyeApplicationWatcher {
    private readonly watchedApplications: { [key: string]: Subscription } = {};

    constructor(private readonly debugSessionMonitor: DebugSessionMonitor, private readonly tyeApplicationProvider: TyeApplicationProvider) {
        super(
            () => {
                for (const watchedApplicationId of Object.keys(this.watchedApplications)) {
                    this.stopWatching(watchedApplicationId);
                }
            }
        );
    }

    watchApplication(applicationId: string, options?: { folder?: vscode.WorkspaceFolder, services?: string[] }): void {
        const { folder, services } = options ?? {};

        this.watchedApplications[applicationId] =
            this.tyeApplicationProvider
                .applications
                .pipe(
                    map(applications => applications.find(application => application.id === applicationId)),
                    distinctUntilChanged(applicationComparer)
                )
                .subscribe(
                    application => {
                        if (application) {
                            for (const serviceName of Object.keys(application.projectServices ?? [])) {
                                if (services === undefined || services.includes(serviceName)) {
                                    const service = application.projectServices[serviceName];

                                    for (const replicaName of Object.keys(service.replicas)) {
                                        const currentPid = service.replicas[replicaName];

                                        void attachToReplica(this.debugSessionMonitor, folder, service.serviceType, replicaName, currentPid);
                                    }
                                }
                            }
                        } else {
                            this.stopWatching(applicationId);
                        }
                    });
    }

    private stopWatching(applicationId: string): void {
        const watchedApplication = this.watchedApplications[applicationId];

        if (watchedApplication) {                                  
            delete this.watchedApplications[applicationId];

            watchedApplication.unsubscribe();
        }
    }
}