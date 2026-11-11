import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import type { VisTheme } from '@iobroker/types-vis-2';

import StandardFrame, { type StandardFrameProps } from './StandardFrame';
import { TOKENS } from './tokens';

/**
 * A card without a name gives its room to the content: the icon goes in front of the value, and without an icon
 * as well the content starts at the top edge - instead of under an empty header.
 */
const theme = {
    palette: {
        mode: 'dark',
        text: { primary: '#fff', secondary: '#aaa' },
        background: { paper: '#111' },
        divider: '#333',
    },
} as unknown as VisTheme;

const ICON = createElement('i', { id: 'icon' });
const VALUE = createElement('b', { id: 'value' }, 'On');
const CONTROL = createElement('u', { id: 'control' });
const BODY = createElement('s', { id: 'body' });

type Element = ReactElement<{ id?: string; style?: Record<string, unknown>; children?: ReactNode }>;

function kids(element: Element): Element[] {
    return Children.toArray(element.props.children).filter(isValidElement) as Element[];
}

function contains(element: Element, id: string): boolean {
    return element.props.id === id || kids(element).some(child => contains(child, id));
}

function containsText(element: Element, text: string): boolean {
    return Children.toArray(element.props.children).some(child =>
        isValidElement(child) ? containsText(child as Element, text) : child === text,
    );
}

/** The rows of the card from top to bottom: the children of the column the default layout is made of */
function rows(props: Partial<StandardFrameProps>): Element[] {
    const card = StandardFrame({ layout: 'default', accent: '#0f0', tokens: TOKENS, theme, ...props }) as Element;
    const [column] = kids(card);
    return kids(column);
}

describe('StandardFrame without a name', () => {
    it('keeps the icon and the name on top and the value at the bottom edge, as before', () => {
        const [top, bottom, ...rest] = rows({ title: 'Lamp', icon: ICON, value: VALUE, control: CONTROL });

        expect(rest).toHaveLength(0);
        expect(contains(top, 'icon')).toBe(true);
        expect(containsText(top, 'Lamp')).toBe(true);
        expect(contains(top, 'value')).toBe(false);
        expect(contains(bottom, 'value')).toBe(true);
        expect(contains(bottom, 'control')).toBe(true);
    });

    it('puts the icon in front of the value and moves that row up, so one row is enough', () => {
        const all = rows({ icon: ICON, value: VALUE, control: CONTROL });

        expect(all).toHaveLength(1);
        expect(contains(all[0], 'icon')).toBe(true);
        expect(contains(all[0], 'value')).toBe(true);
        expect(contains(all[0], 'control')).toBe(true);
    });

    it('moves a control without a value up as well', () => {
        const all = rows({ icon: ICON, control: CONTROL });

        expect(all).toHaveLength(1);
        expect(contains(all[0], 'icon')).toBe(true);
        expect(contains(all[0], 'control')).toBe(true);
    });

    it('starts with the drawing when there is neither a name nor an icon - no empty header in front of it', () => {
        const [first, second] = rows({ body: BODY, value: VALUE });

        expect(contains(first, 'body')).toBe(true);
        expect(contains(second, 'value')).toBe(true);
    });

    it('keeps the icon on a row of its own above a drawing, which has no row to join', () => {
        const [first, second] = rows({ icon: ICON, body: BODY });

        expect(contains(first, 'icon')).toBe(true);
        expect(contains(first, 'body')).toBe(false);
        expect(contains(second, 'body')).toBe(true);
    });
});

describe('StandardFrame in one row', () => {
    it('keeps the value and the control at the right edge without a name', () => {
        const card = StandardFrame({
            layout: 'compact',
            accent: '#0f0',
            tokens: TOKENS,
            theme,
            icon: ICON,
            value: VALUE,
            control: CONTROL,
        }) as Element;
        const [row] = kids(card);

        expect(kids(row).some(child => child.props.style?.flex === 1)).toBe(true);
    });
});
