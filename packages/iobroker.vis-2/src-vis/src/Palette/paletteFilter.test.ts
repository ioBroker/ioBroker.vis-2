import { describe, expect, it } from 'vitest';

import { getWebComponentsWithNativeWidget, isHiddenInPalette } from './paletteFilter';

describe('isHiddenInPalette (#504)', () => {
    it('shows vis-1 and vis-2 widgets by default', () => {
        expect(isHiddenInPalette({ rx: true }, false)).toBe(false);
        expect(isHiddenInPalette({ rx: false }, false)).toBe(false);
        expect(isHiddenInPalette({}, false)).toBe(false);
    });

    it('leaves the vis-1 widgets out with "Hide vis-1 widgets"', () => {
        expect(isHiddenInPalette({ rx: false }, true)).toBe(true);
        // a vis-1 widget type carries no rx flag at all
        expect(isHiddenInPalette({}, true)).toBe(true);
        expect(isHiddenInPalette({ rx: true }, true)).toBe(false);
    });

    it('keeps a widget hidden that hides itself', () => {
        expect(isHiddenInPalette({ rx: true, hidden: true }, false)).toBe(true);
        expect(isHiddenInPalette({ rx: true, hidden: true }, true)).toBe(true);
    });
});

describe('getWebComponentsWithNativeWidget', () => {
    it('leaves out the web component when its adapter brings a vis-2 widget of the same name', () => {
        const replaced = getWebComponentsWithNativeWidget([
            { name: 'tplFlowDiagram', set: 'flow', title: 'Fluss-Diagramm' },
            { name: 'tplWc_iob-flow-diagram', set: 'flow', title: 'fluss-diagramm ' },
        ]);
        expect([...replaced]).toEqual(['tplWc_iob-flow-diagram']);
    });

    it('keeps a web component with another name, or with the same name in another set', () => {
        expect(
            getWebComponentsWithNativeWidget([
                { name: 'tplFlowDiagram', set: 'flow', title: 'Fluss-Diagramm' },
                { name: 'tplWc_iob-flow-tile', set: 'flow', title: 'Fluss-Kachel' },
                { name: 'tplWc_iob-other-diagram', set: 'other', title: 'Fluss-Diagramm' },
            ]).size,
        ).toBe(0);
    });

    it('does not let two web components replace each other, nor an empty name match', () => {
        expect(
            getWebComponentsWithNativeWidget([
                { name: 'tplWc_a', set: 'x', title: 'Tile' },
                { name: 'tplWc_b', set: 'x', title: 'Tile' },
                { name: 'tplNative', set: 'x', title: '' },
                { name: 'tplWc_c', set: 'x', title: '' },
            ]).size,
        ).toBe(0);
    });
});
