// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import mdns = require('multicast-dns');
import { fromEvent, Observable } from 'rxjs';

export class MdnsClient extends vscode.Disposable{
    private readonly instance = mdns();

    constructor() {
        super(
            () => {
                this.instance.destroy();
            });

            this.packets = fromEvent<[mdns.MdnsPacket, mdns.MdnsResponseInfo]>(this.instance, 'response');
        }

    public readonly packets: Observable<[mdns.MdnsPacket, mdns.MdnsResponseInfo]>;

    query(query: mdns.MdnsQuery): Promise<void> {
        return new Promise(
            (resolve, reject) => {
                this.instance.query(
                    query,
                    (err: Error | undefined) => {
                        if (err) {
                            return reject(err);
                        } else {
                            return resolve();
                        }
                    });
            });
    }
}
