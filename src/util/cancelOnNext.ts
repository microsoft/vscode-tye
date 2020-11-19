import * as vscode from 'vscode';

type CancellableTask<T> = (token?: vscode.CancellationToken) => Promise<T>;

export function cancelOnNext<T>(task: CancellableTask<T>): () => Promise<T> {
    return task;
}
