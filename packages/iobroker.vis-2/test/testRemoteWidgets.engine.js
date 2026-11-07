const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { bringsWidgets, findRemoteWidgetAdapters, RemoteWidgetCache } = require('../build/lib/remoteWidgets.js');

function instance(id, host, version, common) {
    return { _id: `system.adapter.${id}`, type: 'instance', common: { host, version, ...common } };
}

function logger() {
    const lines = { debug: [], info: [], warn: [] };
    return {
        lines,
        debug: text => lines.debug.push(text),
        info: text => lines.info.push(text),
        warn: text => lines.warn.push(text),
    };
}

// a fetchAdapterDir that writes the given files, as the js-controller does with the files of the other host
function fakeFetch(files) {
    const calls = [];
    const fetchAdapterDir = async options => {
        calls.push(options);
        for (const [name, content] of Object.entries(files())) {
            fs.mkdirSync(path.dirname(path.join(options.target, name)), { recursive: true });
            fs.writeFileSync(path.join(options.target, name), content);
        }
        return { host: options.host, files: Object.keys(files()) };
    };
    return { calls, fetchAdapterDir };
}

describe('remote widget sets', () => {
    describe('bringsWidgets', () => {
        it('knows the adapters with widgets', () => {
            assert.ok(bringsWidgets('wattcycle', { visWidgets: { set: {} } }));
            assert.ok(bringsWidgets('vis-hqwidgets', {}));
            assert.ok(bringsWidgets('legacy', { restartAdapters: ['vis'] }));
            assert.ok(bringsWidgets('modern', { restartAdapters: ['devices', 'vis-2'] }));
            assert.ok(!bringsWidgets('admin', { restartAdapters: ['web'] }));
            assert.ok(!bringsWidgets('vis-2', { visWidgets: { set: {} } }));
            assert.ok(!bringsWidgets('vis', {}));
        });
    });

    describe('findRemoteWidgetAdapters', () => {
        it('lists the adapters with widgets that only run on other hosts', () => {
            const widgets = { visWidgets: { set: { url: 'x/customWidgets.js' } } };
            const result = findRemoteWidgetAdapters(
                [
                    instance('wattcycle.0', 'second-host', '2.0.4', widgets),
                    instance('wattcycle.1', 'remote-host', '2.0.4', widgets),
                    instance('wattcycle.2', 'remote-host', '2.0.4', widgets),
                    instance('material.0', 'remote-host', '1.0.0', widgets), // installed here as well
                    instance('local.0', 'vis-host', '1.0.0', widgets), // runs on this host
                    instance('admin.0', 'remote-host', '7.0.0', {}), // no widgets
                    { _id: 'system.adapter.broken.0', type: 'instance', common: { host: 'remote-host' } }, // no version
                    null,
                ],
                'vis-host',
                adapter => adapter === 'material',
            );

            assert.deepStrictEqual(
                result.map(({ adapter, instances }) => ({ adapter, hosts: instances.map(i => i.host) })),
                [{ adapter: 'wattcycle', hosts: ['remote-host', 'second-host'] }],
            );
        });
    });

    describe('RemoteWidgetCache', () => {
        let dir;
        let alive;
        let log;

        beforeEach(() => {
            dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vis-2-remote-')), 'remote-widgets');
            alive = new Set(['remote-host']);
            log = logger();
        });

        afterEach(() => {
            fs.rmSync(path.dirname(dir), { recursive: true, force: true });
        });

        function adapters(version, hosts = ['remote-host']) {
            return [
                {
                    adapter: 'wattcycle',
                    instances: hosts.map(host => ({
                        host,
                        version,
                        common: { host, version, visWidgets: { set: {} } },
                    })),
                },
            ];
        }

        function cache(fetchAdapterDir) {
            return new RemoteWidgetCache(dir, 'vis-host', fetchAdapterDir, async host => alive.has(host), log);
        }

        it('fetches the widgets once per version and keeps the copy', async () => {
            let content = 'v1';
            const fake = fakeFetch(() =>
                content === 'v1'
                    ? { 'wattcycle/customWidgets.js': content, 'wattcycle/old.js': 'old' }
                    : { 'wattcycle/customWidgets.js': content },
            );
            const remote = cache(fake.fetchAdapterDir);

            const sets = await remote.collect(adapters('2.0.4'));
            assert.deepStrictEqual(
                sets.map(set => set.name),
                ['iobroker.wattcycle'],
            );
            assert.strictEqual(sets[0].path, path.join(dir, 'iobroker.wattcycle'));
            assert.strictEqual(sets[0].pack.common.version, '2.0.4');
            assert.strictEqual(
                fs.readFileSync(path.join(sets[0].path, 'widgets', 'wattcycle', 'customWidgets.js'), 'utf8'),
                'v1',
            );
            assert.deepStrictEqual(fake.calls, [
                {
                    adapter: 'wattcycle',
                    path: 'widgets',
                    target: path.join(dir, 'iobroker.wattcycle.new', 'widgets'),
                    host: 'remote-host',
                },
            ]);

            // same version: nothing is fetched
            await remote.collect(adapters('2.0.4'));
            assert.strictEqual(fake.calls.length, 1);

            // new version: fetched again, and files of the old version are gone
            content = 'v2';
            await remote.collect(adapters('2.0.5'));
            assert.strictEqual(fake.calls.length, 2);
            const widgetsDir = path.join(dir, 'iobroker.wattcycle', 'widgets', 'wattcycle');
            assert.strictEqual(fs.readFileSync(path.join(widgetsDir, 'customWidgets.js'), 'utf8'), 'v2');
            assert.ok(!fs.existsSync(path.join(widgetsDir, 'old.js')));
            assert.ok(!fs.existsSync(path.join(dir, 'iobroker.wattcycle.new')));
        });

        it('fetches from the first running host', async () => {
            const fake = fakeFetch(() => ({ 'a.js': '' }));
            alive = new Set(['second-host']);
            await cache(fake.fetchAdapterDir).collect(adapters('1.0.0', ['remote-host', 'second-host']));
            assert.strictEqual(fake.calls[0].host, 'second-host');
        });

        it('keeps the old copy if fetching fails, and warns once', async () => {
            const good = fakeFetch(() => ({ 'a.js': 'good' }));
            await cache(good.fetchAdapterDir).collect(adapters('1.0.0'));

            const failing = cache(async () => {
                throw new Error('host "remote-host" does not answer');
            });
            const first = await failing.collect(adapters('1.0.1'));
            await failing.collect(adapters('1.0.1'));

            assert.deepStrictEqual(
                first.map(set => set.name),
                ['iobroker.wattcycle'],
            );
            assert.strictEqual(
                fs.readFileSync(path.join(dir, 'iobroker.wattcycle', 'widgets', 'a.js'), 'utf8'),
                'good',
            );
            assert.strictEqual(log.lines.warn.length, 1);
            assert.match(log.lines.warn[0], /does not answer - using the copy of version 1\.0\.0/);
            assert.ok(!fs.existsSync(path.join(dir, 'iobroker.wattcycle.new')));
        });

        it('uses the copy while no host with the adapter runs', async () => {
            const fake = fakeFetch(() => ({ 'a.js': '' }));
            await cache(fake.fetchAdapterDir).collect(adapters('1.0.0'));
            alive.clear();

            const sets = await cache(fake.fetchAdapterDir).collect(adapters('1.0.1'));
            assert.deepStrictEqual(
                sets.map(set => set.name),
                ['iobroker.wattcycle'],
            );
            assert.strictEqual(fake.calls.length, 1);
        });

        it('leaves the adapter out without a copy and without a way to fetch it', async () => {
            const old = cache(undefined);
            assert.deepStrictEqual(await old.collect(adapters('1.0.0')), []);
            assert.match(log.lines.info[0], /js-controller on host "vis-host", where vis-2 runs, is too old/);

            alive.clear();
            assert.deepStrictEqual(await cache(fakeFetch(() => ({})).fetchAdapterDir).collect(adapters('1.0.0')), []);
            assert.match(log.lines.info[1], /no host with an instance of it is running/);
        });

        it('removes the copies of adapters that are gone', async () => {
            const fake = fakeFetch(() => ({ 'a.js': '' }));
            await cache(fake.fetchAdapterDir).collect(adapters('1.0.0'));
            fs.mkdirSync(path.join(dir, 'iobroker.other.new'), { recursive: true });

            await cache(fake.fetchAdapterDir).collect([]);
            assert.deepStrictEqual(fs.readdirSync(dir), []);
        });
    });
});
