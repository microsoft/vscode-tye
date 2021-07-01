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

class WatchedApplication extends vscode.Disposable {
    private readonly subscription: Subscription;

    constructor(
        debugSessionMonitor: DebugSessionMonitor,
        tyeApplicationProvider: TyeApplicationProvider,
        applicationId: string,
        folder: vscode.WorkspaceFolder | undefined,
        services: string[] | undefined,
        onStopped: (watchedApplication: WatchedApplication) => void) {
        super(
            () => {
                this.subscription?.unsubscribe();
            });

        this.subscription =
            tyeApplicationProvider
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

                                        void attachToReplica(debugSessionMonitor, folder, service.serviceType, replicaName, currentPid);
                                    }
                                }
                            }
                        } else {
                            onStopped(this);
                        }
                    });
    }
}

export class TyeApplicationDebugSessionWatcher extends vscode.Disposable implements TyeApplicationWatcher {
    private readonly watchedApplications: { [key: string]: WatchedApplication } = {};

    constructor(private readonly debugSessionMonitor: DebugSessionMonitor, private readonly tyeApplicationProvider: TyeApplicationProvider) {
        super(
            () => {
                for (const watchedApplicationId of Object.keys(this.watchedApplications)) {
                    const watchedApplication = this.watchedApplications[watchedApplicationId];

                    if (watchedApplication) {                                  
                        delete this.watchedApplications[watchedApplicationId];

                        watchedApplication.dispose();
                    }
                }
            }
        );
    }

    watchApplication(applicationId: string, options?: { folder?: vscode.WorkspaceFolder, services?: string[] }): void {
        const { folder, services } = options ?? {};

        this.watchedApplications[applicationId] =
            new WatchedApplication(
                this.debugSessionMonitor,
                this.tyeApplicationProvider,
                applicationId,
                folder,
                services,
                watchedApplication => {
                    delete this.watchedApplications[applicationId];

                    watchedApplication.dispose();
                });
    }
}