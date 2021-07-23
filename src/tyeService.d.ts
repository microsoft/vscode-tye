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
    serviceSource: 'configuration' | 'extension' | 'host';
    serviceType: 'external' | 'project' | 'executable' | 'container' | 'function' | 'ingress';
}

interface TyeRunInfo {
    type: 'external' | 'project' | 'executable' | 'container' | 'function' | 'ingress' | 'node';
}

interface TyeBinding {
    protocol: string
}

interface TyeDescription {
    name: string
    bindings: TyeBinding[]
    runInfo: TyeRunInfo
}

interface TyeReplica {
    name: string
    pid: number | undefined;
    environment: {[key:string]: string}
    ports: number[]
}