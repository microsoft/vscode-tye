import { Observable, timer } from 'rxjs'
import { distinctUntilChanged, first, switchMap } from 'rxjs/operators';
import { ProcessProvider } from './processProvider';
import * as netstat from 'node-netstat';

export interface TyeProcess {
    pid: number;
    dashboardPort: number;
}

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type ProspectiveTyeProcess = WithOptional<TyeProcess, 'dashboardPort'>;

export interface TyeProcessProvider {
    readonly processes: Observable<TyeProcess[]>;
    getProcesses(): Promise<TyeProcess[]>;
}

netstat.commands.darwin = {
    cmd: 'lsof',
    args: ['-Pn', '-i4', '-sTCP:LISTEN']
};

// NOTE: The TS definition incorrectly asserts that `darwin` is const.
// TODO: Update the TS definitions.
(netstat.parsers.darwin as unknown) = (line: string, callback: (item: netstat.ParsedItem) => void) => {
    const parts = line.split(/\s/).filter(String);
    if (!parts.length || (parts.length != 9 && parts.length != 10 )) {
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
};

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

export default class LocalTyeProcessProvider implements TyeProcessProvider {
    private readonly _processes: Observable<TyeProcess[]>;

    constructor(private readonly processProvider: ProcessProvider) {
        this._processes =
            // TODO: Make interval configurable.
            timer(0, 2000)
                .pipe(
                    // NOTE: switchMap() will cancel previous invocations.
                    //       What we really want is an interval after each
                    //       successful attempt.
                    switchMap(() => this.getProcessList()),
                    // NOTE: There is a small (minute?) chance that a tye
                    //       process could be recycled such that it ends
                    //       up with the same PID and dynamically chosen
                    //       port. If possible, perhaps incorporate a
                    //       timestamp into the comparison.
                    //
                    //       This comparison relies on the processes being sorted.
                    distinctUntilChanged(
                        (x, y) => {
                            if (x.length !== y.length) {
                                return false;
                            }

                            for (let i = 0; i < x.length; i++) {
                                const xi = x[i];
                                const yi = y[i];

                                if (xi.pid !== yi.pid || xi.dashboardPort !== yi.dashboardPort) {
                                    return false;
                                }
                            }

                            return true;
                        }));
    }

    get processes(): Observable<TyeProcess[]> {
        return this._processes;
    }

    getProcesses(): Promise<TyeProcess[]> {
        return this.processes.pipe(first()).toPromise();
    }

    private async getProcessList(): Promise<TyeProcess[]> {
        const tyeProcesses = await this.processProvider.listProcesses('tye');
        const tyeProcessesWithPorts = await Promise.all(tyeProcesses.map(process => this.getPortForProcess(process.pid)));

        function hasValidPort(process: ProspectiveTyeProcess): process is TyeProcess {
            return !!process.dashboardPort;
        }

        const tyeProcessesWithValidPorts =
            tyeProcessesWithPorts
                .filter(hasValidPort)
                .sort((a, b) => a.pid - b.pid);

        return tyeProcessesWithValidPorts;
    }

    private async getPortForProcess(pid: number): Promise<ProspectiveTyeProcess> {
        const items = await netstatAsync({ filter: { pid, protocol: 'tcp' } });

        return { pid, dashboardPort: items[0]?.local?.port ?? undefined }
    }
}

