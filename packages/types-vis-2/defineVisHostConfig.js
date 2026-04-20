// @ts-expect-error no types
import react from '@vitejs/plugin-react';
import commonjs from 'vite-plugin-commonjs';
import vitetsConfigPaths from 'vite-tsconfig-paths';
import { federation } from '@module-federation/vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { moduleFederationShared } from './modulefederation.vis.config.js';
/**
 * Build a Vite `UserConfig` for the ioBroker vis-2 host. Mirror of
 * `defineVisWidgetConfig` but for the host side: exposes `visRxWidget`,
 * wires up the `/vis-2.0` proxy paths, keeps minification off, and emits
 * sourcemaps by default.
 */
export function defineVisHostConfig(options) {
    const iobrokerHost = options.iobrokerHost ?? 'http://localhost:8082';
    const typesVis2Dir = options.typesVis2Dir ?? dirname(fileURLToPath(import.meta.url));
    const config = defineConfig({
        plugins: [
            federation({
                name: options.name ?? 'iobroker_vis',
                filename: options.filename ?? 'remoteEntry.js',
                exposes: options.exposes ?? {
                    './visRxWidget': './src/Vis/visRxWidget',
                },
                remotes: {},
                shared: moduleFederationShared(),
                manifest: true,
                dts: false,
            }),
            topLevelAwait({
                promiseExportName: '__tla',
                promiseImportName: (i) => `__tla_${i}`,
            }),
            react(),
            vitetsConfigPaths(),
            commonjs(),
        ],
        server: {
            port: options.devServerPort ?? 3000,
            proxy: {
                '/_socket': iobrokerHost,
                '/vis-2.0': iobrokerHost,
                '/adapter': iobrokerHost,
                '/habpanel': iobrokerHost,
                '/vis-2': iobrokerHost,
                '/widgets': `${iobrokerHost}/vis-2`,
                '/widgets.html': `${iobrokerHost}/vis-2`,
                '/web': iobrokerHost,
                '/state': iobrokerHost,
            },
        },
        base: './',
        resolve: {
            alias: {
                '@': resolve(options.rootDir, 'src'),
                '@iobroker/types-vis-2': typesVis2Dir,
            },
        },
        build: {
            target: options.buildTarget ?? 'chrome81',
            outDir: options.outDir ?? './build',
            minify: options.minify ?? false,
            sourcemap: options.sourcemap ?? true,
        },
    });
    return options.extend ? options.extend(config) : config;
}
//# sourceMappingURL=defineVisHostConfig.js.map