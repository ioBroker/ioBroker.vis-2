import { type UserConfig } from 'vite';
export interface DefineVisHostConfigOptions {
    /** Federation name. Defaults to `'iobroker_vis'`. */
    name?: string;
    /** Federation entry filename. Defaults to `'remoteEntry.js'`. */
    filename?: string;
    /** Additional federation exposes. Defaults to exposing `./visRxWidget`. */
    exposes?: Record<string, string>;
    /** Absolute path to the host's source directory (used for the `@` alias). */
    rootDir: string;
    /** Absolute path to the types-vis-2 package (used for the internal alias). */
    typesVis2Dir?: string;
    /** Port for `vite` dev server. Defaults to `3000`. */
    devServerPort?: number;
    /** Host URL that `vite` dev server proxies to. Defaults to `http://localhost:8082`. */
    iobrokerHost?: string;
    /** Build target. Defaults to `'chrome81'`. */
    buildTarget?: string;
    /** Build output directory. Defaults to `'./build'`. */
    outDir?: string;
    /** Whether to minify the build output. Defaults to `false` (host is debugged often). */
    minify?: boolean;
    /** Whether to emit sourcemaps. Defaults to `true`. */
    sourcemap?: boolean;
    /** Hook to mutate the generated config before it is returned. */
    extend?: (config: UserConfig) => UserConfig;
}
/**
 * Build a Vite `UserConfig` for the ioBroker vis-2 host. Mirror of
 * `defineVisWidgetConfig` but for the host side: exposes `visRxWidget`,
 * wires up the `/vis-2.0` proxy paths, keeps minification off, and emits
 * sourcemaps by default.
 */
export declare function defineVisHostConfig(options: DefineVisHostConfigOptions): UserConfig;
