import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createStateValues, upgradeStateValues } from './visCanStates';

/**
 * The stand-in store has to behave like `can.Map` closely enough that the engine cannot tell the difference:
 * flat dotted keys, values mirrored onto the object itself, and everything collected while can.js was still
 * missing has to survive the upgrade - otherwise the states of the first seconds are silently lost.
 */

/** Just enough of `can.Map` to check what the upgrade does with it: flat keys, mirrored onto the instance */
class FakeCanMap {
    constructor(values: Record<string, any>) {
        this.attr(values);
    }

    attr(id: string | Record<string, any>, ...value: any[]): any {
        if (typeof id === 'object') {
            Object.keys(id).forEach(key => ((this as Record<string, any>)[key] = id[key]));
            return this;
        }
        if (!value.length) {
            return (this as Record<string, any>)[id];
        }
        (this as Record<string, any>)[id] = value[0];
        return this;
    }

    removeAttr(id: string): void {
        delete (this as Record<string, any>)[id];
    }
}

// the tests run without a DOM, and the store only ever reads `window.can` from it
(globalThis as any).window = {};

function loadCanJs(): void {
    (globalThis as any).window.can = { Map: FakeCanMap };
}

beforeEach(() => {
    delete (globalThis as any).window.can;
});

afterEach(() => {
    delete (globalThis as any).window.can;
});

describe('createStateValues', () => {
    it('is a can.Map as soon as can.js is loaded', () => {
        loadCanJs();
        expect(createStateValues()).toBeInstanceOf(FakeCanMap);
    });

    it('starts with the placeholder a vis-1 widget without an oid reads', () => {
        expect(createStateValues().attr('nothing_selected.val')).toBe(null);
    });

    it('reads and writes single values under their flat, dotted key - can.js would read a path there', () => {
        const values = createStateValues();
        values.attr('javascript.0.state.val', 5);

        expect(values.attr('javascript.0.state.val')).toBe(5);
        expect(values.attr('javascript.0.state.ack')).toBe(undefined);
    });

    it('writes a whole state at once', () => {
        const values = createStateValues();
        values.attr({ 'javascript.0.state.val': 5, 'javascript.0.state.ack': true });

        expect(values.attr('javascript.0.state.val')).toBe(5);
        expect(values.attr('javascript.0.state.ack')).toBe(true);
    });

    it('mirrors the values onto the store itself, like can.Map does', () => {
        const values = createStateValues();
        values.attr('javascript.0.state.val', 5);

        // `createCanState` asks this way whether an ID is known yet
        expect((values as Record<string, any>)['javascript.0.state.val']).toBe(5);
        expect((values as Record<string, any>)['javascript.0.other.val']).toBe(undefined);
    });

    it('tells a write of undefined from a read', () => {
        const values = createStateValues();
        values.attr('javascript.0.state.val', 5);
        values.attr('javascript.0.state.val', undefined);

        expect(values.attr('javascript.0.state.val')).toBe(undefined);
    });

    it('removes a value everywhere', () => {
        const values = createStateValues();
        values.attr('javascript.0.state.val', 5);
        values.removeAttr('javascript.0.state.val');

        expect(values.attr('javascript.0.state.val')).toBe(undefined);
        expect((values as Record<string, any>)['javascript.0.state.val']).toBe(undefined);
    });

    it('hands out everything collected so far, and only the values', () => {
        const values = createStateValues();
        values.attr('javascript.0.state.val', 5);

        expect((values.attr as () => Record<string, any>)()).toEqual({
            'nothing_selected.val': null,
            'javascript.0.state.val': 5,
        });
    });
});

describe('upgradeStateValues', () => {
    it('carries the collected values into the can.Map', () => {
        const values = createStateValues();
        values.attr({ 'javascript.0.state.val': 5, 'javascript.0.state.ack': true });

        loadCanJs();
        const upgraded = upgradeStateValues(values);

        expect(upgraded).toBeInstanceOf(FakeCanMap);
        expect(upgraded.attr('javascript.0.state.val')).toBe(5);
        expect(upgraded.attr('javascript.0.state.ack')).toBe(true);
        expect(upgraded.attr('nothing_selected.val')).toBe(null);
    });

    it('keeps the store as it is while can.js is still missing', () => {
        const values = createStateValues();

        expect(upgradeStateValues(values)).toBe(values);
    });

    it('leaves a store that is already a can.Map alone', () => {
        loadCanJs();
        const values = createStateValues();

        expect(upgradeStateValues(values)).toBe(values);
    });
});
