const helper = require('@iobroker/vis-2-widgets-testing');
const path = require('node:path');
const assert = require('node:assert');

let gPage;
let gBrowser;
const start = Date.now();

describe('vis', () => {
    before(async function () {
        // installing js-controller and web, then waiting for the adapter to upload everything it ships - that
        // upload alone took around 80 s when this was last measured, so the budget has to be well past it
        this.timeout(360_000);

        // install js-controller, web and vis-2
        await helper.startIoBroker({
            startOwnAdapter: true,
            additionalAdapters: ['web'],
            visUploadedId: 'vis-2.0.info.uploaded',
            // vis-2 ships a lot: the test installation uploads well over a hundred megabytes, and how long
            // that takes is a property of the machine. The default of the helper is not enough for it.
            visUploadedTimeoutMs: 300_000,
            mainGuiProject: 'vis-2',
            rootDir: path.normalize(`${path.join(__dirname, '..')}/`).replace(/\\/g, '/'),
        });
        const { browser, page } = await helper.startBrowser(process.env.CI === 'true');
        gBrowser = browser;
        gPage = page;
        await helper.createProject();

        // open widgets
        await helper.palette.openWidgetSet(gPage, 'basic');
        await helper.screenshot(gPage, `02_${(Date.now() - start).toString().padStart(6, '0')}_widgets_opened`);
    });

    it('Check all widgets', async function () {
        this.timeout(120_000);
        const widgetSets = await helper.palette.getListOfWidgetSets();
        console.log(`Widget sets found: ${widgetSets.join(', ')}`);
        for (let s = 0; s < widgetSets.length; s++) {
            const widgets = await helper.palette.getListOfWidgets(gPage, widgetSets[s]);
            for (let w = 0; w < widgets.length; w++) {
                const wid = await helper.palette.addWidget(gPage, widgets[w]);
                await helper.screenshot(
                    gPage,
                    `${10 + s}_${(Date.now() - start).toString().padStart(6, '0')}_${widgetSets[s]}_${widgets[w]}`,
                );
                await helper.view.deleteWidget(gPage, wid, 3_500);
            }
        }

        // wait for saving
        await new Promise(resolve => setTimeout(resolve, 4_000));
    });

    it('Check runtime', async function () {
        // the waits inside this test add up to 30 s, so the budget must be bigger than that
        this.timeout(60_000);

        await helper.screenshot(gPage, `90_${(Date.now() - start).toString().padStart(6, '0')}before_runtime`);

        // add widget in editor
        const basicWidgets = await helper.palette.getListOfWidgets(gPage, 'basic');
        const wid = await helper.palette.addWidget(gPage, basicWidgets[0]);
        // wait for saving
        await new Promise(resolve => setTimeout(resolve, 5_000));

        await helper.screenshot(gPage, `90_${(Date.now() - start).toString().padStart(6, '0')}_runtime`);

        const runtimePage = await gBrowser.newPage();

        // open runtime
        await runtimePage.goto(`http://127.0.0.1:18082/vis-2/index.html`, { waitUntil: 'domcontentloaded' });
        await runtimePage.waitForSelector('#root', { timeout: 5_000 });
        await runtimePage.waitForSelector(`#${wid}`, { timeout: 20_000 });
        await helper.screenshot(runtimePage, `91_${(Date.now() - start).toString().padStart(6, '0')}runtime`);

        await runtimePage.close();
    });

    // The geometry of a widget is written by VisBaseWidget.onMove(), which computes the same rectangle twice -
    // once for the service div and once for the can.js div. This test pins down what each gesture is supposed
    // to do to that rectangle so the function can be reworked without silently moving pixels.
    //
    // It asserts the SEMANTICS of every handle - which edges it moves and which it has to leave alone - instead
    // of exact pixel arithmetic, so that a snap-to-grid setting of the project cannot make it flaky.
    it('Check widget move and resize', async function () {
        this.timeout(120_000);

        const START = { position: 'absolute', left: '300px', top: '220px', width: '260px', height: '200px' };
        const basicWidgets = await helper.palette.getListOfWidgets(gPage, 'basic');
        const widgetType = basicWidgets.find(name => name !== '_tplGroup') || basicWidgets[0];

        // addWidget() applies the passed style last, so it wins over the default style of the template, and it
        // selects the new widget - which is what makes the resize handles appear
        const wid = await gPage.evaluate(
            (type, style) => window.visAddWidget(type, 0, 0, {}, style),
            widgetType,
            START,
        );
        // The editor works on the service div: it carries the geometry, the frame and the resize handles. Its
        // id depends on the kind of widget - a can.js widget gets "rx_<wid>", because the plain "<wid>" is
        // already taken by the div the template renders into, while a React widget has only the one div and
        // keeps the plain id. Every basic widget is React today, but a widget set of another adapter may
        // still bring vis-1 templates, so both are accepted here.
        await gPage.waitForSelector(`#rx_${wid}, #${wid}`, { timeout: 5_000 });
        const serviceId = await gPage.evaluate(id => (document.getElementById(`rx_${id}`) ? `rx_${id}` : id), wid);
        await new Promise(resolve => setTimeout(resolve, 1_000));

        const geometry = () =>
            gPage.evaluate(id => {
                const el = document.getElementById(id);
                const px = value => Math.round(parseFloat(value) || 0);
                return {
                    left: px(el.style.left),
                    top: px(el.style.top),
                    width: px(el.style.width),
                    height: px(el.style.height),
                };
            }, serviceId);

        // The handles are drawn outside the widget, so they are not its children: they live on a div of the
        // adorner layer of the view that mirrors the padding box of the widget, tied back to it by
        // `data-widget-id` - see the `marks` portal in visBaseWidget.
        //
        // All eight carry the same class and no direction of their own, so they can only be told apart by
        // where they sit relative to the widget.
        const handles = () =>
            gPage.evaluate(id => {
                const box = document.getElementById(id).getBoundingClientRect();
                const marks = document.querySelector(`.vis-editmode-marks[data-widget-id="${id}"]`);
                return [...(marks?.querySelectorAll('.vis-editmode-resizer') || [])].map(handle => {
                    const b = handle.getBoundingClientRect();
                    const x = b.left + b.width / 2;
                    const y = b.top + b.height / 2;
                    const h = x < box.left + box.width / 4 ? 'left' : x > box.right - box.width / 4 ? 'right' : '';
                    const v = y < box.top + box.height / 4 ? 'top' : y > box.bottom - box.height / 4 ? 'bottom' : '';
                    return { dir: v && h ? `${v}-${h}` : v || h, x, y };
                });
            }, wid);

        // a gesture in several steps, so the editor sees a real drag and not a jump
        const dragBy = async (x, y, dx, dy) => {
            await gPage.mouse.move(x, y);
            await gPage.mouse.down();
            for (let step = 1; step <= 5; step++) {
                await gPage.mouse.move(x + (dx * step) / 5, y + (dy * step) / 5);
                await new Promise(resolve => setTimeout(resolve, 40));
            }
            await gPage.mouse.up();
            await new Promise(resolve => setTimeout(resolve, 400));
        };

        const edges = g => ({ left: g.left, top: g.top, right: g.left + g.width, bottom: g.top + g.height });

        const startGeometry = await geometry();
        assert.deepStrictEqual(
            startGeometry,
            { left: 300, top: 220, width: 260, height: 200 },
            `Widget "${widgetType}" did not take the requested geometry - this test needs a plain absolute widget`,
        );

        // --- moving: both edges of an axis travel together, the size stays ---
        const center = await gPage.evaluate(id => {
            const b = document.getElementById(id).getBoundingClientRect();
            return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
        }, serviceId);
        await dragBy(center.x, center.y, 60, 40);
        const moved = await geometry();
        assert.ok(
            moved.left > startGeometry.left,
            `moving to the right must increase left (${startGeometry.left} -> ${moved.left})`,
        );
        assert.ok(
            moved.top > startGeometry.top,
            `moving down must increase top (${startGeometry.top} -> ${moved.top})`,
        );
        assert.strictEqual(moved.width, startGeometry.width, 'moving must not change the width');
        assert.strictEqual(moved.height, startGeometry.height, 'moving must not change the height');

        // --- resizing: every handle owns exactly the edges it is named after ---
        const MOVES_EDGES = {
            top: ['top'],
            bottom: ['bottom'],
            left: ['left'],
            right: ['right'],
            'top-left': ['top', 'left'],
            'top-right': ['top', 'right'],
            'bottom-left': ['bottom', 'left'],
            'bottom-right': ['bottom', 'right'],
        };

        const found = (await handles()).map(handle => handle.dir).sort();
        assert.deepStrictEqual(
            found,
            Object.keys(MOVES_EDGES).sort(),
            `expected all eight resize handles on widget "${widgetType}", got: ${found.join(', ')}`,
        );

        for (const dir of Object.keys(MOVES_EDGES)) {
            const handle = (await handles()).find(item => item.dir === dir);
            const before = edges(await geometry());
            // dragging right and down moves every owned edge in the positive direction, whichever handle it is
            await dragBy(handle.x, handle.y, 40, 30);
            const after = edges(await geometry());

            for (const edge of ['left', 'top', 'right', 'bottom']) {
                const delta = after[edge] - before[edge];
                if (MOVES_EDGES[dir].includes(edge)) {
                    assert.ok(delta >= 5, `handle "${dir}" must move the ${edge} edge, but it changed by ${delta}px`);
                } else {
                    assert.ok(
                        Math.abs(delta) <= 2,
                        `handle "${dir}" must leave the ${edge} edge alone, but it changed by ${delta}px`,
                    );
                }
            }
        }

        await helper.screenshot(gPage, `80_${(Date.now() - start).toString().padStart(6, '0')}_geometry`);
        await helper.view.deleteWidget(gPage, wid, 3_500);
        await new Promise(resolve => setTimeout(resolve, 2_000));
    });

    // Dropping a widget from the palette onto the view is the one gesture that does not go through the mouse
    // handling of visView: it runs on react-dnd with the HTML5 backend, which listens to the native drag
    // events. That is why the earlier attempt in @iobroker/vis-2-widgets-testing - a `mouse.down`, a few
    // `mouse.move`s and a `mouse.up` - never worked and is commented out there: those are mouse events, and
    // the backend never sees a `dragstart`. Puppeteer dispatches the real ones through `dragAndDrop`.
    //
    // Every other test builds its widget with `window.visAddWidget`, so this path was never covered - and it
    // is the path that has to keep working when react-dnd is one day replaced.
    it('Check drop of a widget from the palette', async function () {
        this.timeout(120_000);

        const basicWidgets = await helper.palette.getListOfWidgets(gPage, 'basic');
        const widgetType = basicWidgets.find(name => name !== '_tplGroup') || basicWidgets[0];

        const widgetIds = () =>
            gPage.evaluate(() => [...document.querySelectorAll('.vis-widget')].map(el => el.id));
        const before = await widgetIds();

        // Without this puppeteer refuses with "Drag Interception is not enabled!" - it is what makes it send
        // the native drag events through CDP instead of plain mouse events.
        await gPage.setDragInterception(true);

        const source = await gPage.waitForSelector(`#widget_${widgetType}`, { timeout: 5_000 });
        const target = await gPage.waitForSelector('#vis-react-container', { timeout: 5_000 });
        assert.ok(source, `the palette has no entry "${widgetType}"`);
        assert.ok(target, 'the editor has no view to drop onto');

        await source.dragAndDrop(target);
        // the drop writes the project, and the widget appears with the next render
        await new Promise(resolve => setTimeout(resolve, 3_000));

        const after = await widgetIds();
        await helper.screenshot(gPage, `85_${(Date.now() - start).toString().padStart(6, '0')}_palette_drop`);

        const added = after.filter(id => !before.includes(id));
        assert.strictEqual(
            added.length,
            1,
            `dropping "${widgetType}" from the palette must put exactly one widget on the view ` +
                `(${before.length} -> ${after.length})`,
        );

        // leave the view and the page as they were found
        await helper.view.deleteWidget(gPage, added[0], 3_500);
        await gPage.setDragInterception(false);
        await new Promise(resolve => setTimeout(resolve, 2_000));
    });

    after(async function () {
        this.timeout(5_000);
        await helper.stopBrowser();
        console.log('BROWSER stopped');
        await helper.stopIoBroker();
        console.log('ioBroker stopped');
    });
});
