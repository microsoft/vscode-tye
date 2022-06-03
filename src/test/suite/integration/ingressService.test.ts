// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import TyeReplicaNode from '../../../views/services/tyeReplicaNode';
import { TyeServicesTreeDataProvider } from '../../../views/services/tyeServicesTreeDataProvider';
import { TyeClient } from '../../../services/tyeClient';
import { MockTyeApplicationProvider } from './mockTyeApplicationProvider';
import { MockTyeClient } from './mockTyeClient';
import MockTyeInstallationManager from './mockTyeInstallationManager';
import MockUserInput from './mockUserInput';

suite('integration/ingressServiceTests', () => {

    const testDataServiceCount = 3;

    async function buildTestClient(): Promise<TyeClient> {
        const data = JSON.parse(await fs.readFile(path.resolve(__dirname, '../../../../src/test/suite/integration/ingressServices.json'), 'utf8')) as TyeService[];
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

        const treeItems = await provider.getChildren();

        assert.equal(treeItems?.length, 1);

        const applicationTreeItem = treeItems[0];

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const serviceTreeItems = await applicationTreeItem.getChildren!();

        //Nodes in services.
        assert.equal(serviceTreeItems?.length, testDataServiceCount);
    });

    test('ingressIsBrowsable', async () => {
        const provider = await buildTestProvider();

        const applicationItems = await provider.getChildren();

        for(const applicationItem of applicationItems ?? []) {
            const serviceItems = await provider.getChildren(applicationItem);

            for(const serviceItem of serviceItems ?? []) {
                const children = await provider.getChildren(serviceItem);

                for(const replica of children ?? []) {
                    if(replica instanceof TyeReplicaNode && replica.service.serviceType == 'ingress') {
                        const treeItem = replica.getTreeItem();
                        assert.equal(true, treeItem.contextValue?.includes('browsable'));
                        assert.equal(false, treeItem.contextValue?.includes('attachable'));
                    }
                }
            }
        }
    });
});