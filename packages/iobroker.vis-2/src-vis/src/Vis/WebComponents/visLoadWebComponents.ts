/**
 * Finds the web components of the installed adapters and reads their manifests.
 *
 * An adapter lists its components in `common.webComponents` of its io-package.json: manifest files relative to
 * its admin folder - served as `/adapter/<name>/` by admin and by web alike, so every host reads them from the
 * same place. The manifest names the module of the element, which a widget imports only when it is shown
 * (`visWebComponentWidget.tsx`):
 *
 * ```json
 * "webComponents": ["webcomponents/my-tile.json"]
 * ```
 *
 * A module that exports its manifest (`@iobroker/web-components` 0.2) is still accepted; it is imported here.
 */
import type { Connection } from '@iobroker/gui-components';
import { getWebComponentSources, loadWebComponents, type WebComponentSource } from '@iobroker/web-components';
import { isDevServer } from '@/Utilities/devServer';
import type { VisRxWidgetWithInfo } from '@/Vis/visLoadWidgets';
import { readWidgetInstances } from '@/Vis/visLoadWidgets';

import { createWebComponentWidget } from './visWebComponentWidget';

/**
 * The demo components vis-2 brings itself, relative to the document (`src-vis/public/demo-components`) - on the
 * dev server only, a user is not offered a demo in the palette. Not `webcomponents/`: the dev server proxies
 * everything that starts with `/web` to ioBroker. The demo is a module that exports its manifest, so the older way
 * stays tested.
 */
const DEMO_WEB_COMPONENTS = ['demo-components/iob-state-tile.js'];

/**
 * Read the manifests of all web components and make a widget type of each
 *
 * @param socket connection to ioBroker
 * @param fromConfig take the instances from `config.js`, see {@link readWidgetInstances}
 */
export async function loadWebComponentWidgets(
    socket: Connection,
    fromConfig: boolean,
): Promise<VisRxWidgetWithInfo<any>[]> {
    let instances: ioBroker.InstanceObject[] = [];
    try {
        instances = await readWidgetInstances(socket, fromConfig);
    } catch (e) {
        console.error(`Cannot read instances for web components: ${e as Error}`);
    }

    const sources: WebComponentSource[] = [
        ...(isDevServer() ? DEMO_WEB_COMPONENTS : []).map(url => ({
            url: new URL(url, document.baseURI).href,
            adapter: '',
            version: '',
        })),
        ...getWebComponentSources(instances, document.baseURI),
    ];

    const widgets: VisRxWidgetWithInfo<any>[] = [];
    for (const component of await loadWebComponents(sources)) {
        try {
            widgets.push(createWebComponentWidget(component));
        } catch (e) {
            console.error(`Web component ${component.url} ignored: ${(e as Error)?.message || String(e)}`);
        }
    }
    return widgets;
}
