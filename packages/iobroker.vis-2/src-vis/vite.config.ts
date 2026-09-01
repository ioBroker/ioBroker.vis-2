import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import commonjs from 'vite-plugin-commonjs';
import { federation } from '@module-federation/vite';
import { resolve } from 'node:path';
import { moduleFederationShared } from '@iobroker/types-vis-2/modulefederation.vis.config';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
    plugins: [
        // The host name configured here is used verbatim by @module-federation/vite
        // for the auto-init in the generated remoteEntry.js. The runtime init() call
        // in src/Vis/visLoadWidgets.tsx MUST use this exact name, or two host
        // instances are created, the global FederationInstance is overwritten with an
        // empty one, shared React/MUI is not shared, and remote widgets fall back to
        // their own React — resulting in `Cannot read properties of null (reading
        // 'useContext')`. The plugin and the runtime are pinned to exact versions
        // (no caret) in package.json because the init behaviour has changed between
        // releases (earlier versions prefixed the name with `__mfe_internal__`).
        // Do not loosen those pins without re-verifying the host name in remoteEntry.js.
        federation({
            name: 'iobroker_vis',
            shared: moduleFederationShared(),
            exposes: {
                './visRxWidget': './src/Vis/visRxWidget',
            },
            // vis-2 registers its remotes - the widget sets - at runtime with `registerRemotes()`, so there is
            // nothing to declare here. One is declared anyway: @module-federation/vite decides by `exposes` and
            // `remotes` alone whether it builds a host or a remote, and "exposes but no remotes" makes vis-2 a
            // REMOTE. For a remote the plugin defers every shared module to the federation bootstrap: the
            // exports of `react/jsx-runtime`, `@mui/system`, ... become `let` bindings that are filled
            // asynchronously, and whatever uses them while a module is evaluated (every MUI icon, MUI's own
            // theme setup) dies with `jsx is not a function` or `createCssVarsProvider is not a function`.
            // One declared remote turns vis-2 back into the host it is, and the shares are provided
            // synchronously from the local copies again. The plugin preloads every declared remote from its
            // entry bootstrap, so the entry has to exist: `public/vis2-dynamic-remotes.js` is an inert remote
            // that hands out an empty module. The runtime resolves a relative entry against the origin, not
            // the page, hence the same `./vis-2/` prefix the widget sets get (VIS2_URL_PREFIX in
            // visLoadWidgets.tsx); the dev server proxies `/vis-2` to ioBroker web.
            remotes: {
                vis2DynamicRemotes: {
                    type: 'module',
                    name: 'vis2DynamicRemotes',
                    entry: './vis-2/vis2-dynamic-remotes.js',
                },
            },
            filename: 'remoteEntry.js',
            manifest: true,
            dts: false,
        }),
        topLevelAwait({
            // The export name of top-level awaits promise for each chunk module
            promiseExportName: '__tla',
            // The function to generate import names of top-level awaits promise in each chunk module
            promiseImportName: (i: number): string => `__tla_${i}`,
        }),
        react(),
        commonjs(),
    ],
    server: {
        port: 3000,
        proxy: {
            '/_socket': 'http://localhost:8082',
            '/vis-2.0': 'http://localhost:8082',
            '/adapter': 'http://localhost:8082',
            '/habpanel': 'http://localhost:8082',
            '/vis-2': 'http://localhost:8082',
            '/widgets': 'http://localhost:8082/vis-2',
            '/widgets.html': 'http://localhost:8082/vis-2',
            '/web': 'http://localhost:8082',
            '/state': 'http://localhost:8082',
        },
    },
    base: './',
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@iobroker/types-vis-2': resolve(__dirname, '..', '..', 'types-vis-2'),
        },
        tsconfigPaths: true,
    },
    build: {
        target: 'chrome81',
        outDir: './build',
        rollupOptions: {
            // Two HTML inputs from a single source tree:
            //   index.html → src/indexRuntime.tsx → Runtime (end-user, slim bundle)
            //   edit.html  → src/index.tsx       → Editor (full bundle)
            // The runtime entry tree-shakes the editor import graph out of its bundle,
            // replacing the tasks.js copy-and-substitute runtime build.
            input: {
                index: resolve(__dirname, 'index.html'),
                edit: resolve(__dirname, 'edit.html'),
            },
        },
    },
});
