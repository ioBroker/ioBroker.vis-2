import { defineConfig, mergeConfig } from 'vite';
import { resolve } from 'node:path';
import baseConfig from './vite.config';

// Proof-of-concept config: build ONLY the runtime entry (indexRuntime.html -> Runtime)
// into a separate output dir, to verify that the editor import graph is tree-shaken
// out and that Module Federation still emits a working remoteEntry.js.
// This does NOT touch the existing editor/runtime build pipeline.
export default mergeConfig(
    baseConfig,
    defineConfig({
        build: {
            outDir: './build-runtime-poc',
            rollupOptions: {
                input: {
                    indexRuntime: resolve(__dirname, 'indexRuntime.html'),
                },
            },
        },
    }),
);
