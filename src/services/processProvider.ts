// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from 'fs';
import * as path from 'path';
import * as psList from 'ps-list';
import * as os from 'os';
import { Process } from '../util/process';

export interface ProcessInfo {
    cmd: string;
    name: string;
    pid: number;
}

export interface ProcessProvider {
    listProcesses(filePath: string): Promise<ProcessInfo[]>;
}

// TODO: Consider making async.
function isFile(path: string): boolean {
    try {
        const stats = fs.statSync(path);

        return stats.isFile();
    } catch (e) {
        return false;
    }
}

export class UnixProcessProvider implements ProcessProvider {
    async listProcesses(filePath: string): Promise<ProcessInfo[]> {
        const processes = await psList();
        
        const fileName = path.basename(filePath);
        const regex = new RegExp(`^(?<path>.*/${fileName}) `);

        return processes
            .filter(
                process => {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const cmd = process.cmd!;

                    if (process.name === fileName
                        || cmd.startsWith(`${fileName} `)
                        || cmd.startsWith(`${filePath} `)) {
                        return true;
                    }

                    const match = regex.exec(cmd);

                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    if (match && isFile(match.groups!['path'])) {
                        return true;
                    }

                    return false;
                })
            .map(process => ({ name: process.name, cmd: process.cmd ?? '', pid: process.pid }));
    }
}

interface WmiWin32ProcessObject {
    readonly CommandLine: string | null;
    readonly Name: string;
    readonly ProcessId: number;
}

export class WindowsProcessProvider implements ProcessProvider {
    async listProcesses(filePath: string): Promise<ProcessInfo[]> {
        // WMIC lists processes by file name regardless of its full path.
        const fileName = path.basename(filePath);

        const list = await Process.exec(
            `Get-WmiObject -Query "select CommandLine, Name, ProcessId from win32_process where Name='${fileName}' or Name='${fileName}.exe'" | Select-Object -Property CommandLine, Name, ProcessId | ConvertTo-Json`,
            {
                shell: 'powershell.exe'
            });

        if (list.code === 0 && list.stdout.length) {
            let output: WmiWin32ProcessObject[];

            try {
                const json: unknown = JSON.parse(list.stdout);

                // NOTE: ConvertTo-Json returns a single JSON object when given a single object rather than a collection.
                //       The -AsArray argument isn't available until PowerShell 7.0 and later.

                if (Array.isArray(json)) {
                    output = <WmiWin32ProcessObject[]>json;
                } else {
                    output = [<WmiWin32ProcessObject>json];
                }
                
                return output.map(o => ({ cmd: o.CommandLine ?? '', name: o.Name, pid: o.ProcessId }));
            }
            catch {       
                // NOTE: No-op.                         
            }
        }

        return [];
    }
}

export default function createPlatformProcessProvider(): ProcessProvider {
    if (os.platform() === 'win32') {
        return new WindowsProcessProvider();
    } else {
        return new UnixProcessProvider();
    }
}