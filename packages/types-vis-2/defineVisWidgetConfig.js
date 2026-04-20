// @ts-expect-error no types
import react from '@vitejs/plugin-react';
import commonjs from 'vite-plugin-commonjs';
import vitetsConfigPaths from 'vite-tsconfig-paths';
import { federation } from '@module-federation/vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { moduleFederationShared } from './modulefederation.vis.config.js';
const sdkPackageJson = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'package.json')).toString());
/**
 * Build a Vite `UserConfig` for an ioBroker vis-2 widget adapter. Consolidates
 * the federation plugin, top-level-await polyfill, React/JSX support, CommonJS
 * interop, dev-server proxy, and chunk-warning rules into one entry point so
 * each widget adapter only needs to declare its `name`, `exposes`, and `pack`.
 */
export function defineVisWidgetConfig(options) {
    const iobrokerHost = options.iobrokerHost ?? 'http://localhost:8082';
    // Merge the widget's own dependencies with the SDK's dependencies so that
    // moduleFederationShared() sees packages like react/@mui/* that are now
    // declared in types-vis-2 instead of each widget.
    const mergedPack = {
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
    const config = {
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
                onwarn(warning, warn) {
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
//# sourceMappingURL=defineVisWidgetConfig.js.map