import { describe, expect, it } from 'vitest';

import { getMenuStyle, isTransparent } from './menuStyle';

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

    it('keeps the paper of the theme under a transparent background, so the view does not shine through', () => {
        expect(getMenuStyle({ backgroundColor: 'transparent', background: 'none', color: '#ffffff' })).toEqual({
            color: '#ffffff',
        });
        expect(getMenuStyle({ backgroundColor: 'rgba(0, 0, 0, 0)' })).toEqual({});
    });

    it('tells transparent backgrounds from those that cover', () => {
        [
            'transparent',
            ' Transparent ',
            'none',
            'inherit',
            'rgba(255, 255, 255, 0)',
            'rgba(0,0,0,0.0)',
            'hsla(0, 0%, 100%, 0)',
            'rgb(0 0 0 / 0)',
            'rgb(0 0 0 / 0%)',
            '#fff0',
            '#ffffff00',
        ].forEach(value => expect(isTransparent(value), value).toBe(true));
        [
            'white',
            '#ffffff',
            '#fff',
            'rgba(0, 0, 0, 0.5)',
            'rgba(0, 0, 0, 1)',
            'rgb(0 0 0 / 50%)',
            'rgb(10, 20, 0)',
            'linear-gradient(red, blue)',
        ].forEach(value => expect(isTransparent(value), value).toBe(false));
    });

    it('keeps the theme for a widget without colors', () => {
        expect(getMenuStyle({})).toEqual({});
        expect(getMenuStyle({ backgroundColor: '', color: undefined })).toEqual({});
    });
});
