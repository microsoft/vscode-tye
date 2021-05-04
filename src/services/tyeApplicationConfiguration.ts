// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { load } from 'js-yaml';
import { TextDecoder } from 'util';

export interface TyeApplicationConfiguration {
    readonly name: string;
}

export interface TyeApplicationConfigurationReader {
    readConfiguration(content: string): Promise<TyeApplicationConfiguration>;
}

export class YamlTyeApplicationConfigurationReader implements TyeApplicationConfigurationReader {
    readConfiguration(content: string): Promise<TyeApplicationConfiguration> {
        return Promise.resolve(load(content) as TyeApplicationConfiguration);
    }
}

export interface ProvidedTyeApplicationConfiguration {
    file: vscode.Uri;
    folder: vscode.WorkspaceFolder;

    getConfiguration(): Promise<TyeApplicationConfiguration>;
}

export interface TyeApplicationConfigurationProvider {
    getConfigurations(): Promise<ProvidedTyeApplicationConfiguration[]>;
}

export class WorkspaceTyeApplicationConfigurationProvider implements TyeApplicationConfigurationProvider {
    constructor(private readonly configurationReader: TyeApplicationConfigurationReader) {
    }

    async getConfigurations(): Promise<ProvidedTyeApplicationConfiguration[]> {
        const files = await vscode.workspace.findFiles('tye.yaml');

        return files.map(file => ({
            file,
            // NOTE: By definition, getWorkspaceFolder() will return a valid folder.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            folder: vscode.workspace.getWorkspaceFolder(file)!,
            getConfiguration: async () => {
                const content = await vscode.workspace.fs.readFile(file);
                const contentString = new TextDecoder('utf8').decode(content);

                let configuration = await this.configurationReader.readConfiguration(contentString);

                if (!configuration.name)
                {
                    configuration = { ...configuration, name: vscode.workspace.getWorkspaceFolder(file)?.name?.toLowerCase() || '' };
                }

                return configuration;
            }
        }));

        return Promise.resolve<ProvidedTyeApplicationConfiguration[]>([]);
    }
}