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
        return this.withCancellationToken(token, async (axiosToken, tokenListener) => {
            try {
                const response = await axios.get(url, { cancelToken: axiosToken });

                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                return { data: response.data };
            } catch(error) {
                return { data: undefined };
            } finally {
                if (tokenListener) {
                    tokenListener.dispose();
                }
            }
        });
    }

    async post(url: string, data?: unknown, options?: HttpPostOptions, token?: vscode.CancellationToken): Promise<HttpResponse> {
        return this.withCancellationToken(token, async (axiosToken, tokenListener) => {
            try {
                const response = await axios.post(
                    url,
                    options?.json ? JSON.stringify(data) : data,
                    {
                        cancelToken: axiosToken,
                        headers: {
                            'content-type': options?.json ? 'application/json' : undefined
                        }
                    });
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                return { data: response.data };
            } finally {
                if (tokenListener) {
                    tokenListener.dispose();
                }
            }
        });
    }

    async delete(url: string, token?: vscode.CancellationToken): Promise<void> {
        return this.withCancellationToken(token, async (axiosToken, tokenListener) => {
            try {
                await axios.delete(url, { cancelToken: axiosToken });
            }
            finally {
                if (tokenListener) {
                    tokenListener.dispose();
                }
            }
        });
    }

    async withCancellationToken<T>(token: vscode.CancellationToken | undefined, callback: (axiosToken: CancelToken, tokenListener: vscode.Disposable | undefined) => Promise<T>): Promise<T>
    {
        const cancelTokenSource = axios.CancelToken.source();
        const tokenListener = token ? token.onCancellationRequested(() => cancelTokenSource.cancel()) : undefined;
        return callback(cancelTokenSource.token, tokenListener);
    }
}