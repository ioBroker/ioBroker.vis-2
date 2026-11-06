const assert = require('node:assert');

// The controller hands an object change only to `options.objectChange` (or the `objectChange` event), never to a
// method of the adapter class with that name. These tests load build/main.js with a stand-in for the Adapter class
// of adapter-core that keeps the options, so no controller is needed.
class FakeAdapter {
    constructor(options) {
        this.options = options;
        this.config = {};
        this.log = { error: msg => this.errors.push(msg), warn: () => {}, info: () => {}, debug: () => {} };
        this.errors = [];
    }
}

function createAdapter() {
    const corePath = require.resolve('@iobroker/adapter-core');
    const mainPath = require.resolve('../build/main.js');
    const original = require.cache[corePath];
    require.cache[corePath] = { id: corePath, filename: corePath, loaded: true, exports: { Adapter: FakeAdapter } };
    delete require.cache[mainPath];
    try {
        return require(mainPath)({});
    } finally {
        if (original) {
            require.cache[corePath] = original;
        } else {
            delete require.cache[corePath];
        }
        delete require.cache[mainPath];
    }
}

/** Replace the rebuild by a counter */
function countBuilds(adapter) {
    const calls = [];
    adapter.buildHtmlPages = async forceBuild => {
        calls.push(forceBuild);
    };
    adapter.generateConfigPage = async () => false;
    return calls;
}

const flush = () => new Promise(resolve => setImmediate(resolve));

describe('objectChange', () => {
    it('is handed to the controller as an option', () => {
        const adapter = createAdapter();
        assert.strictEqual(typeof adapter.options.objectChange, 'function');
    });

    it('rebuilds the pages when the instance of a known widget adapter is deleted', async () => {
        const adapter = createAdapter();
        const builds = countBuilds(adapter);
        adapter.widgetInstances = { 'vis-metro': '1.2.0' };

        adapter.options.objectChange('system.adapter.vis-metro.0', null);
        await flush();

        assert.deepStrictEqual(builds, [false]);
        assert.deepStrictEqual(adapter.widgetInstances, {});
    });

    it('does not rebuild for the deletion of an instance that brings no widgets', async () => {
        const adapter = createAdapter();
        const builds = countBuilds(adapter);
        adapter.widgetInstances = { 'vis-metro': '1.2.0' };

        adapter.options.objectChange('system.adapter.admin.0', null);
        await flush();

        assert.deepStrictEqual(builds, []);
        assert.deepStrictEqual(adapter.widgetInstances, { 'vis-metro': '1.2.0' });
    });

    it('ignores its own instance, objects that are no instance and ids without an instance number', async () => {
        const adapter = createAdapter();
        const builds = countBuilds(adapter);
        adapter.widgetInstances = { 'vis-2': '2.20.6', 'vis-metro': '1.2.0' };

        adapter.options.objectChange('system.adapter.vis-2.0', null);
        adapter.options.objectChange('system.adapter.vis-metro.0', { type: 'state', common: {} });
        adapter.options.objectChange('system.adapter.vis-metro', null);
        adapter.options.objectChange('', null);
        await flush();

        assert.deepStrictEqual(builds, []);
        assert.deepStrictEqual(adapter.widgetInstances, { 'vis-2': '2.20.6', 'vis-metro': '1.2.0' });
    });

    it('logs a failed rebuild instead of leaving the rejection unhandled', async () => {
        const adapter = createAdapter();
        adapter.widgetInstances = { 'vis-metro': '1.2.0' };
        adapter.buildHtmlPages = async () => {
            throw new Error('disk full');
        };

        adapter.options.objectChange('system.adapter.vis-metro.0', null);
        await flush();
        await flush();

        assert.deepStrictEqual(adapter.errors, [
            'Cannot process the change of "system.adapter.vis-metro.0": disk full',
        ]);
    });
});
