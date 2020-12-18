// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import isEqual = require('lodash.isequal');
import { defer, Observable } from 'rxjs';
import { distinctUntilChanged, filter, map, publishReplay, refCount, startWith, scan } from 'rxjs/operators';
import { MdnsClient } from './mdnsClient';

export interface MdnsService {
    address: string;
    fqdn: string;
    name: string;
    port: number;
    text: string[];
}

export interface MdnsServiceProvider {
    createClient(type: string): MdnsServiceClient;
}

export interface MdnsServiceClient {
    readonly services: Observable<MdnsService[]>;

    dispose(): void;
}

function isAddressAnswer(answer: mdns.MdnsAnswer): answer is mdns.MdnsAddressAnswer {
    return answer.type === 'A';
}

function isPointerAnswer(answer: mdns.MdnsAnswer): answer is mdns.MdnsPointerAnswer {
    return answer.type === 'PTR';
}

function isServerAnswer(answer: mdns.MdnsAnswer): answer is mdns.MdnsServerAnswer {
    return answer.type === 'SRV';
}

function isTextAnswer(answer: mdns.MdnsAnswer): answer is mdns.MdnsTextAnswer {
    return answer.type === 'TXT';
}

class MulticastDnsMdnsServiceClient extends vscode.Disposable implements MdnsServiceClient {
    private readonly instance = new MdnsClient();

    constructor(private type: string) {
        super(() => {
            this.instance.dispose();
        });

        this.services = 
                defer(
                    () => {
                        // TODO: Is this the best way (i.e. the right ordering)?
                        //       Perhaps use setTimeout() to queue query() after return of observable.
                        void this.instance.query(
                            {
                                questions: [
                                    {
                                        name: this.type,
                                        type: 'PTR'
                                    }
                                ]
                            });

                        return this.instance.packets;
                    })
                    .pipe(
                        // Filter out responses that do not include answers to our query (to avoid unnecessary churn downstream)...
                        filter(response => response[0].answers.some(answer => isPointerAnswer(answer) && answer.name === this.type)),
                        scan(
                            (knownServices, response) => {
                                const packet = response[0];

                                const upServices: MdnsService[] = [];
                                const downServices: string[] = [];

                                packet
                                    .answers
                                    .filter(answer => answer.name === this.type)
                                    .filter(isPointerAnswer)
                                    .forEach(answer => {
                                        const name = answer.data;

                                        if (answer.ttl) {
                                            upServices.push({ address: '', fqdn: '', name, port: 0, text: [] });
                                        } else {
                                            downServices.push(name);
                                        }
                                    });

                                upServices.forEach(service => {
                                    packet
                                        .answers
                                        .concat(packet.additionals)
                                        .filter(answer => answer.name === service.name)
                                        .filter(isServerAnswer)
                                        .forEach(answer => {
                                            service.fqdn = answer.data.target;
                                            service.port = answer.data.port;
                                        });

                                    packet
                                        .answers
                                        .concat(packet.additionals)
                                        .filter(answer => answer.name === service.name)
                                        .filter(isTextAnswer)
                                        .forEach(answer => {
                                            service.text = answer.data.map(buffer => buffer.toString());
                                        });

                                    packet
                                        .answers
                                        .concat(packet.additionals)
                                        .filter(answer => answer.name === service.fqdn)
                                        .filter(isAddressAnswer)
                                        .forEach(answer => {
                                            service.address = answer.data;
                                        });

                                    // TODO: Are we sure fqdn assures the others are populated?
                                    if (service.fqdn && !knownServices[service.name]) {
                                        knownServices[service.name] = service;
                                    }
                                });

                                downServices.forEach(name => {
                                    const service = knownServices[name];
                                    
                                    if (service) {
                                        delete knownServices[name];
                                    }
                                });

                                return knownServices;
                            },
                            <{ [key: string]: MdnsService }>{}),
                            map(services => Object.values(services)),
                            distinctUntilChanged(isEqual),
                    )
                    .pipe(
                        startWith([]),
                        publishReplay(1),
                        refCount()
                    );
    }

    public readonly services: Observable<MdnsService[]>;
}

export default class MulticastDnsMdnsProvider implements MdnsServiceProvider {
    createClient(type: string): MdnsServiceClient {
        return new MulticastDnsMdnsServiceClient(type);
    }
}