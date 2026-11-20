import { describe, expect, it } from 'vitest';

import { withAlpha } from './colorUtils';

describe('withAlpha', () => {
    it('makes a hex colour see-through, in every length', () => {
        expect(withAlpha('#147bf8', 0.133)).toBe('rgba(20, 123, 248, 0.133)');
        expect(withAlpha('#147BF8', 0.5)).toBe('rgba(20, 123, 248, 0.5)');
        expect(withAlpha('#fff', 0.4)).toBe('rgba(255, 255, 255, 0.4)');
        // a colour that is see-through already keeps that share of its own
        expect(withAlpha('#147bf880', 0.5)).toBe('rgba(20, 123, 248, 0.251)');
        expect(withAlpha('#0008', 1)).toBe('rgba(0, 0, 0, 0.533)');
    });

    it('takes the rgb() the colour picker of the editor stores', () => {
        expect(withAlpha('rgb(20, 123, 248)', 0.133)).toBe('rgba(20, 123, 248, 0.133)');
        expect(withAlpha('rgba(20, 123, 248, 0.5)', 0.5)).toBe('rgba(20, 123, 248, 0.25)');
        expect(withAlpha('rgb(20 123 248 / 50%)', 1)).toBe('rgba(20, 123, 248, 0.5)');
        expect(withAlpha('rgb(100%, 0%, 50%)', 1)).toBe('rgba(255, 0, 128, 1)');
    });

    it('leaves a notation it does not read to the browser', () => {
        expect(withAlpha('red', 0.133)).toBe('color-mix(in srgb, red 13.3%, transparent)');
        expect(withAlpha('hsl(210 90% 50%)', 0.5)).toBe('color-mix(in srgb, hsl(210 90% 50%) 50%, transparent)');
        expect(withAlpha('var(--accent)', 0.4)).toBe('color-mix(in srgb, var(--accent) 40%, transparent)');
    });

    it('gives no colour for none', () => {
        expect(withAlpha('', 0.5)).toBe('transparent');
        expect(withAlpha(undefined, 0.5)).toBe('transparent');
        expect(withAlpha(null, 0.5)).toBe('transparent');
    });
});
