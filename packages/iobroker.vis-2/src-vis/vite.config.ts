import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import commonjs from 'vite-plugin-commonjs';
import vitetsConfigPaths from 'vite-tsconfig-paths';
import { federation } from '@module-federation/vite';
import { resolve } from 'node:path';

import { moduleFederationShared } from './modulefederation.vis.config';

export default defineConfig({
    plugins: [
        federation({
            name: 'iobroker_vis',
            shared: moduleFederationShared(),
            exposes: {
                './visRxWidget': './src/Vis/visRxWidget',
            },
            remotes: {},
            filename: 'remoteEntry.js',
            manifest: true,
        }),
        react(),
        vitetsConfigPaths(),
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
    },
    optimizeDeps: {
        include: ['monaco-editor'],
    },
    build: {
        target: 'chrome89',
        outDir: './build',
        rollupOptions: {
            output: {
                manualChunks: {
                    'monaco-editor': ['monaco-editor'],
                },
            },
        },
    },
    worker: {
        format: 'es',
        // @ts-expect-error fix later
        plugins: [
            {
                name: 'monaco-editor-worker',
                resolveId(source: string): string {
                    if (source === 'monaco-editor/esm/vs/editor/editor.worker') {
                        return 'monaco-editor/esm/vs/editor/editor.worker.js';
                    }
                    return null;
                },
                load(id: string): string {
                    if (id === 'monaco-editor/esm/vs/editor/editor.worker.js') {
                        return `
                            import * as monaco from 'monaco-editor/esm/vs/editor/editor.worker';
                            self.MonacoEnvironment = { baseUrl: '/' };
                            export default monaco;
                        `;
                    }
                    return null;
                },
            },
        ],
    },
});
