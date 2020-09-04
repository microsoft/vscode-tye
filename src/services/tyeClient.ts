// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import AxiosHttpClient from "./httpClient";

export interface TyeClient {
    getServices(uri?: string) : Promise<TyeService[]>;
}

export class HttpTyeClient implements TyeClient {

    constructor(private readonly httpClient: AxiosHttpClient) {}

    public async getServices(uri = 'http://localhost:8000/api/v1/services') : Promise<TyeService[]> {
        const resp = await this.httpClient.get(uri);
        return resp.data as TyeService[];
    }
}