// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as cp from 'child_process';
import * as os from 'os';
import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import * as localization from './localization';

const localize = nls.loadMessageBundle(localization.getLocalizationPathForFile(__filename));

const DEFAULT_BUFFER_SIZE = 10 * 1024; // The default Node.js `exec` buffer size is 1 MB, our actual usage is far less

function bufferToString(buffer: Buffer): string {
    // Node.js treats null bytes as part of the length, which makes everything mad
    // There's also a trailing newline everything hates, so we'll remove
    return buffer.toString().replace(/\0/g, '').replace(/\r?\n$/g, '');
}

export class ProcessCancellationOptions
{
    constructor(public readonly waitForProcessClose: boolean, public readonly waitForProcessCloseTimeout?: number) {
    }
}

export type OnBeforeProcessCancelledCallback = () => Promise<ProcessCancellationOptions>;

export class Process extends vscode.Disposable {
    private readonly onStdErrEmitter = new vscode.EventEmitter<string>();
    private readonly onStdOutEmitter = new vscode.EventEmitter<string>();

    constructor() {
        super(
            () => {
                this.onStdErrEmitter.dispose();
                this.onStdOutEmitter.dispose();
            });
    }

    onStdErr = this.onStdErrEmitter.event;
    onStdOut = this.onStdOutEmitter.event;

    static async exec(command: string, options?: cp.ExecOptions, onBeforeProcessCancelled?: OnBeforeProcessCancelledCallback, token?: vscode.CancellationToken): Promise<{ code: number; stderr: string; stdout: string }> {
        const process = new Process();

        let stdoutBytesWritten = 0;
        let stderrBytesWritten = 0;

        const stdoutBuffer = Buffer.alloc(options && options.maxBuffer || DEFAULT_BUFFER_SIZE);
        const stderrBuffer = Buffer.alloc(options && options.maxBuffer || DEFAULT_BUFFER_SIZE);

        try {
            process.onStdErr(
                data => {
                    stderrBytesWritten += stderrBuffer.write(data, stderrBytesWritten);
                });

            process.onStdOut(
                data => {
                    stdoutBytesWritten += stdoutBuffer.write(data, stdoutBytesWritten);
                });

            const code = await process.spawn(command, options, onBeforeProcessCancelled, token);

            return {
                code,
                stderr: bufferToString(stderrBuffer),
                stdout: bufferToString(stdoutBuffer)
            };
        } finally {
            process.dispose();
        }
    }

    spawn(command: string, options?: cp.SpawnOptions, onBeforeProcessCancelled?: OnBeforeProcessCancelledCallback, token?: vscode.CancellationToken): Promise<number> {
        return new Promise(
            (resolve, reject) => {

                // Without the shell option, it pukes on arguments
                options = options || {};
                options.shell = true;

                const process = cp.spawn(command, options);

                process.on(
                    'error',
                    err => {
                        return reject(err);
                    });

                process.on(
                    'exit',
                    (code?: number, signal?: string) => {
                        if (code !== undefined) {
                            return resolve(code);
                        } else {
                            return reject(new Error(localize('util.process.exitErrorMessage', 'Process exited due to signal \'{0}\'.', signal)));
                        }
                    });

                if (process.stderr) {
                    process.stderr.on(
                        'data',
                        (data: string | Buffer) => {
                            this.onStdErrEmitter.fire(data.toString());
                        });
                }

                if (process.stdout) {
                    process.stdout.on(
                        'data',
                        (data: string | Buffer) => {
                            this.onStdOutEmitter.fire(data.toString());
                        });
                }

                if (token) {
                    const tokenListener = token.onCancellationRequested(
                        async () => {
                            tokenListener.dispose();

                            if (onBeforeProcessCancelled) {
                                try {
                                    const cancellationOptions = await onBeforeProcessCancelled();

                                    if (cancellationOptions.waitForProcessClose) {
                                        const timeoutMs = cancellationOptions.waitForProcessCloseTimeout || 60 * 1000; // 1 minute default timeout for any process to shutdown.
                                        const processClosePromise = new Promise<void>((resolve) => process.once('close', () => resolve()));
                                        await awaitWithTimeout(timeoutMs, processClosePromise);
                                    }
                                }
                                catch
                                {
                                    // Best effort, if any errors occur, force kill the process.
                                }
                            }

                            if (os.platform() === 'win32') {
                                // NOTE: Windows does not support SIGTERM/SIGINT/SIGBREAK, so there can be no graceful process shutdown.
                                //       As a partial mitigation, use `taskkill` to kill the entire process tree.
                                void Process.exec(`taskkill /pid ${process.pid} /t /f`);
                            } else {
                                // NOTE: Defaults to SIGTERM which allows process opportunity to shutdown gracefully.
                                process.kill();
                            }
                        });
                }

                function awaitWithTimeout(timeout: number, promise: Promise<void>)
                {
                    const timeoutPromise = new Promise((resolve, reject) => {
                        setTimeout(() => reject(), timeout);
                    });

                    return Promise.race([promise, timeoutPromise]);
                }
            });
    }
}
