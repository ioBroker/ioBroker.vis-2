const assert = require('node:assert');

const { HELP_COMMANDS, MAX_BROWSERS, MAX_VIEWS, helpText, projectInfo, rememberBrowser } = require('../build/lib/help.js');

// The adapter with a stand-in for the Adapter class of adapter-core, as in testObjectChange.engine.js
class FakeAdapter {
    constructor(options) {
        this.options = options;
        this.config = {};
        this.namespace = 'vis-2.0';
        this.log = { error: () => {}, warn: () => {}, info: () => {}, debug: () => {} };
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

const PROJECT = {
    ___settings: { theme: 'redmond' },
    Start: {
        widgets: {
            w00001: { tpl: 'tplJquiDialog', data: { name: 'Heating' } },
            w00002: { tpl: 'tplJquiButtonDialogClose', data: {} },
            w00003: { tpl: 'tplJquiButtonLink', data: { html_dialog: true, dialogName: 'Lights' } },
            w00004: { tpl: 'tplValueFloat', data: { name: 'Temperature' } },
        },
    },
    Energy: { widgets: {} },
};

describe('help', () => {
    describe('projectInfo', () => {
        it('lists the views without the settings, and the dialogs', () => {
            const info = projectInfo('main', PROJECT);
            assert.deepStrictEqual(info.views, ['Start', 'Energy']);
            assert.strictEqual(info.moreViews, 0);
            assert.deepStrictEqual(info.dialogs, [
                { id: 'w00001', name: 'Heating', view: 'Start' },
                { id: 'w00003', name: 'Lights', view: 'Start' },
            ]);
        });

        it('counts the views beyond the limit', () => {
            const project = {};
            for (let i = 0; i < MAX_VIEWS + 3; i++) {
                project[`v${i}`] = { widgets: {} };
            }
            const info = projectInfo('big', project);
            assert.strictEqual(info.views.length, MAX_VIEWS);
            assert.strictEqual(info.moreViews, 3);
        });

        it('takes a broken project as empty', () => {
            assert.deepStrictEqual(projectInfo('x', null).views, []);
            assert.deepStrictEqual(projectInfo('x', { a: null, b: 'text' }).views, []);
        });
    });

    describe('rememberBrowser', () => {
        it('keeps one entry per browser, the newest last, and no browser without ID', () => {
            const browsers = new Map();
            rememberBrowser(browsers, { instance: 'aaaa0001', view: 'main/Start', ts: 1 });
            rememberBrowser(browsers, { instance: 'bbbb0002', view: 'main/Start', ts: 2 });
            rememberBrowser(browsers, { instance: 'aaaa0001', view: 'main/Energy', ts: 3 });
            rememberBrowser(browsers, { instance: 'notdefined', view: 'main/Start', ts: 4 });
            rememberBrowser(browsers, { instance: '', view: 'main/Start', ts: 5 });
            assert.deepStrictEqual(
                [...browsers.values()].map(b => `${b.instance} ${b.view}`),
                ['bbbb0002 main/Start', 'aaaa0001 main/Energy'],
            );
        });

        it('forgets the oldest beyond the limit', () => {
            const browsers = new Map();
            for (let i = 0; i < MAX_BROWSERS + 2; i++) {
                rememberBrowser(browsers, { instance: `b${i}`, view: 'main/Start', ts: i });
            }
            assert.strictEqual(browsers.size, MAX_BROWSERS);
            assert.ok(!browsers.has('b0') && !browsers.has('b1') && browsers.has(`b${MAX_BROWSERS + 1}`));
        });
    });

    describe('helpText', () => {
        it('names the commands, the projects with views and dialogs, and the browsers newest first', () => {
            const now = Date.now();
            const text = helpText({
                namespace: 'vis-2.0',
                projects: [projectInfo('main', PROJECT)],
                browsers: [
                    { instance: 'aaaa0001', view: 'main/Start', ts: now - 3 * 3600_000 },
                    { instance: 'bbbb0002', view: 'main/Energy', ts: now - 5 * 60_000 },
                ],
                now,
            });
            assert.match(text, /vis-2\.0\.control\.command/);
            assert.match(text, /changeView, data "project\/view"/);
            assert.match(text, /- main: Start, Energy\n/);
            assert.match(text, /dialog w00001 "Heating" on view Start/);
            assert.match(text, /- bbbb0002: main\/Energy, 5 min ago\n- aaaa0001: main\/Start, 3 h ago/);
        });

        it('says when there are no projects and no browsers', () => {
            const text = helpText({ namespace: 'vis-2.0', projects: [], browsers: [], now: 0 });
            assert.match(text, /Projects: none found/);
            assert.match(text, /use "\*" to reach every open browser/);
        });
    });

    describe('the adapter', () => {
        it('answers help with the projects in its files and the browsers that reported a view', async () => {
            const adapter = createAdapter();
            adapter.readDirAsync = async () => [
                { file: 'main', isDir: true },
                { file: 'images', isDir: true },
                { file: 'readme.txt', isDir: false },
            ];
            adapter.readFileAsync = async (_ns, file) => {
                if (file === 'main/vis-views.json') {
                    return { file: Buffer.from(JSON.stringify(PROJECT)) };
                }
                throw new Error('Not exists');
            };
            // a browser reports its view: instance, data, then command, all with ack
            adapter.options.stateChange('vis-2.0.control.instance', { val: 'cafe0001', ack: true, ts: 1 });
            adapter.options.stateChange('vis-2.0.control.data', { val: 'main/Energy', ack: true, ts: 1 });
            adapter.options.stateChange('vis-2.0.control.command', { val: 'changedView', ack: true, ts: Date.now() });
            // a command of someone else is no report
            adapter.options.stateChange('vis-2.0.control.instance', { val: '*', ack: false, ts: 2 });
            adapter.options.stateChange('vis-2.0.control.command', { val: 'changedView', ack: false, ts: 2 });

            const answer = await new Promise(resolve => {
                adapter.sendTo = (to, command, message, callback) => resolve({ to, command, message, callback });
                void adapter.processMessage({
                    command: 'help',
                    from: 'system.adapter.pi-agent.0',
                    callback: { id: 7 },
                });
            });
            assert.strictEqual(answer.to, 'system.adapter.pi-agent.0');
            assert.deepStrictEqual(answer.callback, { id: 7 });
            assert.deepStrictEqual(answer.message.commands, HELP_COMMANDS);
            assert.match(answer.message.help, /- main: Start, Energy\n/);
            assert.doesNotMatch(answer.message.help, /images/);
            assert.match(answer.message.help, /- cafe0001: main\/Energy, just now/);
            assert.doesNotMatch(answer.message.help, /- \*:/);
        });
    });
});
