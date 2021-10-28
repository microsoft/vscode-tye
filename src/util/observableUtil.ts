// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { Observable } from 'rxjs';
import * as nls from 'vscode-nls';
import { getLocalizationPathForFile } from '../util/localization';

const localize = nls.loadMessageBundle(getLocalizationPathForFile(__filename));

export function observableFromCancellationToken<T = void>(cancellationToken: vscode.CancellationToken): Observable<T> {
    return new Observable<T>(
        subscriber => {
            const listener = cancellationToken.onCancellationRequested(
                () => {
                    subscriber.error(new Error(localize('util.observableUtil.cancellationRequested', 'Cancellation was requested.')));
                });

            return () => {
                listener.dispose()
            };
        });
}
