import { describe, expect, it } from 'vitest';

import type { WidgetData } from '@iobroker/types-vis-2';

import { hasWidthVisibility, isShownAtWidth } from './visWidthVisibility';

const data = (min?: unknown, max?: unknown): WidgetData => ({
    'visibility-min-width': min,
    'visibility-max-width': max,
});

describe('isShownAtWidth', () => {
    it('shows a widget without widths at every width', () => {
        expect(isShownAtWidth({}, 320)).toBe(true);
        expect(isShownAtWidth(data(), 1920)).toBe(true);
    });

    it('shows a widget only from its minimal width on, that width included', () => {
        expect(isShownAtWidth(data(800), 799)).toBe(false);
        expect(isShownAtWidth(data(800), 800)).toBe(true);
        expect(isShownAtWidth(data(800), 1920)).toBe(true);
    });

    it('shows a widget only up to its maximal width, that width included', () => {
        expect(isShownAtWidth(data(undefined, 600), 600)).toBe(true);
        expect(isShownAtWidth(data(undefined, 600), 601)).toBe(false);
    });

    it('shows a widget with both only in between', () => {
        const tablet = data(600, 1200);
        expect(isShownAtWidth(tablet, 400)).toBe(false);
        expect(isShownAtWidth(tablet, 900)).toBe(true);
        expect(isShownAtWidth(tablet, 1400)).toBe(false);
    });

    it('reads widths that were stored as strings', () => {
        expect(isShownAtWidth(data('800'), 700)).toBe(false);
        expect(isShownAtWidth(data('800px'), 900)).toBe(true);
    });

    it('ignores what is no width', () => {
        expect(isShownAtWidth(data('', null), 100)).toBe(true);
        expect(isShownAtWidth(data('wide', 0), 100)).toBe(true);
        expect(isShownAtWidth(data(-5, true), 100)).toBe(true);
    });

    it('shows everything while the width is not known', () => {
        expect(isShownAtWidth(data(800), 0)).toBe(true);
        expect(isShownAtWidth(data(800), NaN)).toBe(true);
    });

    it('shows a widget that has no data at all', () => {
        expect(isShownAtWidth(undefined, 500)).toBe(true);
    });
});

describe('hasWidthVisibility', () => {
    it('tells whether a widget depends on the width of its view', () => {
        expect(hasWidthVisibility(data(800))).toBe(true);
        expect(hasWidthVisibility(data(undefined, '600'))).toBe(true);
        expect(hasWidthVisibility(data('', null))).toBe(false);
        expect(hasWidthVisibility({})).toBe(false);
        expect(hasWidthVisibility(undefined)).toBe(false);
    });
});
