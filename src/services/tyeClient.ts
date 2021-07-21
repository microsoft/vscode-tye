// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { HttpClient } from './httpClient';

export interface TyeClient {
    getApplication(token?: vscode.CancellationToken): Promise<TyeApplication>;
    getEndpoints(token?: vscode.CancellationToken): Promise<string[]>;
    getLog(serviceName: string, token?: vscode.CancellationToken): Promise<string>;
    getServices(token?: vscode.CancellationToken): Promise<TyeService[] | undefined>;

    shutDown(token?: vscode.CancellationToken): Promise<void>;
}

export type TyeClientProvider = (dashboard: vscode.Uri | undefined) => (TyeClient | undefined);

export class HttpTyeClient implements TyeClient {
    constructor(private readonly httpClient: HttpClient, private readonly apiEndpoint = 'http://localhost:8000/api/v1') {
    }

    public async getApplication(token?: vscode.CancellationToken) : Promise<TyeApplication> {
        const resp = await this.httpClient.get(`${this.apiEndpoint}/application`, token);
        return resp.data as TyeApplication;
    }

    public async getEndpoints(token?: vscode.CancellationToken): Promise<string[]> {
        const resp = await this.httpClient.get(`${this.apiEndpoint}`, token);
        return resp.data as string[];
    }

    public async getLog(serviceName: string, token?: vscode.CancellationToken): Promise<string> {
        const resp = await this.httpClient.get(`${this.apiEndpoint}/logs/${serviceName}`, token);
        const ar:string[] = resp.data as string[];
        return ar.join('\n');
    }

    public async getServices(token?: vscode.CancellationToken) : Promise<TyeService[]> {
        const resp = await this.httpClient.get(`${this.apiEndpoint}/services`, token);
        return resp.data as TyeService[];
    }

    public async shutDown(token?: vscode.CancellationToken): Promise<void> {
        await this.httpClient.delete(`${this.apiEndpoint}/control`, token);
    }

    public static fromBaseEndpoint(httpClient: HttpClient, fromBaseEndpoint: vscode.Uri): HttpTyeClient {
        return new HttpTyeClient(httpClient, vscode.Uri.joinPath(fromBaseEndpoint, 'api', 'v1').toString());
    }
}

export function httpTyeClientProvider(httpClient: HttpClient): TyeClientProvider {
    return dashboard => {
        if (dashboard?.scheme === 'http' || dashboard?.scheme === 'https') {
            return HttpTyeClient.fromBaseEndpoint(httpClient, dashboard);
        }
        
        return undefined;
    };
}
