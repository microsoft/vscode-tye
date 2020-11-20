// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TyeApplication, TyeApplicationProvider } from "src/services/tyeApplicationProvider";
import { Observable } from 'rxjs';
import * as vscode from 'vscode';

export class MockTyeApplicationProvider implements TyeApplicationProvider{
    private readonly applicationsChangedEmitter = new vscode.EventEmitter<TyeApplication[]>();

    private readonly _applications = new Observable<TyeApplication[]>();

    get applications(): Observable<TyeApplication[]> {
        return this._applications;
    }
}