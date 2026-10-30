import { describe, expect, it } from 'vitest';

import type { ViewSettings } from '@iobroker/types-vis-2';

import { applyViewStyleBindings, defaultViewBackgroundColor, getViewStyleStateIds } from './visViewStyle';

const style = (props: Record<string, unknown>): ViewSettings['style'] => props;

describe('getViewStyleStateIds', () => {
    it('finds the states of the bindings in the CSS of a view', () => {
        expect(
            getViewStyleStateIds(
                style({
                    'background-color': "{test:0_userdata.0.test;test == true ? '#ffff00' : '#ff0000'}",
                    color: '{0_userdata.0.color}',
                    background_class: '{0_userdata.0.color}',
                }),
            ),
        ).toEqual(['0_userdata.0.test', '0_userdata.0.color']);
    });

    it('finds nothing without a binding', () => {
        expect(getViewStyleStateIds(style({ 'background-color': '#ff0000', 'background-size': 'cover' }))).toEqual([]);
        expect(getViewStyleStateIds(style({ color: '{username}' }))).toEqual([]);
        expect(getViewStyleStateIds(undefined)).toEqual([]);
        expect(getViewStyleStateIds(style({ display: null, 'background-size': '' }))).toEqual([]);
    });
});

describe('applyViewStyleBindings', () => {
    const format = (text: string): string => (text.includes('0_userdata.0.test') ? '#ffff00' : 'formatted');

    it('replaces every attribute that carries a binding', () => {
        expect(
            applyViewStyleBindings(
                style({
                    'background-color': "{test:0_userdata.0.test;test == true ? '#ffff00' : '#ff0000'}",
                    color: '{0_userdata.0.color}',
                    'background-size': 'cover',
                }),
                format,
            ),
        ).toEqual({ 'background-color': '#ffff00', color: 'formatted', 'background-size': 'cover' });
    });

    it('returns the same style without a binding, and does not change the stored one', () => {
        const plain = style({ 'background-color': '#ff0000' });
        expect(applyViewStyleBindings(plain, format)).toBe(plain);
        expect(applyViewStyleBindings(undefined, format)).toBeUndefined();

        const stored = style({ color: '{0_userdata.0.color}' });
        applyViewStyleBindings(stored, format);
        expect(stored).toEqual({ color: '{0_userdata.0.color}' });
    });
});

describe('defaultViewBackgroundColor', () => {
    it('gives a view without a background of its own the color of the theme', () => {
        expect(defaultViewBackgroundColor({}, '', undefined, 'light')).toBe('#fff');
        expect(defaultViewBackgroundColor({}, '', undefined, 'dark')).toBe('#000');
        expect(defaultViewBackgroundColor({}, '', {}, 'light')).toBe('#fff');
    });

    it('takes the colors of the widget that shows the view', () => {
        expect(defaultViewBackgroundColor({}, '', { backgroundColor: '#123456' }, 'light')).toBe('#123456');
        expect(defaultViewBackgroundColor({}, '', { themeType: 'dark' }, 'light')).toBe('#000');
    });

    it('gives none to a view that sets its background itself', () => {
        expect(defaultViewBackgroundColor({ backgroundColor: '#ff0000' }, '', undefined, 'light')).toBeNull();
        expect(defaultViewBackgroundColor({ background: 'red' }, '', undefined, 'dark')).toBeNull();
    });

    it('gives none to a view with a background class, whose own color it would cover (#511)', () => {
        expect(defaultViewBackgroundColor({}, 'hq-background-carbon-fibre', undefined, 'light')).toBeNull();
        expect(
            defaultViewBackgroundColor({}, 'hq-background-carbon-fibre1', { backgroundColor: '#123456' }, 'dark'),
        ).toBeNull();
        // a class that a binding makes empty is no class
        expect(defaultViewBackgroundColor({}, '  ', undefined, 'light')).toBe('#fff');
    });
});
