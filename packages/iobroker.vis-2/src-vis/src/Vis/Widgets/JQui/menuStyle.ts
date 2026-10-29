import type React from 'react';

const MENU_STYLES = ['background', 'backgroundColor', 'backgroundImage', 'color'] as const;

/**
 * Whether a background lets the page below shine through: then the list would lie see-through over the view, and
 * the paper of the theme is the better background.
 *
 * @param value a value of `background`, `background-color` or `background-image`
 */
export function isTransparent(value: unknown): boolean {
    const text = String(value).trim().toLowerCase();
    return (
        ['transparent', 'none', 'initial', 'inherit', 'unset'].includes(text) ||
        // an alpha of 0 as the fourth value, rgba(…, …, …, 0), or after the slash, rgb(… / 0)
        /^(rgba?|hsla?)\(([^,]*,){3}\s*(0+(\.0*)?|\.0+)%?\s*\)$/.test(text) ||
        /^(rgba?|hsla?)\([^/]*\/\s*(0+(\.0*)?|\.0+)%?\s*\)$/.test(text) ||
        // #rgba and #rrggbbaa with an alpha of 0
        /^#([0-9a-f]{3}0|[0-9a-f]{6}00)$/.test(text)
    );
}

/**
 * The style of the list a select opens. The list lies in a popover outside the widget, so it took the colors
 * of the theme: with a dark system theme a dark frame around items in the background of the widget (#573).
 * It takes the background and the color of the widget instead, if the widget has them. A transparent background
 * stays with the theme, or the list would show the view through it.
 *
 * @param widgetStyle the style of the widget, see `getMuiStyle`
 */
export function getMenuStyle(widgetStyle: React.CSSProperties): React.CSSProperties {
    return Object.fromEntries(
        MENU_STYLES.filter(
            attr =>
                widgetStyle[attr] != null &&
                widgetStyle[attr] !== '' &&
                (attr === 'color' || !isTransparent(widgetStyle[attr])),
        ).map(attr => [attr, widgetStyle[attr]]),
    );
}

const FIELD_FONT_STYLES = [
    'fontFamily',
    'fontSize',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'letterSpacing',
    'textShadow',
    'wordSpacing',
] as const;

/**
 * The font of the field of a closed select. The field takes the font of the theme, so the font of the widget
 * reached only the items of the list, not the value shown when the list is closed (#284). The line height is left
 * to the field, as its height is worked out from it.
 *
 * @param widgetStyle the style of the widget, see `getMuiStyle`
 */
export function getFieldFontStyle(widgetStyle: React.CSSProperties): React.CSSProperties {
    return Object.fromEntries(
        FIELD_FONT_STYLES.filter(attr => widgetStyle[attr] != null && widgetStyle[attr] !== '').map(attr => [
            attr,
            widgetStyle[attr],
        ]),
    );
}
