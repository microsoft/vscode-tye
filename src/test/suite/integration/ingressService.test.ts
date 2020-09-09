// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as assert from 'assert';
import * as fse from 'fs-extra';
import * as path from 'path';

import { TyeClient } from '../../../services/tyeClient';
import { TyeServicesProvider, ReplicaNode, ServiceNode } from '../../../views/tyeServicesProvider';
import { MockTyeClient } from './mockTyeClient';

suite('integration/ingressServiceTests', () => {

    const testDataServiceCount = 3;

    async function buildTestClient(): Promise<TyeClient> {
        const data = JSON.parse(await fse.readFile(path.resolve(__dirname, '../../../../src/test/suite/integration/ingressServices.json'), 'utf8')) as TyeService[];
        return new MockTyeClient(data);
    }

    async function buildTestProvider(): Promise<TyeServicesProvider> {
        return new TyeServicesProvider([], await buildTestClient());
    }

    test('TestMockClient', async () => {
        const tyeClient = await buildTestClient();

        assert.equal((await tyeClient.getServices()).length, testDataServiceCount);
    });

	test('TestServicesCollection', async () => {
        const provider = await buildTestProvider();

        const treeItems = await provider.getChildren();
        //Nodes in services + 1 Dashboard node.
        assert.equal(treeItems.length, testDataServiceCount + 1);
    });

    test('ingressIsBrowsable', async () => {
        const provider = await buildTestProvider();

        const treeItems = await provider.getChildren();

        for(const node of treeItems) {
            const children = await provider.getChildren(node as ServiceNode);
            for(const replica of children) {
                if(replica instanceof ReplicaNode && replica.service.serviceType == "ingress") {
                    assert.equal(true, replica.contextValue?.includes('browsable'));
                    assert.equal(false, replica.contextValue?.includes('attachable'));
                }
            }
        }
    });
});