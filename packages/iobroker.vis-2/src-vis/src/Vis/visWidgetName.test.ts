import { describe, expect, it } from 'vitest';

import { getWidgetName, hasOwnNameAttribute, OWN_NAME_ATTR, widgetNameAttr } from './visWidgetName';

describe('getWidgetName', () => {
    it('is the name kept beside an attribute `name` of the widget, where there is one', () => {
        expect(getWidgetName({ name: 'Anna', [OWN_NAME_ATTR]: 'Greeting (heading)' })).toBe('Greeting (heading)');
    });

    it('is `data.name` for every other widget, as it always was', () => {
        expect(getWidgetName({ name: 'Kitchen light' })).toBe('Kitchen light');
        expect(getWidgetName({ name: 5 })).toBe('5');
    });

    it('is nothing for a widget without a name', () => {
        expect(getWidgetName({})).toBe('');
        expect(getWidgetName(null)).toBe('');
    });
});

describe('hasOwnNameAttribute', () => {
    it('finds an attribute called `name` in any group', () => {
        expect(hasOwnNameAttribute([{ fields: [{ name: 'oid' }] }, { fields: [{ name: 'name' }] }])).toBe(true);
    });

    it('finds none where the widget has no such attribute', () => {
        expect(hasOwnNameAttribute([{ fields: [{ name: 'oid' }, { name: 'widgetTitle' }] }])).toBe(false);
        expect(hasOwnNameAttribute(null)).toBe(false);
    });
});

describe('widgetNameAttr', () => {
    it('keeps the name in `data.name` unless the widget needs that for itself', () => {
        expect(widgetNameAttr(false)).toBe('name');
        expect(widgetNameAttr(true)).toBe(OWN_NAME_ATTR);
    });
});
