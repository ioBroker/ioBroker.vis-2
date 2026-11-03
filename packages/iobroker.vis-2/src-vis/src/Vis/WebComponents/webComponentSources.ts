/**
 * Where the web components of the installed adapters are - pure, so it can be tested without a browser.
 */

export interface WebComponentSource {
    /** Absolute URL of the module */
    url: string;
    adapter: string;
    version: string;
}

/**
 * Where the web components of the instances are
 *
 * @param instances the instance objects
 * @param baseUrl URL of the document, the adapter folders are resolved against it
 */
export function getWebComponentSources(instances: ioBroker.InstanceObject[], baseUrl: string): WebComponentSource[] {
    const sources: WebComponentSource[] = [];
    for (const instance of instances) {
        const list = (instance.common as { webComponents?: unknown }).webComponents;
        if (!Array.isArray(list)) {
            continue;
        }
        const adapter = instance._id.substring('system.adapter.'.length).replace(/\.\d+$/, '');
        const adapterBase = new URL(`../adapter/${adapter}/`, baseUrl);
        for (const entry of list) {
            if (typeof entry !== 'string' || !entry) {
                continue;
            }
            const url = new URL(entry, adapterBase).href;
            // every instance of an adapter lists the same files
            if (!sources.some(source => source.url === url)) {
                sources.push({ url, adapter, version: instance.common.version });
            }
        }
    }
    return sources;
}
