// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as netstat from 'node-netstat';

const lsofCommand = {
    cmd: 'lsof',
    args: ['-Pn', '-i4', '-sTCP:LISTEN']
};

netstat.commands.darwin = lsofCommand;
netstat.commands.linux = lsofCommand;

function lsofCommandParser(line: string, callback: (item: netstat.ParsedItem) => void): void {
    const parts = line.split(/\s/).filter(String);
    if (!parts.length || (parts.length !== 9 && parts.length !== 10 )) {
        // We expect 9 or 10 columns of data; bail when not found...
        return;
    }

    let state = parts[9] || '';

    if (state.length >= 2 && state[0] === '(' && state[state.length - 1] === ')') {
        state = state.slice(1, state.length - 1);
    }

    const item = {
        protocol: parts[7],
        local: parts[8],
        remote: '',
        state,
        pid: parts[1]
    };

    return callback(netstat.utils.normalizeValues(item));
}


// NOTE: The TS definition incorrectly asserts that `darwin` and `linux` are const.
// TODO: Update the TS definitions.
(netstat.parsers.darwin as unknown) = lsofCommandParser;
(netstat.parsers.linux as unknown) = lsofCommandParser;

function netstatAsync(options: Omit<netstat.Options, 'done'>): Promise<netstat.ParsedItem[]> {
    return new Promise(
        (resolve, reject) => {
            const items: netstat.ParsedItem[] = [];

            netstat(
                {
                    ...options,
                    done:
                        error => {
                            if (error) {
                                reject(new Error(error));
                            } else {
                                resolve(items);
                            }
                        }
                },
                item => {
                    items.push(item);
                });
        });
}

export interface PortProvider {
    getPortsForProcess(pid: number): Promise<number[]>;
}

export default class LocalPortProvider implements PortProvider {
    async getPortsForProcess(pid: number): Promise<number[]> {
        const items = await netstatAsync({ filter: { pid, protocol: 'tcp' } });

        return items
            .map(item => item.local?.port)
            .filter((port: number | null): port is number => port !== null)
    }
}
