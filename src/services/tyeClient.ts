// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { HttpClient } from "./httpClient";

export interface TyeClient {
    getServices(token?: vscode.CancellationToken) : Promise<TyeService[]>;
}

export class HttpTyeClient implements TyeClient {

    constructor(private readonly httpClient: HttpClient, private readonly uri = 'http://localhost:8000/api/v1/services') {
    }

    public async getServices(token?: vscode.CancellationToken) : Promise<TyeService[]> {
        const resp = await this.httpClient.get(this.uri, token);
        return resp.data as TyeService[];
    }
}