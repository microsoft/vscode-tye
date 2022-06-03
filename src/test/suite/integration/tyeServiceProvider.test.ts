// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import TyeReplicaNode from '../../../views/services/tyeReplicaNode';
import TyeServiceNode from '../../../views/services/tyeServiceNode';
import { TyeServicesTreeDataProvider } from '../../../views/services/tyeServicesTreeDataProvider';
import { TyeClient } from '../../../services/tyeClient';
import { MockTyeApplicationProvider } from './mockTyeApplicationProvider';
import { MockTyeClient } from './mockTyeClient';
import MockTyeInstallationManager from './mockTyeInstallationManager';
import MockUserInput from './mockUserInput';

suite('integration/tyeServiceProvider', () => {

    const testDataServiceCount = 5;

    async function buildTestClient(): Promise<TyeClient> {
        const data = JSON.parse(await fs.readFile(path.resolve(__dirname, '../../../../src/test/suite/integration/services.json'), 'utf8')) as  TyeService[];
        return new MockTyeClient(data);
    }

    async function buildTestProvider(): Promise<TyeServicesTreeDataProvider> {
        const testClient = await buildTestClient();

        return new TyeServicesTreeDataProvider(new MockTyeApplicationProvider(), () => testClient, new MockTyeInstallationManager(), new MockUserInput());
    }

    test('TestMockClient', async () => {
        const tyeClient = await buildTestClient();

        assert.equal((await tyeClient.getServices())?.length, testDataServiceCount);
    });

	test('TestServicesCollection', async () => {
        const provider = await buildTestProvider();

        const applicationItems = await provider.getChildren();

        assert.equal(applicationItems?.length, 1);

        const applicationItem = applicationItems[0];

        const serviceItems = await provider.getChildren(applicationItem);

        //Nodes in services.
        assert.equal(serviceItems?.length, testDataServiceCount);
    });

    test('browsableTaggedBrowsable', async () => {
        const provider = await buildTestProvider();

        const applicationItems = await provider.getChildren();

        for(const applicationItem of applicationItems?? []) {
            const serviceItems = await provider.getChildren(applicationItem);
            
            for(const serviceItem of serviceItems ?? []) {
                const children = await provider.getChildren(serviceItem);

                for(const replica of children ?? []) {
                    const treeItem = await replica.getTreeItem();
                    if(replica instanceof TyeReplicaNode && replica.isBrowsable) {
                        assert.equal(true, treeItem?.contextValue?.includes('browsable'));
                    } else {
                        assert.equal(true, !treeItem?.contextValue?.includes('browsable'));
                    }
                }
            }
        }
    });

    test('containersAreNotAttachable', async () => {
        const provider = await buildTestProvider();

        const treeItems = await provider.getChildren();

        for(const node of treeItems ?? []) {
            const children = await provider.getChildren(node as TyeServiceNode);
            for(const replica of children ?? []) {
                const treeItem = await replica.getTreeItem();
                if(replica instanceof TyeReplicaNode && replica.service.serviceType == 'container') {
                    assert.equal(false, treeItem.contextValue?.includes('attachable'));
                }
            }
        }
    });
});