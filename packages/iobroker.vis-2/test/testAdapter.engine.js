const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');
const setup = require('@iobroker/legacy-testing');

let objects = null;
let states = null;
let onStateChanged = null;

const adapterShortName = setup.adapterName.substring(setup.adapterName.indexOf('.') + 1);
const runningMode = require('../io-package.json').common.mode;

function checkConnectionOfAdapter(cb, counter) {
    counter = counter || 0;
    console.log(`Try check #${counter}`);
    if (counter > 30) {
        cb && cb('Cannot check connection');
        return;
    }

    states.getState(`system.adapter.${adapterShortName}.0.alive`, (err, state) => {
        err && console.error(err);
        if (state && state.val) {
            cb && cb();
        } else {
            setTimeout(() => checkConnectionOfAdapter(cb, counter + 1), 1000);
        }
    });
}

function getState(id) {
    return new Promise((resolve, reject) => states.getState(id, (err, state) => (err ? reject(err) : resolve(state))));
}

/**
 * Wait until vis-2 has written `info.uploaded` after `after`, which it does at the end of every build that uploaded
 *
 * @param {number} after - the time of the last build seen
 * @param {number} seconds - how long to wait
 * @returns {Promise<number>} the time of the new build
 */
async function waitForUpload(after, seconds) {
    for (let i = 0; i < seconds; i++) {
        const state = await getState(`${adapterShortName}.0.info.uploaded`);
        if (state?.val && state.ts > after) {
            return state.ts;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error(`${adapterShortName} did not upload its files within ${seconds} seconds`);
}

async function restartAdapter(beforeStart) {
    await setup.stopAdapter();
    beforeStart?.();
    setup.startAdapter(objects, states);
}

describe(`Test ${adapterShortName} adapter`, function () {
    before(`Test ${adapterShortName} adapter: Start js-controller`, function (_done) {
        this.timeout(600000); // because of the first installation from npm

        setup.setOptions({
            rootDir: path.normalize(`${__dirname}/../`).replace(/\\/g, '/'), // the adapter folder
        });

        setup.setupController(async () => {
            const config = await setup.getAdapterConfig();
            // enable adapter
            config.common.enabled = true;
            config.common.loglevel = 'debug';

            //config.native.dbtype   = 'sqlite';

            await setup.setAdapterConfig(config.common, config.native);

            setup.startController(
                true,
                (id, obj) => {},
                (id, state) => onStateChanged && onStateChanged(id, state),
                (_objects, _states) => {
                    objects = _objects;
                    states = _states;
                    _done();
                },
            );
        });
    });

    it(`Test ${adapterShortName} instance object: it must exists`, function (done) {
        objects.getObject(`system.adapter.${adapterShortName}.0`, (err, obj) => {
            assert(err === null);
            assert(typeof obj === 'object');
            assert(obj !== null && obj !== undefined);
            done();
        });
    });

    it(`Test ${adapterShortName} adapter: Check if adapter started`, function (done) {
        this.timeout(60000);
        checkConnectionOfAdapter(res => {
            if (res) {
                console.log(res);
            }
            if (runningMode === 'daemon') {
                assert(res !== 'Cannot check connection');
            } else {
                //??
            }
            done();
        });
    });
    /**/

    it(`Test ${adapterShortName} adapter: uploads a widget set again that is missing in the file storage`, async function () {
        this.timeout(600000);
        const lastUpload = await waitForUpload(0, 300);
        assert(await objects.fileExists('vis-2', 'widgets/basic.html'), 'widgets/basic.html was not uploaded');

        // what a restart during the upload of a new widget set left behind before #697
        await objects.unlinkAsync('vis-2', 'widgets/basic.html');
        await restartAdapter();

        await waitForUpload(lastUpload, 300);
        assert(await objects.fileExists('vis-2', 'widgets/basic.html'), 'widgets/basic.html was not uploaded again');
    });

    it(`Test ${adapterShortName} adapter: uploads a file again that changed on disk after the last upload`, async function () {
        this.timeout(600000);
        const lastUpload = await waitForUpload(0, 300);
        const file = path.join(__dirname, '../tmp/node_modules', setup.adapterName, 'www/widgets/basic/doc.html');

        // what a kill between copying a widget set into www/ and its upload leaves behind: the file storage has the
        // old file, and nothing on disk is left to copy
        await restartAdapter(() => fs.appendFileSync(file, '\n<!-- changed after the upload -->\n'));

        await waitForUpload(lastUpload, 300);
        const { file: data } = await objects.readFile('vis-2', 'widgets/basic/doc.html');
        assert(
            data.toString().includes('<!-- changed after the upload -->'),
            'widgets/basic/doc.html was not uploaded again',
        );
    });

    /*
    PUT YOUR OWN TESTS HERE USING
    it('Testname', function ( done) {
        ...
    });

    You can also use "sendTo" method to send messages to the started adapter
*/

    after(`Test ${adapterShortName} adapter: Stop js-controller`, function (done) {
        this.timeout(10000);

        setup.stopController(normalTerminated => {
            console.log(`Adapter normal terminated: ${normalTerminated}`);
            done();
        });
    });
});
