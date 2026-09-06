import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as VisLoadLegacy from './visLoadLegacy';

/**
 * The loader is the one piece of the on-demand legacy libraries that can go wrong quietly: load twice, load
 * in the wrong order, or hand out a promise that never settles. It only touches `document.createElement`,
 * `document.head.appendChild` and `window`, so a handful of stubs is enough - no DOM library needed.
 */

interface FakeScript {
    src: string;
    onload?: () => void;
    onerror?: () => void;
}

/** src of everything that was appended, in the order it was appended */
let appended: string[];
/** src values that should fail to load instead of succeeding */
let failing: string[];

function installDom(): void {
    appended = [];
    failing = [];

    const head = {
        appendChild(element: FakeScript & { rel?: string; href?: string }): void {
            appended.push(element.src ?? element.href!);
            if (!element.src) {
                // a stylesheet, nobody waits for it
                return;
            }
            // the browser answers later, never in the same tick
            setTimeout(() => {
                if (failing.includes(element.src)) {
                    element.onerror?.();
                } else {
                    if (element.src.includes('jquery-1')) {
                        (globalThis as any).window.$ = () => undefined;
                    }
                    if (element.src.includes('can.custom')) {
                        (globalThis as any).window.can = { Map: class {} };
                    }
                    element.onload?.();
                }
            }, 0);
        },
    };

    (globalThis as any).window = {};
    (globalThis as any).document = {
        head,
        createElement: (): FakeScript => ({}) as FakeScript,
    };
}

async function load(): Promise<typeof VisLoadLegacy> {
    vi.resetModules();
    return import('./visLoadLegacy');
}

beforeEach(installDom);

afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).document;
});

describe('ensureLegacyLibs', () => {
    it('loads the libraries in the order they build on each other', async () => {
        const { ensureLegacyLibs } = await load();
        await ensureLegacyLibs();

        expect(appended).toEqual([
            'lib/css/jquery.multiselect-1.13.css',
            'lib/js/jquery-1.11.2.min.js',
            'lib/js/jquery-ui-1.11.4.full.min.js',
            'lib/js/can.custom.js',
            'lib/js/jquery.multiselect-1.13.min.js',
            'lib/js/quo.standalone.js',
        ]);
    });

    it('waits for the last one before it resolves', async () => {
        const { ensureLegacyLibs, isLegacyLibsLoaded } = await load();
        expect(isLegacyLibsLoaded()).toBe(false);
        await ensureLegacyLibs();
        expect(isLegacyLibsLoaded()).toBe(true);
    });

    it('loads nothing a second time', async () => {
        const { ensureLegacyLibs } = await load();
        await ensureLegacyLibs();
        const afterFirst = appended.length;
        await ensureLegacyLibs();
        expect(appended.length).toBe(afterFirst);
    });

    it('gives everybody who asks at once the same single load', async () => {
        const { ensureLegacyLibs } = await load();
        await Promise.all([ensureLegacyLibs(), ensureLegacyLibs(), ensureLegacyLibs()]);
        expect(appended.filter(src => src.includes('jquery-1'))).toHaveLength(1);
    });

    it('lets the next caller try again after a failure', async () => {
        const { ensureLegacyLibs } = await load();
        failing = ['lib/js/can.custom.js'];

        await expect(ensureLegacyLibs()).rejects.toThrow('can.custom.js');

        // the broken promise must not be handed out again, or nothing would ever load
        failing = [];
        await ensureLegacyLibs();
        expect(appended.filter(src => src.includes('can.custom'))).toHaveLength(2);
    });
});

describe('onLegacyLibsLoaded', () => {
    it('does not fetch anything on its own', async () => {
        const { onLegacyLibsLoaded } = await load();
        const callback = vi.fn();
        onLegacyLibsLoaded(callback);

        await new Promise(resolve => setTimeout(resolve, 5));
        expect(appended).toEqual([]);
        expect(callback).not.toHaveBeenCalled();
    });

    it('runs once somebody else asks for the libraries', async () => {
        const { ensureLegacyLibs, onLegacyLibsLoaded } = await load();
        const callback = vi.fn();
        onLegacyLibsLoaded(callback);

        await ensureLegacyLibs();
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('runs straight away when the libraries are already there', async () => {
        const { ensureLegacyLibs, onLegacyLibsLoaded } = await load();
        await ensureLegacyLibs();

        const callback = vi.fn();
        onLegacyLibsLoaded(callback);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('runs a callback only once, not again on a later call', async () => {
        const { ensureLegacyLibs, onLegacyLibsLoaded } = await load();
        const callback = vi.fn();
        onLegacyLibsLoaded(callback);

        await ensureLegacyLibs();
        await ensureLegacyLibs();
        expect(callback).toHaveBeenCalledTimes(1);
    });
});
