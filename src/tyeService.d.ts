// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

//TODO: We need to either write a translation layer to remove this any or
//change the Tye API. I think we should change the Tye API.
interface TyeService {
    description: TyeDescription,
    replicas: any;
    serviceType: string;
}

interface TyeDescription {
    name: string
}

interface TyeReplica {
    name:string
    pid:number
    environment: any
}