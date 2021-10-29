// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios, { CancelToken } from 'axios';
import * as vscode from 'vscode';

export interface HttpResponse {
    data: unknown;
}

export interface HttpPostOptions {
    json?: boolean;
}

export interface HttpClient {
    get(url: string, token?: vscode.CancellationToken): Promise<HttpResponse>;
    post(url: string, data?: unknown, options?: HttpPostOptions, token?: vscode.CancellationToken): Promise<HttpResponse>;
    delete(url: string, token?: vscode.CancellationToken) : Promise<void>
}

export default class AxiosHttpClient implements HttpClient {
    async get(url: string, token?: vscode.CancellationToken): Promise<HttpResponse> {
        return this.withCancellationToken(token, async (axiosToken) => {
            try {
                const response = await axios.get(url, { cancelToken: axiosToken });

                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                return { data: response.data };
            } catch(error) {
                return { data: undefined };
            }
        });
    }

    async post(url: string, data?: unknown, options?: HttpPostOptions, token?: vscode.CancellationToken): Promise<HttpResponse> {
        return this.withCancellationToken(token, async (axiosToken) => {
            const response = await axios.post(
                url,
                options?.json ? JSON.stringify(data) : data,
                {
                    cancelToken: axiosToken,
                    headers: options?.json ? { 'content-type': 'application/json' } : undefined
                });

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            return { data: response.data };
        });
    }

    async delete(url: string, token?: vscode.CancellationToken): Promise<void> {
        return this.withCancellationToken(token, async (axiosToken) => {
            await axios.delete(url, { cancelToken: axiosToken });
        });
    }

    async withCancellationToken<T>(token: vscode.CancellationToken | undefined, callback: (axiosToken: CancelToken) => Promise<T>): Promise<T>
    {
        const cancelTokenSource = axios.CancelToken.source();
        const tokenListener = token ? token.onCancellationRequested(() => cancelTokenSource.cancel()) : undefined;

        try {
            return await callback(cancelTokenSource.token);
        }
        finally {
            if (tokenListener) {
                tokenListener.dispose();
            }
        }
    }
}