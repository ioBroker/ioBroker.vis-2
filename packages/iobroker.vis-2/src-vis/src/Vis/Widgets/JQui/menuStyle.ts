import type React from 'react';

const MENU_STYLES = ['background', 'backgroundColor', 'backgroundImage', 'color'] as const;

/**
 * The style of the list a select opens. The list lies in a popover outside the widget, so it took the colors
 * of the theme: with a dark system theme a dark frame around items in the background of the widget (#573).
 * It takes the background and the color of the widget instead, if the widget has them.
 *
 * @param widgetStyle the style of the widget, see `getMuiStyle`
 */
export function getMenuStyle(widgetStyle: React.CSSProperties): React.CSSProperties {
    return Object.fromEntries(
        MENU_STYLES.filter(attr => widgetStyle[attr] != null && widgetStyle[attr] !== '').map(attr => [
            attr,
            widgetStyle[attr],
        ]),
    );
}
