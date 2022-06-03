// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as cp from 'child_process';
import * as os from 'os';
import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import * as localization from './localization';
import { awaitWithTimeout } from './promiseUtil';

const localize = nls.loadMessageBundle(localization.getLocalizationPathForFile(__filename));

const DEFAULT_BUFFER_SIZE = 24 * 1024; // The default Node.js `exec` buffer size is 1 MB, our actual usage is far less

function bufferToString(buffer: Buffer): string {
    // Node.js treats null bytes as part of the length, which makes everything mad
    // There's also a trailing newline everything hates, so we'll remove
    return buffer.toString().replace(/\0/g, '').replace(/\r?\n$/g, '');
}

export interface ProcessCancellationOptions
{
    readonly waitForProcessClose: boolean,
    readonly waitForProcessCloseTimeout?: number
}

export class Process extends vscode.Disposable {
    private readonly onStartedEmitter = new vscode.EventEmitter<number>();
    private readonly onStdErrEmitter = new vscode.EventEmitter<string>();
    private readonly onStdOutEmitter = new vscode.EventEmitter<string>();

    constructor() {
        super(
            () => {
                this.onStdErrEmitter.dispose();
                this.onStdOutEmitter.dispose();
            });
    }

    onStarted = this.onStartedEmitter.event;
    onStdErr = this.onStdErrEmitter.event;
    onStdOut = this.onStdOutEmitter.event;

    static async exec(command: string, options?: cp.ExecOptions & { onCancellation?: () => Promise<ProcessCancellationOptions> }, token?: vscode.CancellationToken): Promise<{ code: number; stderr: string; stdout: string }> {
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

            const code = await process.spawn(command, options, token);

            return {
                code,
                stderr: bufferToString(stderrBuffer),
                stdout: bufferToString(stdoutBuffer)
            };
        } finally {
            process.dispose();
        }
    }

    spawn(command: string, options?: cp.SpawnOptions & { onCancellation?: () => Promise<ProcessCancellationOptions> }, token?: vscode.CancellationToken): Promise<number> {
        return new Promise(
            (resolve, reject) => {

                // Without the shell option, it pukes on arguments
                options = options || {};
                options.shell ??= true;

                const process = cp.spawn(command, options);

                if (process.pid !== undefined) {
                    this.onStartedEmitter.fire(process.pid);
                }

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

                            if (options?.onCancellation) {
                                try {
                                    const cancellationOptions = await options?.onCancellation();

                                    if (cancellationOptions.waitForProcessClose) {
                                        let processCloseListener: () => void = () => { return; }; // Not required, but makes the compiler happy.

                                        const timeoutMs = cancellationOptions.waitForProcessCloseTimeout || 60 * 1000; // 1 minute default timeout for any process to shutdown.
                                        const processClosePromise = new Promise<void>((resolve) => {
                                            processCloseListener = () => resolve();
                                            process.once('close', processCloseListener)
                                        });

                                        try {
                                            await awaitWithTimeout(timeoutMs, processClosePromise);
                                        }
                                        catch {
                                            process.removeListener('close', processCloseListener);
                                        }
                                    }
                                }
                                catch
                                {
                                    // Best effort, if any errors occur, force kill the process.
                                }
                            }

                            if (os.platform() === 'win32' && process.pid !== undefined) {
                                // NOTE: Windows does not support SIGTERM/SIGINT/SIGBREAK, so there can be no graceful process shutdown.
                                //       As a partial mitigation, use `taskkill` to kill the entire process tree.
                                void Process.exec(`taskkill /pid ${process.pid} /t /f`);
                            } else {
                                // NOTE: Defaults to SIGTERM which allows process opportunity to shutdown gracefully.
                                process.kill();
                            }
                        });
                }
            });
    }
}