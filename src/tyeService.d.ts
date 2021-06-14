// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

interface TyeApplication {
    id: string;
    name: string;
    source: string;
}

interface TyeService {
    description: TyeDescription,
    replicas: {[key:string]: TyeReplica},
    serviceType: string;
}

interface TyeDescription {
    name: string
}

interface TyeReplica {
    name: string
    pid: number | undefined;
    environment: {[key:string]: string}
    ports: number[]
}