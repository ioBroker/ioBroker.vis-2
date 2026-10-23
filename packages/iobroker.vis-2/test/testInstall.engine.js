const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// install.js resolves its www directory relative to its own location, so every test loads a copy of
// it from a temporary adapter tree: <root>/build/lib/install.js next to <root>/www/widgets/.
function createSandbox() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vis-2-install-'));
    fs.mkdirSync(path.join(root, 'build', 'lib'), { recursive: true });
    fs.mkdirSync(path.join(root, 'www', 'widgets'), { recursive: true });
    fs.copyFileSync(path.join(__dirname, '../build/lib/install.js'), path.join(root, 'build', 'lib', 'install.js'));
    return root;
}

function addWidgetSet(dir, name) {
    fs.writeFileSync(path.join(dir, `${name}.html`), `<!-- ${name} -->`);
    fs.mkdirSync(path.join(dir, name), { recursive: true });
    fs.writeFileSync(path.join(dir, name, 'widget.js'), '');
}

function addAdapter(root, name, setName, common) {
    const adapterDir = path.join(root, 'adapters', name);
    fs.mkdirSync(path.join(adapterDir, 'widgets'), { recursive: true });
    addWidgetSet(path.join(adapterDir, 'widgets'), setName);
    return { path: adapterDir, name, pack: { common: common || {}, native: {} } };
}

function sync(root, enabledList) {
    const { syncWidgetSets } = require(path.join(root, 'build', 'lib', 'install.js'));
    return syncWidgetSets(enabledList, false);
}

function widgetFiles(root) {
    return fs.readdirSync(path.join(root, 'www', 'widgets')).sort();
}

describe('syncWidgetSets', () => {
    let root;

    beforeEach(() => {
        root = createSandbox();
        addWidgetSet(path.join(root, 'www', 'widgets'), 'basic');
    });

    afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

    it('removes a widget set of an uninstalled adapter that sorts after an installed one', () => {
        const bring = addAdapter(root, 'iobroker.vis-bring', 'bring');
        addWidgetSet(path.join(root, 'www', 'widgets'), 'echarts');

        const { widgetSets, filesChanged } = sync(root, [bring]);

        assert.deepStrictEqual(widgetFiles(root), ['basic', 'basic.html', 'bring', 'bring.html']);
        assert.deepStrictEqual(
            widgetSets.map(set => set.name),
            ['basic', 'bring'],
        );
        assert.strictEqual(filesChanged, true);
    });

    it('removes a widget set of an uninstalled adapter that sorts before every installed one', () => {
        const timeandweather = addAdapter(root, 'iobroker.vis-timeandweather', 'timeandweather');
        addWidgetSet(path.join(root, 'www', 'widgets'), 'aaa');

        const { widgetSets } = sync(root, [timeandweather]);

        assert.deepStrictEqual(widgetFiles(root), ['basic', 'basic.html', 'timeandweather', 'timeandweather.html']);
        assert.deepStrictEqual(
            widgetSets.map(set => set.name),
            ['basic', 'timeandweather'],
        );
    });

    it('takes the vis-2 flag of each widget set from its own adapter', () => {
        const bring = addAdapter(root, 'iobroker.vis-bring', 'bring');
        const material = addAdapter(root, 'iobroker.vis-2-widgets-material', 'vis-2-widgets-material', {
            visWidgets: { vis2material: {} },
        });

        const { widgetSets } = sync(root, [bring, material]);

        // a set marked v2 is loaded as a module and must not be inlined into widgets.html
        assert.deepStrictEqual(
            widgetSets.map(set => [set.name, !!set.v2]),
            [
                ['basic', false],
                ['bring', false],
                ['vis-2-widgets-material', true],
            ],
        );
    });

    it('keeps only the generic widget sets when no adapter is installed', () => {
        addWidgetSet(path.join(root, 'www', 'widgets'), 'echarts');

        const { widgetSets } = sync(root, []);

        assert.deepStrictEqual(widgetFiles(root), ['basic', 'basic.html']);
        assert.deepStrictEqual(widgetSets, [{ name: 'basic', v2: false }]);
    });
});

describe('widgetFilesToCheck', () => {
    let root;

    beforeEach(() => {
        root = createSandbox();
        addWidgetSet(path.join(root, 'www', 'widgets'), 'basic');
    });

    afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

    function filesToCheck(enabledList) {
        const { widgetSets } = sync(root, enabledList);
        const { widgetFilesToCheck } = require(path.join(root, 'build', 'lib', 'install.js'));
        return widgetFilesToCheck(widgetSets, enabledList);
    }

    it('lists the HTML file of every set and the entry of every vis-2 collection', () => {
        const bring = addAdapter(root, 'iobroker.vis-bring', 'bring');
        const material = addAdapter(root, 'iobroker.vis-2-widgets-material', 'vis-2-widgets-material', {
            visWidgets: { vis2material: { url: 'vis-2-widgets-material/customWidgets.js' } },
        });
        fs.writeFileSync(path.join(material.path, 'widgets', 'vis-2-widgets-material', 'customWidgets.js'), '');

        assert.deepStrictEqual(filesToCheck([bring, material]), [
            'widgets/basic.html',
            'widgets/bring.html',
            'widgets/vis-2-widgets-material.html',
            'widgets/vis-2-widgets-material/customWidgets.js',
        ]);
    });

    it('skips a collection without a local file on disk', () => {
        const material = addAdapter(root, 'iobroker.vis-2-widgets-material', 'vis-2-widgets-material', {
            visWidgets: {
                remote: { url: 'https://example.com/customWidgets.js' },
                missing: { url: 'vis-2-widgets-material/notThere.js' },
                noUrl: {},
                empty: { url: '' },
            },
        });

        assert.deepStrictEqual(filesToCheck([material]), ['widgets/basic.html', 'widgets/vis-2-widgets-material.html']);
    });

    it('lists only the generic sets when no adapter is installed', () => {
        assert.deepStrictEqual(filesToCheck([]), ['widgets/basic.html']);
    });
});

describe('filesFingerprint', () => {
    let root;
    let www;

    beforeEach(() => {
        root = createSandbox();
        www = path.join(root, 'www');
        addWidgetSet(path.join(www, 'widgets'), 'basic');
        fs.writeFileSync(path.join(www, 'index.html'), '<html></html>');
    });

    afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

    function fingerprint(files) {
        const { filesFingerprint } = require(path.join(root, 'build', 'lib', 'install.js'));
        return filesFingerprint(www, files || allFiles());
    }

    function allFiles() {
        return [
            path.join(www, 'index.html'),
            path.join(www, 'widgets', 'basic.html'),
            path.join(www, 'widgets', 'basic', 'widget.js'),
        ];
    }

    it('does not depend on the order of the files', () => {
        assert.strictEqual(fingerprint(allFiles()), fingerprint(allFiles().reverse()));
    });

    it('changes when a file is written, even with the same size', () => {
        const file = path.join(www, 'widgets', 'basic', 'widget.js');
        const before = fingerprint();
        fs.writeFileSync(file, '');
        const time = new Date(Date.now() + 60000);
        fs.utimesSync(file, time, time);
        assert.notStrictEqual(fingerprint(), before);
    });

    it('changes when a file is added or its size changes', () => {
        const before = fingerprint();
        fs.writeFileSync(path.join(www, 'widgets', 'basic', 'widget.js'), 'new content');
        const changed = fingerprint();
        assert.notStrictEqual(changed, before);

        const added = path.join(www, 'widgets', 'basic', 'more.js');
        fs.writeFileSync(added, '');
        assert.notStrictEqual(fingerprint([...allFiles(), added]), changed);
    });

    it('stays the same when nothing is written', () => {
        assert.strictEqual(fingerprint(), fingerprint());
    });
});
