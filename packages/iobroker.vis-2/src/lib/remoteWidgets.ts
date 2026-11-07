import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * `adapter.fetchAdapterDir()` of js-controller 8.0 and newer: copies a directory of an installed adapter into a
 * local directory, also from another host
 */
export type FetchAdapterDir = (options: {
    adapter: string;
    path: string;
    target: string;
    host?: string;
}) => Promise<{ host: string; files: string[] }>;

/** An adapter with widgets, as `syncWidgetSets` takes it: where its package is, its name and its io-package */
export interface WidgetSetSource {
    /** Directory with the `widgets` folder */
    path: string;
    /** e.g. `iobroker.wattcycle` */
    name: string;
    /** Only `common` is read */
    pack: ioBroker.AdapterObject;
}

/** An instance of an adapter with widgets on another host */
interface RemoteInstance {
    host: string;
    version: string;
    common: ioBroker.InstanceCommon;
}

/** An adapter with widgets that is not installed on this host, with the hosts that have an instance of it */
export interface RemoteWidgetAdapter {
    /** e.g. `wattcycle` */
    adapter: string;
    /** The instances on other hosts, sorted by host */
    instances: RemoteInstance[];
}

/** What is stored next to the fetched widgets: where and in which version they came from */
interface CacheMarker {
    host: string;
    version: string;
}

/** Name of the file with the {@link CacheMarker} in the directory of an adapter */
const MARKER_FILE = 'remote.json';

/**
 * Whether the instances of an adapter bring widgets for vis
 *
 * The widgets of vis-2 are announced in `common.visWidgets`; the older sets of vis-1, which vis-2 still shows, are
 * adapters named `vis-*` or adapters that restart vis when they are installed.
 *
 * @param adapter - e.g. `wattcycle`
 * @param common - common of an instance of it
 */
export function bringsWidgets(adapter: string, common: ioBroker.InstanceCommon): boolean {
    if (adapter === 'vis' || adapter === 'vis-2') {
        return false;
    }
    return (
        !!common.visWidgets ||
        adapter.startsWith('vis-') ||
        (Array.isArray(common.restartAdapters) &&
            common.restartAdapters.some(name => name === 'vis' || name === 'vis-2'))
    );
}

/**
 * The adapters with widgets that only have instances on other hosts
 *
 * @param instances - all instance objects
 * @param ownHost - the host vis-2 runs on
 * @param isLocal - whether the package of an adapter was found on this host
 */
export function findRemoteWidgetAdapters(
    instances: (ioBroker.Object | null | undefined)[],
    ownHost: string,
    isLocal: (adapter: string) => boolean,
): RemoteWidgetAdapter[] {
    const byAdapter = new Map<string, RemoteInstance[]>();
    for (const obj of instances) {
        if (obj?.type !== 'instance' || !obj.common?.version) {
            continue;
        }
        const common = obj.common;
        const adapter = obj._id.replace(/^system\.adapter\./, '').replace(/\.\d+$/, '');
        if (!common.host || common.host === ownHost || isLocal(adapter) || !bringsWidgets(adapter, common)) {
            continue;
        }
        const list = byAdapter.get(adapter) || [];
        if (!list.some(instance => instance.host === common.host)) {
            list.push({ host: common.host, version: common.version, common });
        }
        byAdapter.set(adapter, list);
    }

    return [...byAdapter.entries()]
        .map(([adapter, list]) => ({
            adapter,
            instances: list.sort((a, b) => (a.host > b.host ? 1 : a.host < b.host ? -1 : 0)),
        }))
        .sort((a, b) => (a.adapter > b.adapter ? 1 : a.adapter < b.adapter ? -1 : 0));
}

/** Where the cache reports to */
interface CacheLogger {
    debug(message: string): void;
    info(message: string): void;
    warn(message: string): void;
}

/**
 * Keeps copies of the `widgets` folders of adapters that are installed on other hosts only.
 *
 * vis-2 copies the widgets of every adapter out of its package, which only exists on the hosts the adapter is
 * installed on. For an adapter on another host the js-controller fetches the folder from there
 * (`adapter.fetchAdapterDir()`); the copy is kept per adapter, with the host and the version it came from, so it is
 * fetched again only when the version changes, and it still serves when that host is not running.
 */
export class RemoteWidgetCache {
    /** What was already reported, so that a rebuild does not repeat the same warning */
    private readonly reported = new Set<string>();

    /**
     * @param dir - directory of the cache, e.g. `iobroker-data/vis-2.0/remote-widgets`
     * @param ownHost - the host vis-2 runs on, whose js-controller fetches the widgets
     * @param fetchAdapterDir - the method of the js-controller, undefined if it is too old to have one
     * @param isAlive - whether a host is running
     * @param log - where to report to
     */
    constructor(
        private readonly dir: string,
        private readonly ownHost: string,
        private readonly fetchAdapterDir: FetchAdapterDir | undefined,
        private readonly isAlive: (host: string) => Promise<boolean>,
        private readonly log: CacheLogger,
    ) {}

    /**
     * Report something once
     *
     * @param level - log level
     * @param key - what identifies the case
     * @param message - the text
     */
    private once(level: 'info' | 'warn', key: string, message: string): void {
        if (!this.reported.has(key)) {
            this.reported.add(key);
            this.log[level](message);
        }
    }

    /**
     * Read the marker of a cached adapter
     *
     * @param adapterDir - directory of the adapter in the cache
     */
    private static async readMarker(adapterDir: string): Promise<CacheMarker | null> {
        try {
            const marker = JSON.parse(await readFile(join(adapterDir, MARKER_FILE), 'utf8'));
            return typeof marker?.host === 'string' && typeof marker?.version === 'string' ? marker : null;
        } catch {
            return null;
        }
    }

    /**
     * Fetch the widgets of an adapter from a host into the cache. The new copy is written next to the old one and
     * replaces it only when it is complete.
     *
     * @param adapter - e.g. `wattcycle`
     * @param source - the instance on the host to fetch from
     * @param adapterDir - directory of the adapter in the cache
     */
    private async fetch(adapter: string, source: RemoteInstance, adapterDir: string): Promise<void> {
        const fresh = `${adapterDir}.new`;
        await rm(fresh, { recursive: true, force: true });
        try {
            await mkdir(fresh, { recursive: true });
            const { files } = await this.fetchAdapterDir!({
                adapter,
                path: 'widgets',
                target: join(fresh, 'widgets'),
                host: source.host,
            });
            const marker: CacheMarker = { host: source.host, version: source.version };
            await writeFile(join(fresh, MARKER_FILE), JSON.stringify(marker));
            await rm(adapterDir, { recursive: true, force: true });
            await rename(fresh, adapterDir);
            this.log.info(
                `Fetched ${files.length} widget files of ${adapter} ${source.version} from host "${source.host}"`,
            );
        } catch (e) {
            await rm(fresh, { recursive: true, force: true });
            throw e;
        }
    }

    /**
     * The widget sets of the adapters on other hosts, fetched if needed
     *
     * An adapter is fetched from the first running host with an instance of it, if the copy in the cache is missing
     * or of another version. If that fails, or no host with it is running, the copy in the cache is used as it is,
     * and an adapter without a copy is left out until the next rebuild.
     *
     * @param adapters - see {@link findRemoteWidgetAdapters}
     * @returns the sets for `syncWidgetSets`, with the cached copy as path
     */
    async collect(adapters: RemoteWidgetAdapter[]): Promise<WidgetSetSource[]> {
        const sets: WidgetSetSource[] = [];

        for (const { adapter, instances } of adapters) {
            const adapterDir = join(this.dir, `iobroker.${adapter}`);
            let marker = await RemoteWidgetCache.readMarker(adapterDir);

            let source: RemoteInstance | undefined;
            for (const instance of instances) {
                if (await this.isAlive(instance.host)) {
                    source = instance;
                    break;
                }
            }

            if (source && (marker?.host !== source.host || marker.version !== source.version)) {
                if (!this.fetchAdapterDir) {
                    this.once(
                        'info',
                        `old:${adapter}`,
                        `The widgets of ${adapter} on host "${source.host}" cannot be shown: the js-controller on host "${this.ownHost}", where vis-2 runs, is too old to fetch them (8.0 or newer is needed)`,
                    );
                } else {
                    try {
                        await this.fetch(adapter, source, adapterDir);
                        marker = { host: source.host, version: source.version };
                    } catch (e) {
                        this.once(
                            'warn',
                            `fail:${adapter}:${source.host}:${source.version}:${(e as Error).message}`,
                            `Cannot fetch the widgets of ${adapter} from host "${source.host}": ${(e as Error).message}${
                                marker ? ` - using the copy of version ${marker.version}` : ''
                            }`,
                        );
                    }
                }
            } else if (!source && !marker) {
                this.once(
                    'info',
                    `offline:${adapter}`,
                    `The widgets of ${adapter} are not shown: no host with an instance of it is running`,
                );
            }

            if (marker) {
                const common = (source || instances[0]).common;
                sets.push({
                    path: adapterDir,
                    name: `iobroker.${adapter}`,
                    pack: { common } as unknown as ioBroker.AdapterObject,
                });
            }
        }

        await this.removeOthers(adapters);

        return sets;
    }

    /**
     * Remove the copies of adapters that have no instance on another host any more, and unfinished copies
     *
     * @param adapters - the adapters that are kept
     */
    private async removeOthers(adapters: RemoteWidgetAdapter[]): Promise<void> {
        let entries: string[];
        try {
            entries = await readdir(this.dir);
        } catch {
            return;
        }
        const keep = new Set(adapters.map(({ adapter }) => `iobroker.${adapter}`));
        for (const entry of entries) {
            if (!keep.has(entry)) {
                await rm(join(this.dir, entry), { recursive: true, force: true });
                this.log.debug(`Removed the copy of the widgets of ${entry.replace(/^iobroker\./, '')}`);
            }
        }
    }
}
