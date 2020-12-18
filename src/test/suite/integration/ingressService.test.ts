// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as assert from 'assert';
import * as fse from 'fs-extra';
import * as path from 'path';
import { TyeServicesTreeDataProvider } from 'src/views/services/servicesTreeDataProvider';
import { TyeReplicaNode } from 'src/views/services/tyeReplicaNode';

import { TyeClient } from '../../../services/tyeClient';
import { MockTyeApplicationProvider } from './mockTyeApplicationProvider';
import { MockTyeClient } from './mockTyeClient';

suite('integration/ingressServiceTests', () => {

    const testDataServiceCount = 3;

    async function buildTestClient(): Promise<TyeClient> {
        const data = JSON.parse(await fse.readFile(path.resolve(__dirname, '../../../../src/test/suite/integration/ingressServices.json'), 'utf8')) as TyeService[];
        return new MockTyeClient(data);
    }

    async function buildTestProvider(): Promise<TyeServicesTreeDataProvider> {
        const testClient = await buildTestClient();
        return new TyeServicesTreeDataProvider(new MockTyeApplicationProvider(), () => testClient);
    }

    test('TestMockClient', async () => {
        const tyeClient = await buildTestClient();

        assert.equal((await tyeClient.getServices())?.length, testDataServiceCount);
    });

	test('TestServicesCollection', async () => {
        const provider = await buildTestProvider();

        const treeItems = await provider.getChildren();
        //Nodes in services + 1 Dashboard node.
        assert.equal(treeItems?.length, testDataServiceCount + 1);
    });

    test('ingressIsBrowsable', async () => {
        const provider = await buildTestProvider();

        const treeItems = await provider.getChildren();

        for(const node of (treeItems ?? [])) {
            const children = await provider.getChildren(node);
            for(const replica of (children ?? [])) {
                if(replica instanceof TyeReplicaNode && replica.service.serviceType == "ingress") {
                    const treeItem = await replica.getTreeItem();
                    assert.equal(true, treeItem.contextValue?.includes('browsable'));
                    assert.equal(false, treeItem.contextValue?.includes('attachable'));
                }
            }
        }
    });
});