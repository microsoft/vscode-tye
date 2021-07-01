// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TyeApplication, TyeApplicationProvider } from '../../../services/tyeApplicationProvider';
import { BehaviorSubject, Observable } from 'rxjs';
import * as vscode from 'vscode';

export class MockTyeApplicationProvider implements TyeApplicationProvider{
    private static Applications: TyeApplication[] = [
        {
            dashboard: vscode.Uri.parse('http://localhost:8000'),
            id: '1234',
            name: 'app',
            projectServices: {}
        }
    ];

    private readonly applicationsChangedEmitter = new vscode.EventEmitter<TyeApplication[]>();

    private readonly _applications = new BehaviorSubject<TyeApplication[]>(MockTyeApplicationProvider.Applications);

    get applications(): Observable<TyeApplication[]> {
        return this._applications;
    }

    getApplications(): Promise<TyeApplication[]> {
        return Promise.resolve(MockTyeApplicationProvider.Applications);
    }
}