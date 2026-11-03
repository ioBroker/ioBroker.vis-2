/**
 * Finds the web components of the installed adapters and loads them.
 *
 * An adapter lists its components in `common.webComponents` of its io-package.json, as URLs of ES modules
 * relative to its admin folder - served as `/adapter/<name>/` by admin and by web alike, so every host can load
 * them from the same place:
 *
 * ```json
 * "webComponents": ["webcomponents/my-tile.js"]
 * ```
 */
import type { Connection } from '@iobroker/gui-components';
import type { VisRxWidgetWithInfo } from '@/Vis/visLoadWidgets';
import { readWidgetInstances } from '@/Vis/visLoadWidgets';

import { checkWebComponentManifest } from './webComponentSettings';
import { getWebComponentSources, type WebComponentSource } from './webComponentSources';
import type { LoadedWebComponent, WebComponentModule } from './webComponentTypes';
import { createWebComponentWidget } from './visWebComponentWidget';

/**
 * PoC: the demo components vis-2 brings itself, relative to the document (`src-vis/public/demo-components`).
 * Not `webcomponents/`: the dev server proxies everything that starts with `/web` to ioBroker.
 */
const DEMO_WEB_COMPONENTS = ['demo-components/iob-state-tile.js'];

/**
 * Import one module and check what it exports
 *
 * @param source where the module is
 */
async function loadWebComponent(source: WebComponentSource): Promise<LoadedWebComponent | null> {
    try {
        // an absolute URL: a relative one would be resolved against this chunk, not against the document
        const module = (await import(/* @vite-ignore */ source.url)) as WebComponentModule;
        const problem = checkWebComponentManifest(module.manifest);
        if (problem || !module.manifest) {
            console.error(`Web component ${source.url} ignored: ${problem}`);
            return null;
        }
        if (!customElements.get(module.manifest.tag)) {
            console.error(`Web component ${source.url} ignored: it does not define <${module.manifest.tag}>`);
            return null;
        }
        return { manifest: module.manifest, ...source };
    } catch (e) {
        console.error(`Cannot load web component ${source.url}: ${(e as Error)?.message || String(e)}`);
        return null;
    }
}

/**
 * Load all web components and make a widget type of each
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
        ...DEMO_WEB_COMPONENTS.map(url => ({ url: new URL(url, document.baseURI).href, adapter: '', version: '' })),
        ...getWebComponentSources(instances, document.baseURI),
    ];

    const loaded = await Promise.all(sources.map(source => loadWebComponent(source)));

    const widgets: VisRxWidgetWithInfo<any>[] = [];
    const tags: string[] = [];
    for (const component of loaded) {
        if (!component) {
            continue;
        }
        if (tags.includes(component.manifest.tag)) {
            console.warn(`Web component <${component.manifest.tag}> of ${component.url} ignored: already loaded`);
            continue;
        }
        tags.push(component.manifest.tag);
        try {
            widgets.push(createWebComponentWidget(component));
        } catch (e) {
            console.error(`Web component ${component.url} ignored: ${(e as Error)?.message || String(e)}`);
        }
    }
    return widgets;
}
