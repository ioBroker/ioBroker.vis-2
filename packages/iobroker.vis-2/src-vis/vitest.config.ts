import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * Unit tests for the parts of vis-2 that are plain logic: the binding parser, the format operations, the
 * readings of a value that decide what a widget shows.
 *
 * They do not go through `vite.config.ts`: that one sets up module federation, which builds a host and wants
 * a browser. The two aliases below are all the tests need from it - they must stay the same as there.
 */
export default defineConfig({
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@iobroker/types-vis-2': resolve(__dirname, '..', '..', 'types-vis-2'),
        },
    },
    test: {
        // no DOM: every function under test here is pure, and a test that needs one says so itself
        environment: 'node',
        include: ['src/**/*.test.ts'],
        restoreMocks: true,
    },
});
