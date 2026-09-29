const helper = require('@iobroker/vis-2-widgets-testing');
const fs = require('node:fs');
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

    // The label of a jQui button follows the text-align of the widget. A MUI button lays out its label as a flex
    // box, which does not care for text-align, so the label stayed in the middle (#426).
    it('Check text-align of a jQui button', async function () {
        this.timeout(60_000);

        const gaps = {};
        for (const align of ['left', 'right']) {
            const wid = await gPage.evaluate(
                (data, style) => window.visAddWidget('tplJquiBool', 0, 0, data, style),
                { type: 'button', text_false: 'Label', text_true: 'Label' },
                {
                    position: 'absolute',
                    left: '20px',
                    top: '20px',
                    width: '240px',
                    height: '40px',
                    'text-align': align,
                },
            );
            const button = await gPage.waitForSelector(`#${wid} button`, { timeout: 5_000 });
            await new Promise(resolve => setTimeout(resolve, 1_000));
            // the space between the text of the label and the edges of the button
            gaps[align] = await button.evaluate(el => {
                const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
                let text = walker.nextNode();
                while (text && !text.textContent.trim()) {
                    text = walker.nextNode();
                }
                const range = document.createRange();
                range.selectNodeContents(text);
                const label = range.getBoundingClientRect();
                const box = el.getBoundingClientRect();
                return { left: Math.round(label.left - box.left), right: Math.round(box.right - label.right) };
            });
            await helper.view.deleteWidget(gPage, wid, 3_500);
        }
        await new Promise(resolve => setTimeout(resolve, 2_000));

        assert.ok(
            gaps.left.left < gaps.left.right,
            `text-align: left must put the label at the left (${gaps.left.left}px left, ${gaps.left.right}px right)`,
        );
        assert.ok(
            gaps.right.right < gaps.right.left,
            `text-align: right must put the label at the right (${gaps.right.left}px left, ${gaps.right.right}px right)`,
        );
    });

    // The push mode of the binary state keeps the state on for as long as the button is held. It ran on mouse
    // events, which a finger fires only when it is lifted, so on a touch screen the button was never on while it
    // was held (#475). A mouse released outside of the button left it on for good.
    it('Check push mode of a button', async function () {
        this.timeout(60_000);

        const wid = await gPage.evaluate(
            (data, style) => window.visAddWidget('tplJquiBool', 0, 0, data, style),
            { type: 'button', pushMode: true, text_false: 'OFF', text_true: 'ON' },
            { position: 'absolute', left: '20px', top: '20px', width: '150px', height: '60px' },
        );
        // wait for saving
        await new Promise(resolve => setTimeout(resolve, 5_000));

        const runtimePage = await gBrowser.newPage();
        // a touch screen has to be there when the page loads
        await runtimePage.setViewport({ width: 1280, height: 800, hasTouch: true, isMobile: true });
        await runtimePage.goto(`http://127.0.0.1:18082/vis-2/index.html`, { waitUntil: 'domcontentloaded' });
        const button = await runtimePage.waitForSelector(`#${wid} button`, { timeout: 20_000 });
        const box = await button.boundingBox();
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        const text = () => button.evaluate(el => el.innerText.trim());

        await runtimePage.touchscreen.touchStart(x, y);
        await new Promise(resolve => setTimeout(resolve, 500));
        const heldByFinger = await text();
        await runtimePage.touchscreen.touchEnd();
        await new Promise(resolve => setTimeout(resolve, 500));
        const liftedFinger = await text();

        await runtimePage.mouse.move(x, y);
        await runtimePage.mouse.down();
        await new Promise(resolve => setTimeout(resolve, 500));
        const heldByMouse = await text();
        await runtimePage.mouse.move(x + 400, y + 300, { steps: 5 });
        await runtimePage.mouse.up();
        await new Promise(resolve => setTimeout(resolve, 500));
        const releasedOutside = await text();

        await runtimePage.close();
        // leave the view as it was found, before an assertion can stop the test
        await helper.view.deleteWidget(gPage, wid, 3_500);
        await new Promise(resolve => setTimeout(resolve, 2_000));

        assert.strictEqual(heldByFinger, 'ON', 'the button must be on while a finger holds it');
        assert.strictEqual(liftedFinger, 'OFF', 'the button must be off when the finger is lifted');
        assert.strictEqual(heldByMouse, 'ON', 'the button must be on while the mouse holds it');
        assert.strictEqual(releasedOutside, 'OFF', 'the button must be off when the mouse is released outside of it');
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

    // The title of the widget "Border" is HTML, as it was in its vis-1 template: `<b>` makes it bold instead of
    // being shown as text (#563).
    it('Check that the title of a border is HTML', async function () {
        this.timeout(30_000);

        const titleOf = async title => {
            const wid = await gPage.evaluate(t => window.visAddWidget('tplFrame', 0, 0, { title: t }), title);
            await gPage.waitForSelector(`#${wid}`, { timeout: 5_000 });
            await new Promise(resolve => setTimeout(resolve, 1_000));
            const shown = await gPage.evaluate(id => {
                const bold = document.querySelector(`#${id} b`);
                return { bold: bold ? bold.textContent : null, text: document.getElementById(id).textContent };
            }, wid);
            await helper.view.deleteWidget(gPage, wid, 3_500);
            return shown;
        };

        assert.deepStrictEqual(await titleOf('<b>bold</b> and plain'), { bold: 'bold', text: 'bold and plain' });
        // an empty title shows nothing, and a title without markup shows as it is
        assert.deepStrictEqual(await titleOf(''), { bold: null, text: '' });
        assert.deepStrictEqual(await titleOf('Living room'), { bold: null, text: 'Living room' });
    });

    // MUI gives the text of an input the color of the theme, so the color of the widget - set in its style or by a
    // CSS class - did not reach the text of the jQui inputs (#521).
    it('Check that the jQui inputs take the color of the widget', async function () {
        this.timeout(60_000);

        await gPage.addStyleTag({ content: '.test-input-color { color: rgb(0, 150, 0); }' });
        const colorOf = async (type, data, style, selector) => {
            const wid = await gPage.evaluate((t, d, s) => window.visAddWidget(t, 0, 0, d, s), type, data, style);
            await gPage.waitForSelector(`#${wid} ${selector}`, { timeout: 5_000 });
            await new Promise(resolve => setTimeout(resolve, 500));
            const color = await gPage.evaluate(
                (id, sel) => getComputedStyle(document.querySelector(`#${id} ${sel}`)).color,
                wid,
                selector,
            );
            await helper.view.deleteWidget(gPage, wid, 3_500);
            return color;
        };
        const red = { color: 'rgb(200, 0, 0)' };

        assert.strictEqual(await colorOf('tplJquiInput', {}, red, 'input'), 'rgb(200, 0, 0)', 'input, style');
        assert.strictEqual(
            await colorOf('tplJquiInput', { class: 'test-input-color' }, {}, 'input'),
            'rgb(0, 150, 0)',
            'input, CSS class',
        );
        // the date field of MUI X draws its text in sections, not in an <input>
        assert.strictEqual(
            await colorOf('tplJquiInputDate', {}, red, '.MuiPickersInputBase-sectionContent'),
            'rgb(200, 0, 0)',
            'date input',
        );
        // The select of `tplJquiSelectList` is not checked here: the editor disables it, and a disabled input
        // takes the disabled color of the theme on purpose.
    });

    // The runtime clips the content of a widget at its box (`.vis-widget { overflow: hidden }`), and the editor has
    // to show the same: an image larger than its widget was drawn whole in the editor and cut in the runtime
    // (#582). The editor used to lift the clipping for its name plate, which sat outside the box - that plate is
    // drawn in the adorner layer now, so the widget needs no `overflow` of its own in the editor.
    it('Check that the editor clips a widget like the runtime', async function () {
        this.timeout(60_000);

        const basicWidgets = await helper.palette.getListOfWidgets(gPage, 'basic');
        const widgetType = basicWidgets.find(name => name !== '_tplGroup') || basicWidgets[0];
        const box = { position: 'absolute', left: '100px', top: '100px', width: '120px', height: '40px' };

        const overflowOf = async style => {
            const wid = await gPage.evaluate((type, s) => window.visAddWidget(type, 0, 0, {}, s), widgetType, style);
            await gPage.waitForSelector(`#rx_${wid}, #${wid}`, { timeout: 5_000 });
            await new Promise(resolve => setTimeout(resolve, 1_000));
            const overflow = await gPage.evaluate(id => {
                // the div the runtime clips with: the widget div of a React widget, the template's div of a can.js one
                const cs = getComputedStyle(document.getElementById(id));
                const name = document.querySelector(
                    `.vis-editmode-marks[data-widget-id="${id}"] .vis-editmode-widget-name`,
                );
                return { x: cs.overflowX, y: cs.overflowY, nameShown: !!name };
            }, wid);
            await helper.view.deleteWidget(gPage, wid, 3_500);
            return overflow;
        };

        // selected, with its name plate shown - the case in which the editor used to make it `visible`
        const plain = await overflowOf(box);
        assert.ok(plain.nameShown, `widget "${widgetType}" shows no name plate, so this test would not test the case`);
        assert.deepStrictEqual(
            { x: plain.x, y: plain.y },
            { x: 'hidden', y: 'hidden' },
            `the editor must clip widget "${widgetType}" like the runtime does`,
        );

        // an overflow the user set on the widget is taken as it is, in the editor as in the runtime
        const own = await overflowOf({ ...box, 'overflow-x': 'visible', 'overflow-y': 'visible' });
        assert.deepStrictEqual(
            { x: own.x, y: own.y },
            { x: 'visible', y: 'visible' },
            `the editor must keep the overflow set on widget "${widgetType}"`,
        );

        await new Promise(resolve => setTimeout(resolve, 2_000));
    });

    // The right part of the toolbar - user, theme, menu - floats at its right edge, and the groups of the toolbar
    // take the width that is left. When they need more, they have to wrap into another row instead of running on
    // under that part: in the narrowest form the user moves up into it, and the groups lay over its name (#570).
    it('Check that the toolbar leaves its right part free', async function () {
        this.timeout(60_000);

        const viewport = gPage.viewport();
        // The button that switches the height of the toolbar sits in its right part and is found by its tooltip,
        // which MUI puts on it as `aria-label` - the icons carry no name in a production build. The tooltip is
        // translated, so every language of the editor is accepted.
        const i18nDir = path.join(__dirname, '..', 'src-vis', 'src', 'i18n');
        const labelsOf = key => [
            key,
            ...fs.readdirSync(i18nDir).map(file => JSON.parse(fs.readFileSync(path.join(i18nDir, file), 'utf8'))[key]),
        ];
        const clickInRightPart = async key => {
            await gPage.evaluate(labels => {
                const right = document.querySelector('.vis-toolbar-right');
                [...right.querySelectorAll('button')].find(b => labels.includes(b.getAttribute('aria-label'))).click();
            }, labelsOf(key));
            await new Promise(resolve => setTimeout(resolve, 1_000));
        };
        // every button and icon of the groups that lies on the right part
        const covered = width =>
            gPage.setViewport({ ...viewport, width }).then(async () => {
                await new Promise(resolve => setTimeout(resolve, 1_000));
                return gPage.evaluate(() => {
                    const right = document.querySelector('.vis-toolbar-right');
                    const r = right.getBoundingClientRect();
                    const lies = b =>
                        b.width && b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top;
                    return [...right.nextElementSibling.querySelectorAll('button, svg, img')]
                        .map(el => el.getBoundingClientRect())
                        .filter(lies).length;
                });
            });

        try {
            // 1000 and 1100 px are narrower than what the groups need in one row
            assert.strictEqual(await covered(1000), 0, 'the toolbar runs under its right part at 1000 px');

            await clickInRightPart('Hide panel names'); // full -> narrow
            await clickInRightPart('Narrow panel'); // narrow -> the narrowest form
            for (const width of [1000, 1100]) {
                assert.strictEqual(
                    await covered(width),
                    0,
                    `the narrowest toolbar runs under its right part at ${width} px`,
                );
            }
            await helper.screenshot(gPage, `86_${(Date.now() - start).toString().padStart(6, '0')}_toolbar_narrow`);
        } finally {
            await clickInRightPart('Full panel').catch(() => {}); // back to full
            await gPage.setViewport(viewport);
            await new Promise(resolve => setTimeout(resolve, 1_000));
        }
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

        const source = await gPage.waitForSelector(`#widget_${widgetType}`, { timeout: 5_000 });
        const target = await gPage.waitForSelector('#vis-react-container', { timeout: 5_000 });
        assert.ok(source, `the palette has no entry "${widgetType}"`);
        assert.ok(target, 'the editor has no view to drop onto');

        const from = await source.boundingBox();
        const to = await target.boundingBox();
        assert.ok(from && to, 'palette entry or view is not on the screen');

        // The editor drags with dnd-kit, which listens to pointer events - so this is a plain mouse gesture
        // and needs no `setDragInterception`. It used to be react-dnd with its HTML5 backend, where nothing
        // but a native `dragstart` would do.
        await gPage.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
        await gPage.mouse.down();
        // the first move has to clear the 5 px that tell a drag from a click, the rest carry it over
        await gPage.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2 + 10);
        await gPage.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
        await gPage.mouse.up();

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
