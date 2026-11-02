import { describe, expect, it } from 'vitest';

import { isHiddenInPalette } from './paletteFilter';

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
