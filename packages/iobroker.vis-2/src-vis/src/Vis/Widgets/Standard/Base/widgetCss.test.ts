import { describe, expect, it } from 'vitest';

import { cssPixels, mergeFrame, NO_CSS, readWidgetCss, typedSize, withoutPadding } from './widgetCss';

describe('readWidgetCss', () => {
    it('leaves a widget without settings as it is', () => {
        expect(readWidgetCss(undefined)).toBe(NO_CSS);
        expect(readWidgetCss({})).toEqual({ text: {}, frame: {}, textAlign: undefined, align: undefined });
    });

    it('sorts the settings into how the text is written and what the card paints', () => {
        const css = readWidgetCss({
            color: 'red',
            'font-size': '30px',
            'font-style': 'italic',
            'font-weight': 'normal',
            'background-color': '#123456',
            'border-radius': '4px',
            'box-shadow': 'none',
            padding: '2px',
            // none of the frames has any business with these
            width: '100%',
            'z-index': 3,
        });

        expect(css.text).toEqual({ color: 'red', fontSize: '30px', fontStyle: 'italic', fontWeight: 'normal' });
        expect(css.frame).toEqual({
            backgroundColor: '#123456',
            borderRadius: '4px',
            boxShadow: 'none',
            padding: '2px',
        });
    });

    it('takes a bare number as pixels, as the editor offers one', () => {
        expect(readWidgetCss({ 'font-size': '24' }).text.fontSize).toBe(24);
    });

    it('skips what is empty', () => {
        expect(readWidgetCss({ color: '', 'font-size': null }).text).toEqual({});
    });

    it('turns text-align into the side a flex box understands', () => {
        expect(readWidgetCss({ 'text-align': 'right' })).toMatchObject({ textAlign: 'right', align: 'flex-end' });
        expect(readWidgetCss({ 'text-align': 'center' }).align).toBe('center');
        expect(readWidgetCss({ 'text-align': 'justify' }).align).toBeUndefined();
    });
});

describe('mergeFrame', () => {
    const defaults = {
        background: 'white',
        borderColor: 'grey',
        borderStyle: 'solid',
        borderWidth: 1,
        paddingTop: 16,
        paddingRight: 16,
        paddingBottom: 16,
        paddingLeft: 16,
    };

    it('keeps the card as it is when nothing was set', () => {
        expect(mergeFrame(defaults, {})).toEqual(defaults);
    });

    it('lets a long form replace only its own part', () => {
        const merged = mergeFrame(defaults, { borderColor: 'red', paddingLeft: 40 });
        expect(merged).toMatchObject({ borderColor: 'red', borderStyle: 'solid', borderWidth: 1 });
        expect(merged).toMatchObject({ paddingLeft: 40, paddingTop: 16 });
    });

    it('never leaves a short form beside its long forms', () => {
        const merged = mergeFrame(defaults, { border: '2px dashed red', padding: 4 });
        expect(merged.border).toBe('2px dashed red');
        expect(merged.padding).toBe(4);
        ['borderColor', 'borderStyle', 'borderWidth', 'paddingLeft', 'paddingTop'].forEach(name =>
            expect(merged).not.toHaveProperty(name),
        );
    });

    it('gives up the background of the card for any background that was set', () => {
        expect(mergeFrame(defaults, { backgroundColor: 'red' })).not.toHaveProperty('background');
        expect(mergeFrame(defaults, { backgroundImage: 'url(a.png)' })).not.toHaveProperty('background');
        expect(mergeFrame(defaults, { background: 'red' }).background).toBe('red');
        // how an image is placed says nothing about the colour
        expect(mergeFrame(defaults, { backgroundSize: 'cover' }).background).toBe('white');
    });
});

describe('the small helpers', () => {
    it('withoutPadding leaves what a marker paints', () => {
        expect(withoutPadding({ padding: 2, paddingLeft: 3, boxShadow: 'none' })).toEqual({ boxShadow: 'none' });
    });

    it('typedSize knows a size from a field that stayed empty', () => {
        expect(typedSize('18')).toBe(18);
        expect(typedSize(18)).toBe(18);
        expect(typedSize('')).toBeUndefined();
        expect(typedSize(0)).toBeUndefined();
        expect(typedSize(undefined)).toBeUndefined();
    });

    it('cssPixels only answers for pixels', () => {
        expect(cssPixels(24)).toBe(24);
        expect(cssPixels('24px')).toBe(24);
        expect(cssPixels('2em')).toBeUndefined();
        expect(cssPixels('large')).toBeUndefined();
        expect(cssPixels(undefined)).toBeUndefined();
    });
});
