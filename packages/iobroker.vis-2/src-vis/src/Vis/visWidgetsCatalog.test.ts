import { describe, expect, it } from 'vitest';

import type { RxWidgetInfoGroup } from '@iobroker/types-vis-2';

import { applyDefaultsOfNewFields } from './visWidgetsCatalog';

/**
 * The defaults of an indexed group (#509): its fields only exist once the attribute named in `indexTo` says how
 * many of the group there are, so they were never written - neither when the widget was created nor when the
 * count grew later.
 */

const PARAMS: RxWidgetInfoGroup[] = [
    {
        name: 'common',
        fields: [
            { name: 'count', type: 'number', default: 2 },
            { name: 'title', type: 'text', default: 'Hello' },
        ],
    },
    {
        name: 'value',
        indexFrom: 1,
        indexTo: 'count',
        fields: [
            { name: 'iconSize', type: 'number', default: 24 },
            { name: 'text', type: 'text' },
        ],
    },
];

describe('applyDefaultsOfNewFields', () => {
    it('writes the defaults of a new widget, also of the groups its count opens', () => {
        const data: Record<string, any> = { count: 2 };
        expect(applyDefaultsOfNewFields(PARAMS, null, data)).toBe(true);

        expect(data.title).toBe('Hello');
        expect(data.iconSize1).toBe(24);
        expect(data.iconSize2).toBe(24);
        expect(data.iconSize3).toBeUndefined();
        expect(data['g_value-1']).toBe(true);
        // no default, nothing written
        expect('text1' in data).toBe(false);
    });

    it('opens the groups with the default of the count itself', () => {
        const data: Record<string, any> = {};
        applyDefaultsOfNewFields(PARAMS, null, data);

        expect(data.count).toBe(2);
        expect(data.iconSize1).toBe(24);
        expect(data.iconSize2).toBe(24);
    });

    it('writes the defaults of the groups a growing count opens', () => {
        const oldData = { count: 1, iconSize1: 30 };
        const newData: Record<string, any> = { ...oldData, count: 3 };
        expect(applyDefaultsOfNewFields(PARAMS, oldData, newData)).toBe(true);

        expect(newData.iconSize1).toBe(30);
        expect(newData.iconSize2).toBe(24);
        expect(newData.iconSize3).toBe(24);
    });

    it('leaves the fields that were there before as they are, even when they are empty', () => {
        // `title` has a default but the user cleared it - that is not for us to undo
        const oldData = { count: 2, title: '', iconSize1: null, iconSize2: undefined };
        const newData: Record<string, any> = { ...oldData };
        expect(applyDefaultsOfNewFields(PARAMS, oldData, newData)).toBe(false);

        expect(newData.title).toBe('');
        expect(newData.iconSize1).toBeNull();
        expect(newData.iconSize2).toBeUndefined();
    });

    it('keeps the values a group had before the count went down and up again', () => {
        const oldData = { count: 1, iconSize1: 24, iconSize2: 48 };
        const newData: Record<string, any> = { ...oldData, count: 2 };
        applyDefaultsOfNewFields(PARAMS, oldData, newData);

        expect(newData.iconSize2).toBe(48);
    });

    it('writes nothing when the count shrinks or is no number', () => {
        for (const count of [0, '', 'abc', null, undefined, -1]) {
            const oldData = { count: 2, iconSize1: 24, iconSize2: 24 };
            const newData: Record<string, any> = { ...oldData, count };
            expect(applyDefaultsOfNewFields(PARAMS, oldData, newData)).toBe(false);
            expect(newData).toEqual({ ...oldData, count });
        }
    });

    it('knows the groups of a fixed count from the start', () => {
        const params: RxWidgetInfoGroup[] = [
            // a number is allowed (SCHEMA.md), the published type only knows the name of an attribute
            {
                name: 'value',
                indexFrom: 1,
                indexTo: 2 as unknown as string,
                fields: [{ name: 'size', type: 'number', default: 5 }],
            },
        ];
        const data: Record<string, any> = {};
        applyDefaultsOfNewFields(params, null, data);
        expect(data).toMatchObject({ size1: 5, size2: 5 });
    });
});
