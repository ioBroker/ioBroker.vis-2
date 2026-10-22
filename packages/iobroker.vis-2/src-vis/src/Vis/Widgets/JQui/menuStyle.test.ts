import { describe, expect, it } from 'vitest';

import { getMenuStyle } from './menuStyle';

describe('getMenuStyle', () => {
    // #573: the list of a select kept the dark paper of the theme around items in the colors of the widget
    it('takes the background and the color of the widget', () => {
        expect(
            getMenuStyle({
                backgroundColor: '#ffffff',
                backgroundImage: 'linear-gradient(red, blue)',
                background: 'white',
                color: '#000000',
            }),
        ).toEqual({
            backgroundColor: '#ffffff',
            backgroundImage: 'linear-gradient(red, blue)',
            background: 'white',
            color: '#000000',
        });
    });

    it('leaves out everything else of the widget', () => {
        expect(
            getMenuStyle({ backgroundColor: 'white', fontSize: 20, borderWidth: '2px', textTransform: 'none' }),
        ).toEqual({ backgroundColor: 'white' });
    });

    it('keeps the theme for a widget without colors', () => {
        expect(getMenuStyle({})).toEqual({});
        expect(getMenuStyle({ backgroundColor: '', color: undefined })).toEqual({});
    });
});
