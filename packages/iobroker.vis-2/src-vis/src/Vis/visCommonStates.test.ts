import { describe, expect, it } from 'vitest';

import { getCommonStateText } from './visCommonStates';
import VisFormatUtils from './visFormatUtils';
import { extractBinding } from './visUtils';

describe('getCommonStateText', () => {
    it('reads the object form', () => {
        const states = { 0: 'Closed', 1: 'Tilted', 2: 'Open' };
        expect(getCommonStateText(states, 2, 'en')).toBe('Open');
        expect(getCommonStateText(states, '1', 'en')).toBe('Tilted');
        expect(getCommonStateText(states, 3, 'en')).toBeUndefined();
    });

    it('takes a boolean as the key it is written as', () => {
        const states = { true: 'An', false: 'Aus' };
        expect(getCommonStateText(states, true, 'de')).toBe('An');
        expect(getCommonStateText(states, false, 'de')).toBe('Aus');
        expect(getCommonStateText(states, 'true', 'de')).toBe('An');
    });

    it('reads the array form, whose index is the value', () => {
        const states = ['Off', 'Auto', 'Manual'];
        expect(getCommonStateText(states, 1, 'en')).toBe('Auto');
        expect(getCommonStateText(states, '2', 'en')).toBe('Manual');
        expect(getCommonStateText(states, 1.5, 'en')).toBeUndefined();
        expect(getCommonStateText(states, 5, 'en')).toBeUndefined();
    });

    it('reads the old text form', () => {
        const states = '0:Closed; 1:Open ;2:Locked:hard';
        expect(getCommonStateText(states, 1, 'en')).toBe('Open');
        expect(getCommonStateText(states, '2', 'en')).toBe('Locked:hard');
        expect(getCommonStateText(states, 3, 'en')).toBeUndefined();
    });

    it('picks the language of a text in several languages', () => {
        const states = { 1: { en: 'Open', de: 'Offen' }, 2: { en: 'Closed' } };
        expect(getCommonStateText(states, 1, 'de')).toBe('Offen');
        expect(getCommonStateText(states, 2, 'de')).toBe('Closed');
    });

    it('has nothing for a missing value or list', () => {
        expect(getCommonStateText(undefined, 1, 'en')).toBeUndefined();
        expect(getCommonStateText(null, 1, 'en')).toBeUndefined();
        expect(getCommonStateText({ 1: 'x' }, null, 'en')).toBeUndefined();
        expect(getCommonStateText({ 1: 'x' }, undefined, 'en')).toBeUndefined();
    });
});

describe('the states operation of a binding', () => {
    it('is parsed with and without the text for a value not in the list', () => {
        expect(extractBinding('{a.0.window;states}')?.[0].operations).toEqual([{ op: 'states' }]);
        expect(extractBinding('{a.0.window;states(unbekannt)}')?.[0].operations).toEqual([
            { op: 'states', arg: 'unbekannt' },
        ]);
        expect(extractBinding('{a.0.mode;round;states}')?.[0].operations).toEqual([{ op: 'round' }, { op: 'states' }]);
        expect(extractBinding('{a.0.window;states}')?.[0].systemOid).toBe('a.0.window');
    });

    const objects: Record<string, ioBroker.Object> = {
        'a.0.window': { _id: 'a.0.window', type: 'state', common: { states: { 0: 'Zu', 1: 'Gekippt', 2: 'Offen' } } },
        'a.0.plain': { _id: 'a.0.plain', type: 'state', common: {} },
    } as unknown as Record<string, ioBroker.Object>;

    const make = (
        visObjects: Record<string, ioBroker.Object> = {},
    ): { utils: VisFormatUtils; reads: string[]; format: (binding: string, value: unknown) => string } => {
        const reads: string[] = [];
        const utils = new VisFormatUtils({
            vis: { editMode: false, states: {}, language: 'de', objects: visObjects } as any,
            getObject: id => {
                reads.push(id);
                return Promise.resolve(objects[id] || null);
            },
        });
        const format = (binding: string, value: unknown): string =>
            utils.formatBinding({
                format: binding,
                view: 'v',
                wid: 'w000001',
                widget: { tpl: '', data: {}, style: {} } as any,
                widgetData: {},
                values: { 'a.0.window.val': value, 'a.0.plain.val': value, 'a.0.mode.val': value },
                moment: undefined,
            });
        return { utils, reads, format };
    };

    it('gives the value until the object came in, then its text, and reads the object once', async () => {
        const { utils, reads, format } = make();
        const told: string[] = [];
        const stop = utils.onCommonStates?.(id => told.push(id));

        expect(format('Fenster: {a.0.window;states}', 2)).toBe('Fenster: 2');
        expect(format('Fenster: {a.0.window;states}', 1)).toBe('Fenster: 1');
        await Promise.resolve();
        await Promise.resolve();
        expect(told).toEqual(['a.0.window']);
        expect(format('Fenster: {a.0.window;states}', 2)).toBe('Fenster: Offen');
        expect(format('{a.0.window;states}', '0')).toBe('Zu');
        expect(reads).toEqual(['a.0.window']);

        stop?.();
        expect(format('{a.0.window;states}', 1)).toBe('Gekippt');
    });

    it('shows the text of the operation for a value not in the list, and only then', async () => {
        const { format } = make();
        // the list is not there yet: the value, not the text for "not in the list"
        expect(format('{a.0.window;states(unbekannt)}', 7)).toBe('7');
        await Promise.resolve();
        await Promise.resolve();
        expect(format('{a.0.window;states(unbekannt)}', 7)).toBe('unbekannt');
        expect(format('{a.0.window;states(unbekannt)}', 2)).toBe('Offen');
        expect(format('{a.0.window;states}', 7)).toBe('7');
    });

    it('keeps the value of an object without a list, and tells nobody', async () => {
        const { utils, format } = make();
        const told: string[] = [];
        utils.onCommonStates?.(id => told.push(id));
        format('{a.0.plain;states(unbekannt)}', 5);
        await Promise.resolve();
        await Promise.resolve();
        expect(told).toEqual([]);
        expect(format('{a.0.plain;states(unbekannt)}', 5)).toBe('5');
    });

    it('takes the objects of the editor at once', () => {
        const { reads, format } = make(objects);
        expect(format('{a.0.window;states}', 1)).toBe('Gekippt');
        expect(reads).toEqual([]);
    });

    it('comes after the other operations', async () => {
        const { format } = make();
        format('{a.0.window;states}', 0);
        await Promise.resolve();
        await Promise.resolve();
        expect(format('{a.0.window;round;states}', 1.6)).toBe('Offen');
    });
});
