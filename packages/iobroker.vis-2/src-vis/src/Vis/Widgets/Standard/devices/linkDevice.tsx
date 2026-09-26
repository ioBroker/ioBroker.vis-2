import React from 'react';

import { ChevronRight as ArrowIcon, Dashboard as PageIcon } from '@mui/icons-material';

import { defineDeviceWidget, type StandardRxData } from '../Base/defineDeviceWidget';

interface LinkRxData extends StandardRxData {
    /** The page this one leads to */
    view?: string;
    /** An address, for somewhere outside this project */
    url?: string;
    /** The address opens in a tab of its own */
    newWindow?: boolean | 'true';
    /** A line under the name, like `4 Geräte` */
    subtitle?: string;
    color?: string;
}

/**
 * The page tile: a card that leads somewhere.
 *
 * A dashboard that is more than one page needs a way from one to the next that is not the menu - a
 * start page with a tile per room reads better than a list at the side, and on a floor plan a marker
 * that opens the detail page of a room is the natural gesture.
 *
 * It leads to a page of this project, or to an address of its own where something else is to be
 * reached: a camera's own interface, a manual, the router.
 */
const linkDevice = defineDeviceWidget<LinkRxData>({
    name: 'Link',
    label: 'widget_link',
    help: 'help_link',
    picture: {
        glyph:
            '<rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke-width="2"/>' +
            '<path d="M9 12h6M12.5 9l3 3-3 3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
        value: 'Küche',
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<rect x="4" y="6" width="24" height="20" rx="3" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M12 16h9M17.5 12l4 4-4 4" stroke="currentColor" stroke-width="2.5" ' +
        'stroke-linecap="round" stroke-linejoin="round"/></svg>',
    deviceTypes: [],
    fields: [
        { name: 'view', type: 'select-views', label: 'link_view' },
        { name: 'url', label: 'link_url', tooltip: 'link_url_tooltip', hidden: '!!data.view' },
        { name: 'newWindow', type: 'checkbox', label: 'link_new_window', hidden: '!data.url' },
        { name: 'subtitle', label: 'link_subtitle' },
        { name: 'color', type: 'color', label: 'button_color' },
    ],
    tile: { columns: 6, rows: 2, minColumns: 3 },
    markerShape: 'icon',
    render: context => {
        const { data, accents, theme } = context;
        const accent = data.color || accents.blue;

        const go = (): void => {
            if (data.view) {
                context.navigate(data.view);
            } else if (data.url) {
                // a page of somebody else is opened, not navigated to: this project stays where it is
                window.open(data.url, data.newWindow === true || data.newWindow === 'true' ? '_blank' : '_self');
            }
        };

        return {
            accent,
            active: false,
            icon: <PageIcon style={{ width: '100%', height: '100%' }} />,
            onClick: context.editMode ? undefined : go,
            // the name of the page is the name of the widget; what is written here is the line under it
            value: data.subtitle || undefined,
            stateText: data.view || data.url || '',
            control: (
                <ArrowIcon
                    style={{
                        width: context.tokens.iconSize,
                        height: context.tokens.iconSize,
                        color: theme.palette.text.disabled,
                    }}
                />
            ),
        };
    },
});

export default linkDevice;
