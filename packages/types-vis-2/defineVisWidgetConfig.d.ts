import type { UserConfig } from 'vite';
export interface DefineVisWidgetConfigOptions {
    /** Federation `name` — must be unique per widget adapter (e.g. `'vis2materialWidgets'`). */
    name: string;
    /** Federation entry filename. Defaults to `'customWidgets.js'`. */
    filename?: string;
    /** Map of exposed module paths, e.g. `{ './Thermostat': './src/Thermostat' }`. */
    exposes: Record<string, string>;
    /** The consumer's `package.json`. Used to derive the `shared` list for federation. */
    pack: Record<string, any>;
    /** Port for `vite` dev server. Defaults to `3000`. */
    devServerPort?: number;
    /** Host URL the dev server proxies to. Defaults to `http://localhost:8082`. */
    iobrokerHost?: string;
    /** Build target. Defaults to `'chrome81'`. */
    buildTarget?: string;
    /** Build output directory. Defaults to `'./build'`. */
    outDir?: string;
    /** Hook to mutate the generated config before it is returned. */
    extend?: (config: UserConfig) => UserConfig;
}
/**
 * Build a Vite `UserConfig` for an ioBroker vis-2 widget adapter. Consolidates
 * the federation plugin, top-level-await polyfill, React/JSX support, CommonJS
 * interop, dev-server proxy, and chunk-warning rules into one entry point so
 * each widget adapter only needs to declare its `name`, `exposes`, and `pack`.
 */
export declare function defineVisWidgetConfig(options: DefineVisWidgetConfigOptions): UserConfig;
