import { describe, expect, it } from 'vitest';

import JQuiState from './JQuiState';

/** "States control" as far as getListData() needs it */
const widget = (rxData: Record<string, unknown>, object: unknown): Record<string, any> => ({
    state: { rxData: { count: 1, value1: '0', text1: 'Generated', ...rxData }, object },
    listData: null,
});

const object = (states: unknown): unknown => ({ _id: 'x', common: { type: 'string', states }, type: 'state' });

const getListData = (w: Record<string, any>): Record<string, unknown> =>
    JQuiState.prototype.getListData.call(w as unknown as JQuiState);

describe('JQuiState values from the object (#482)', () => {
    it('renders the list of the object when the option is set', () => {
        const data = getListData(widget({ statesFromObject: true }, object({ 0: 'Off', 1: 'On', 2: 'Auto' })));
        expect(data).toMatchObject({ count: 3, value1: '0', text1: 'Off', value3: '2', text3: 'Auto' });
    });

    it('renders the list of the widget without the option', () => {
        const w = widget({ statesFromObject: false }, object({ 0: 'Off', 1: 'On' }));
        expect(getListData(w)).toBe(w.state.rxData);
    });

    it('renders the list of the widget while the object is not read or has no list', () => {
        for (const obj of [null, false, object(undefined)]) {
            const w = widget({ statesFromObject: true }, obj);
            expect(getListData(w)).toBe(w.state.rxData);
        }
    });

    it('builds the list once per data and object', () => {
        const w = widget({ statesFromObject: true }, object({ a: 'A' }));
        const first = getListData(w);
        expect(getListData(w)).toBe(first);
        w.state = { ...w.state, object: object({ a: 'A', b: 'B' }) };
        expect(getListData(w)).not.toBe(first);
        expect(getListData(w).count).toBe(2);
    });
});
