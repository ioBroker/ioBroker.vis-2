import type { VisTheme } from '@iobroker/types-vis-2';

/**
 * The sizes every widget of the sets `relative` and `absolute` is built from.
 *
 * They follow the widgets of `ioBroker.aura`, which these two sets are modelled on: a card of 12px radius with
 * 16px of air, a quiet name of 12px over a value of 20px, and a 20px icon that carries the colour of the state.
 * The set `relative` takes them as they are - the cells of a section are all about one size - while `absolute`
 * scales them to the box the widget was dragged to, see `scaleTokens`.
 */
export interface StandardTokens {
    /** The rounded corner of the card, in px */
    radius: number;
    /** Between the pieces inside the card, in px */
    gap: number;
    /** Between the card and what is in it, in px */
    padding: number;
    /** The icon of the device, in px */
    iconSize: number;
    /** The name of the device, in px */
    titleSize: number;
    /** The value, which is the biggest thing on the card, in px */
    valueSize: number;
    /** The unit behind the value, and a second line, in px */
    smallSize: number;
    /** What a control gets at least, in px - below that it is left out */
    minControl: number;
}

export const TOKENS: StandardTokens = {
    radius: 12,
    gap: 8,
    padding: 16,
    iconSize: 20,
    titleSize: 12,
    valueSize: 20,
    smallSize: 14,
    minControl: 24,
};

/** The box a widget of the set `relative` gets in a section of six columns and two rows, in px */
const REFERENCE = { width: 244, height: 120 };

/**
 * The sizes for a box of this size.
 *
 * A widget of the set `absolute` is drawn as large as it was dragged, and its type has to grow with it. The
 * factor follows the smaller of the two sides, so a wide flat widget does not get type that no longer fits its
 * height, and it is held between two thirds and twice the size: beyond that a widget stops looking like the
 * others on the page, which is the one thing these two sets are for.
 *
 * @param box - how large the widget is at the moment
 * @param box.width - its width in px
 * @param box.height - its height in px
 * @param base - the sizes to scale, the standard ones if none are given
 */
export function scaleTokens(box: { width: number; height: number }, base: StandardTokens = TOKENS): StandardTokens {
    const factor = Math.min(
        2,
        Math.max(0.67, Math.min(box.width / REFERENCE.width, box.height / REFERENCE.height) || 1),
    );

    return {
        radius: Math.round(base.radius * Math.min(factor, 1.4)),
        gap: Math.round(base.gap * factor),
        padding: Math.round(base.padding * factor),
        iconSize: Math.round(base.iconSize * factor),
        titleSize: Math.round(base.titleSize * factor),
        valueSize: Math.round(base.valueSize * factor),
        smallSize: Math.round(base.smallSize * factor),
        minControl: base.minControl,
    };
}

/**
 * The four colours a device is shown in, and the one it is shown in while it does nothing.
 *
 * Which of them a device takes is the device's own business: a switch is green when it is on, a lamp yellow, a
 * blind and a cooling thermostat blue, an alarm red, and anything at rest takes `off`. They all come out of the
 * theme, so the two new themes carry them without a line of widget code.
 *
 * @param theme - the theme of the editor or of the runtime
 */
export function accents(theme: VisTheme): {
    blue: string;
    green: string;
    yellow: string;
    red: string;
    off: string;
} {
    return {
        blue: theme.palette.primary.main,
        green: theme.palette.success.main,
        yellow: theme.palette.warning.main,
        red: theme.palette.error.main,
        off: theme.palette.text.secondary,
    };
}

/**
 * The card of the `card` layout, filled with the colour of the state.
 *
 * A widget that is on becomes a tile of its own colour, running from that colour into a darker version of it;
 * one that is off keeps the background of the page. That is what `ioBroker.aura` does, and it is what makes a
 * board of such tiles readable from across the room.
 *
 * @param color - the colour of the state
 * @param active - whether the device is doing something
 * @param theme - the theme of the editor or of the runtime
 */
export function cardFill(
    color: string,
    active: boolean,
    theme: VisTheme,
): { background: string; border: string; color: string } {
    if (!active) {
        return {
            background: theme.palette.background.default,
            border: `2px solid ${theme.palette.divider}`,
            color: theme.palette.text.secondary,
        };
    }

    return {
        background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 60%, black))`,
        border: `2px solid ${color}`,
        color: '#fff',
    };
}

/**
 * A pill in the colour of the state: a faint fill of it, a stronger line around it, the word in it.
 *
 * @param color - the colour of the state
 */
export function softChip(color: string): { background: string; border: string; color: string } {
    return { background: `${color}22`, border: `1px solid ${color}55`, color };
}
