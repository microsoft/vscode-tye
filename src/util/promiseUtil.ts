// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export function awaitWithTimeout<T>(timeout: number, promise: Promise<T>, timedoutMessage?: string) : Promise<void> {
    let timeoutHandle: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((resolve, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(timedoutMessage)), timeout);
    });

    const result = Promise.race([
        promise,
        timeoutPromise,
    ]).then(() => {
        clearTimeout(timeoutHandle);
    });

    return result;
}