import { TyeClient } from '../../../services/tyeClient';
export class MockTyeClient implements TyeClient {
    constructor(private readonly data: TyeService[]) {
    }


    public async getServices(): Promise<TyeService[]> {
        return await Promise.resolve(this.data);
    }
}
