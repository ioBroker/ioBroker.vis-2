import { describe, expect, it } from 'vitest';

import { newWidgetStyle } from './aiTools';

// `visDefaultStyle` of the arc gauge of vis-2-widgets-gauges: a type that declares itself relative
const GAUGE = { width: '100%', height: 220, position: 'relative', absoluteWidth: 240 } as const;

describe('newWidgetStyle', () => {
    it('puts a relative type at the place the model gave on a plan', () => {
        const style = newWidgetStyle(false, GAUGE, { left: '640px', top: '110px', width: '390px', height: '330px' });
        expect(style.position).toBe('absolute');
        expect(style.left).toBe('640px');
        expect(style.top).toBe('110px');
        expect(style.width).toBe('390px');
        expect(style.height).toBe('330px');
        expect(style.absoluteWidth).toBeUndefined();
    });

    it('gives a relative type its own width on a plan instead of the width of the page', () => {
        const style = newWidgetStyle(false, GAUGE, { left: 10, top: 10 });
        expect(style.position).toBe('absolute');
        expect(style.width).toBe(240);
        expect(style.height).toBe(220);
    });

    it('keeps a relative widget on a plan when the model asks for one', () => {
        const style = newWidgetStyle(false, GAUGE, { position: 'relative' });
        expect(style.position).toBe('relative');
        expect(style.width).toBe('100%');
    });

    it('places an absolute type with the defaults of a plan', () => {
        const style = newWidgetStyle(false, { width: 100, height: 40 }, undefined);
        expect(style).toMatchObject({ position: 'absolute', width: 100, height: 40, left: 20, top: 20 });
    });

    it('leaves the style of a tile in a grid to the type', () => {
        const style = newWidgetStyle(true, GAUGE, undefined);
        expect(style.position).toBe('relative');
        expect(style.width).toBe('100%');
        expect(style.left).toBeUndefined();
    });
});
