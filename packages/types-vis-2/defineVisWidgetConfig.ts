// @ts-expect-error no types
import react from '@vitejs/plugin-react';
import commonjs from 'vite-plugin-commonjs';
import vitetsConfigPaths from 'vite-tsconfig-paths';
import { federation } from '@module-federation/vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import type { UserConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { moduleFederationShared } from './modulefederation.vis.config.js';

const sdkPackageJson: Record<string, any> = JSON.parse(
    readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'package.json')).toString(),
);

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
export function defineVisWidgetConfig(options: DefineVisWidgetConfigOptions): UserConfig {
    const iobrokerHost = options.iobrokerHost ?? 'http://localhost:8082';

    // Merge the widget's own dependencies with the SDK's dependencies so that
    // moduleFederationShared() sees packages like react/@mui/* that are now
    // declared in types-vis-2 instead of each widget.
    const mergedPack: Record<string, any> = {
        ...options.pack,
        dependencies: {
            ...(sdkPackageJson.dependencies ?? {}),
            ...(options.pack.dependencies ?? {}),
        },
        devDependencies: {
            ...(sdkPackageJson.devDependencies ?? {}),
            ...(options.pack.devDependencies ?? {}),
        },
    };

    const config: UserConfig = {
        plugins: [
            federation({
                manifest: true,
                name: options.name,
                filename: options.filename ?? 'customWidgets.js',
                exposes: options.exposes,
                remotes: {},
                shared: moduleFederationShared(mergedPack),
                dts: false,
            }),
            topLevelAwait({
                promiseExportName: '__tla',
                promiseImportName: (i: number): string => `__tla_${i}`,
            }),
            react(),
            vitetsConfigPaths(),
            commonjs(),
        ],
        server: {
            port: options.devServerPort ?? 3000,
            proxy: {
                '/_socket': iobrokerHost,
                '/vis.0': iobrokerHost,
                '/adapter': iobrokerHost,
                '/habpanel': iobrokerHost,
                '/vis': iobrokerHost,
                '/widgets': `${iobrokerHost}/vis`,
                '/widgets.html': `${iobrokerHost}/vis`,
                '/web': iobrokerHost,
                '/state': iobrokerHost,
            },
        },
        base: './',
        build: {
            target: options.buildTarget ?? 'chrome81',
            outDir: options.outDir ?? './build',
            rollupOptions: {
                onwarn(warning, warn): void {
                    if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
                        return;
                    }
                    warn(warning);
                },
            },
        },
    };

    return options.extend ? options.extend(config) : config;
}
