import { describe, expect, it } from 'vitest';

import type { VisLegacy } from '@iobroker/types-vis-2';
import { takeOverLegacyBinds, takeOverLegacyProperties } from './visLegacyObject';

/** what `createLegacyVisObject` does with the `vis` of the engine before, without the rest of the engine */
function createVis(oldVis: VisLegacy | undefined): VisLegacy {
    const vis = {
        version: 2,
        binds: takeOverLegacyBinds(oldVis),
        setValue: () => {},
        changeView: () => {},
    } as unknown as VisLegacy;
    return takeOverLegacyProperties(vis, oldVis);
}

describe('takeOverLegacyBinds', () => {
    it('creates the default binds the first time', () => {
        expect(takeOverLegacyBinds(undefined)).toEqual({
            basic: null,
            table: null,
            jqplot: null,
            jqueryui: null,
            swipe: null,
        });
    });

    it('keeps the widget sets that registered themselves in the vis of the engine before (#741)', () => {
        const first = createVis(undefined);
        const hqwidgets = { checkbox: {} };
        first.binds.hqwidgets = hqwidgets;

        const second = createVis(first);
        expect(second.binds.hqwidgets).toBe(hqwidgets);
        expect(second.binds.basic).toBeNull();
    });

    it('adds a missing default without overwriting the others', () => {
        const basic = { a: 1 };
        const binds = takeOverLegacyBinds({ binds: { basic } } as unknown as VisLegacy);
        expect(binds.basic).toBe(basic);
        expect(binds.swipe).toBeNull();
    });
});

describe('takeOverLegacyProperties', () => {
    it('keeps own properties of the widget sets, but not the functions of the engine before', () => {
        const first = createVis(undefined);
        const oldSetValue = first.setValue;
        (first as Record<string, any>).mySetData = { x: 1 };

        const second = createVis(first);
        expect((second as Record<string, any>).mySetData).toEqual({ x: 1 });
        expect(second.setValue).not.toBe(oldSetValue);
    });
});
