import type React from 'react';

/**
 * The CSS settings of a widget, for what is drawn inside it.
 *
 * The editor writes these settings onto the outer box of a widget. That is enough for what a child simply inherits,
 * and for nothing else on a card: the value brings its own size, weight and colour, and the card paints its own
 * background and frame over whatever the outer box carries. So the frames ask for these here: what was set in the
 * attributes wins over what they would have drawn by themselves, and what was not set changes nothing.
 */
export interface WidgetCss {
    /** How the text is written. The size belongs to the value; the name has a size of its own */
    text: React.CSSProperties;
    /** What the card paints: its background, its frame, its shadow and the air inside it */
    frame: React.CSSProperties;
    /** The `text-align` that was set, for the text that stands in a line of its own */
    textAlign?: React.CSSProperties['textAlign'];
    /** The same for what is laid out as a flex box, which does not care for `text-align` */
    align?: 'flex-start' | 'center' | 'flex-end';
}

const TEXT_STYLES = [
    'color',
    'font-family',
    'font-size',
    'font-style',
    'font-variant',
    'font-weight',
    'letter-spacing',
    'line-height',
    'text-shadow',
    'word-spacing',
];

const FRAME_STYLES = [
    'background',
    'background-attachment',
    'background-clip',
    'background-color',
    'background-image',
    'background-origin',
    'background-position',
    'background-repeat',
    'background-size',
    'border',
    'border-color',
    'border-radius',
    'border-style',
    'border-width',
    'box-shadow',
    'padding',
    'padding-bottom',
    'padding-left',
    'padding-right',
    'padding-top',
];

const PADDINGS = ['padding', 'paddingBottom', 'paddingLeft', 'paddingRight', 'paddingTop'];

const ALIGN: Record<string, WidgetCss['align']> = {
    left: 'flex-start',
    start: 'flex-start',
    center: 'center',
    right: 'flex-end',
    end: 'flex-end',
};

/** A widget without any of these settings */
export const NO_CSS: WidgetCss = { text: {}, frame: {} };

/** What is written in the setting, with a bare number as pixels; nothing where it is empty */
function cssValue(value: unknown): string | number | undefined {
    if (value === null || value === undefined || value === '') {
        return undefined;
    }
    if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) {
        return parseFloat(value);
    }
    return typeof value === 'string' || typeof value === 'number' ? value : undefined;
}

function pick(style: Record<string, unknown>, names: string[]): React.CSSProperties {
    const picked: Record<string, string | number> = {};
    for (const name of names) {
        const value = cssValue(style[name]);
        if (value !== undefined) {
            picked[name.replace(/-(\w)/g, (_all, letter: string) => letter.toUpperCase())] = value;
        }
    }
    return picked;
}

/**
 * The settings a widget carries that the frames have to know about.
 *
 * @param style - the style of the widget as the project holds it
 */
export function readWidgetCss(style: unknown): WidgetCss {
    if (!style) {
        return NO_CSS;
    }
    const all = style as Record<string, unknown>;
    const textAlign = typeof all['text-align'] === 'string' ? all['text-align'] : undefined;

    return {
        text: pick(all, TEXT_STYLES),
        frame: pick(all, FRAME_STYLES),
        textAlign: (textAlign || undefined) as WidgetCss['textAlign'],
        align: textAlign ? ALIGN[textAlign] : undefined,
    };
}

/**
 * What a card paints by itself, with what was set in the attributes over it.
 *
 * A short form and its long forms must not stand side by side: when the long one is taken back in the editor,
 * React removes it and the part it stood for is then gone from the short one as well, until the page is loaded
 * again. So the defaults are given in the long forms, and a short form that was set replaces them.
 *
 * @param defaults - what the card looks like when nothing was set
 * @param frame - what was set
 */
export function mergeFrame(defaults: React.CSSProperties, frame: React.CSSProperties): React.CSSProperties {
    const merged: React.CSSProperties = { ...defaults };
    if (frame.background !== undefined || frame.backgroundColor !== undefined || frame.backgroundImage !== undefined) {
        delete merged.background;
    }
    if (frame.border !== undefined) {
        delete merged.borderColor;
        delete merged.borderStyle;
        delete merged.borderWidth;
    }
    if (frame.padding !== undefined) {
        delete merged.paddingBottom;
        delete merged.paddingLeft;
        delete merged.paddingRight;
        delete merged.paddingTop;
    }
    return { ...merged, ...frame };
}

/**
 * The frame of a marker: it is the size of a coin and has no air inside it to give away, so the padding stays on
 * the box around it.
 *
 * @param frame - what was set
 */
export function withoutPadding(frame: React.CSSProperties): React.CSSProperties {
    const rest: Record<string, unknown> = { ...frame };
    PADDINGS.forEach(name => delete rest[name]);
    return rest;
}

/**
 * A size that was typed into a field of a widget, or nothing if it says none.
 *
 * @param value - what the widget carries
 */
export function typedSize(value: unknown): number | undefined {
    const size = typeof value === 'string' ? parseFloat(value) : value;
    return typeof size === 'number' && isFinite(size) && size > 0 ? size : undefined;
}

/** A size in px, or a share of the room the thing has, as `60%` */
export type TypedLength = number | `${number}%`;

/**
 * A size that may also be a share: `128` and `128px` are pixels, `60%` stays a share, to be resolved by the place
 * that knows what it is a share of.
 *
 * @param value - what the widget carries
 */
export function typedLength(value: unknown): TypedLength | undefined {
    if (typeof value === 'string' && value.trim().endsWith('%')) {
        const share = parseFloat(value);
        return isFinite(share) && share > 0 ? `${share}%` : undefined;
    }
    return typedSize(value);
}

/**
 * The share of a length as a fraction - `60%` is 0.6 - or nothing for a length in pixels.
 *
 * @param length - the length
 */
export function shareOf(length: TypedLength | undefined): number | undefined {
    return typeof length === 'string' ? parseFloat(length) / 100 : undefined;
}

/**
 * Only the pixels of a length: for a place where a share would be a share of nothing known.
 *
 * @param length - the length
 */
export function pixelsOf(length: TypedLength | undefined): number | undefined {
    return typeof length === 'number' ? length : undefined;
}

/**
 * A length of a style in pixels, for what has to calculate with it; nothing for a length like `2em`.
 *
 * @param value - the length
 */
export function cssPixels(value: unknown): number | undefined {
    if (typeof value === 'number') {
        return isFinite(value) ? value : undefined;
    }
    const match = typeof value === 'string' ? value.trim().match(/^(\d+(?:\.\d+)?)px$/) : null;
    return match ? parseFloat(match[1]) : undefined;
}
