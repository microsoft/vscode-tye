// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { Observable } from 'rxjs'
import { first, switchMap } from 'rxjs/operators';
import { TyeClientProvider } from './tyeClient';
import { MdnsService, MdnsServiceClient, MdnsServiceProvider } from './mdnsProvider';

export type TyeProjectService = {
    replicas: { [key: string]: number | undefined };
};

export type TyeApplication = {
    readonly dashboard?: vscode.Uri;
    readonly name?: string;
    readonly projectServices?: { [key: string]: TyeProjectService };
};

export interface TyeApplicationProvider {
    readonly applications: Observable<TyeApplication[]>;

    getApplications(): Promise<TyeApplication[]>;
}

type TyeRunTaskOptions = {
    readonly applicationName: string;
    readonly dashboard?: vscode.Uri;
};

export class MdnsBasedTyeApplicationProvider extends vscode.Disposable implements TyeApplicationProvider {
    private readonly mdnsServiceClient: MdnsServiceClient;

    constructor(private readonly mdnsServiceProvider: MdnsServiceProvider, private readonly tyeClientProvider: TyeClientProvider) {
        super(
            () => {
                this.mdnsServiceClient.dispose();
            });

        this.mdnsServiceClient = mdnsServiceProvider.createClient('_microsoft-tye._tcp.local');

        this.applications =
            this.mdnsServiceClient.services
            .pipe(switchMap(services => this.toApplications(services)));
    }

    public readonly applications: Observable<TyeApplication[]>;

    getApplications(): Promise<TyeApplication[]> {
        return this.applications.pipe(first()).toPromise();
    }

    private async toApplications(services: MdnsService[]): Promise<TyeApplication[]> {
        let applications =
            services
                .map(service => MdnsBasedTyeApplicationProvider.toApplication(service));

        if (applications.length === 0) {
            applications = [
                { dashboard: vscode.Uri.parse('http://localhost:8000') }
            ];
        }

        return await Promise.all(applications.map(application => this.withPids(application)));
    }

    private async withPids(application: TyeApplication): Promise<TyeApplication> {
        const tyeClient = this.tyeClientProvider(application.dashboard);

        if (tyeClient) {
            let services: TyeService[] | undefined;
            
            try {
                services = await tyeClient.getServices();
            } catch {
                services = undefined;
            }

            const projectServices =
                (services ?? [])
                    .filter(service => service.serviceType === 'project')
                    .reduce<{ [key: string]: TyeProjectService }>(
                        (serviceMap, service) => {
                            serviceMap[service.description.name] = {
                                replicas:
                                    Object.keys(service.replicas)
                                        .reduce<{ [key: string]: number }>(
                                            (replicaMap, replicaName) => {
                                                replicaMap[replicaName] = service.replicas[replicaName].pid;
                                                return replicaMap;
                                            },
                                            {})
                            };
                            return serviceMap;
                        },
                        {});

            return { ...application, projectServices };
        }

        return application;
    }

    private static toApplication(service: MdnsService): TyeApplication {
        return {
            // TODO: Use FQDN or address?
            dashboard: vscode.Uri.parse(`http://localhost:${service.port}`),
            name: service.name
        };
    }
}
