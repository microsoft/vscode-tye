import { TyeApplication, TyeApplicationProvider } from "src/services/tyeApplicationProvider";
import * as vscode from 'vscode';

export class MockTyeApplicationProvider implements TyeApplicationProvider{
    private readonly applicationsChangedEmitter = new vscode.EventEmitter<TyeApplication[]>();

    get applications(): TyeApplication[] {
        return [];
    }

    get applicationsChanged(): vscode.Event<TyeApplication[]> {
        return this.applicationsChangedEmitter.event;
    }
}