import React from 'react';

import { Icon } from '@iobroker/gui-components';

import { asText } from '../Base/controls/stateValue';
import { defineDeviceWidget, type StandardRxData } from '../Base/defineDeviceWidget';

interface TextRxData extends StandardRxData {
    /** What it says; with a state as well, this stands in front of the value */
    text?: string;
    /** A symbol in front of the words, as the cards have one */
    icon?: string;
    unit?: string;
    /** `header`, `title`, `normal` or `small` */
    size?: 'header' | 'title' | 'normal' | 'small';
    align?: 'left' | 'center' | 'right' | 'between';
    /** A checkbox that was switched off is `false`, one that was never touched is nothing at all */
    bold?: boolean | 'true' | 'false';
    color?: string;
}

/** How big each size is, in pixels */
const SIZES: Record<string, number> = { header: 30, title: 20, normal: 15, small: 12 };

/**
 * A heading, a note, a room name on a floor plan.
 *
 * Every page needs words that are not a device: `Ground floor` over a section, `Guest room` on a plan, a line
 * that says what the row of switches under it is for. It has no card around it - a heading in a frame with a
 * name over it is not a heading - and it can carry the value of a state after its text, which is what turns
 * `Outside` into `Outside 6.4 °C`.
 */
const textDevice = defineDeviceWidget<TextRxData>({
    name: 'Text',
    label: 'widget_text',
    help: 'help_text',
    picture: {
        glyph: '<path d="M4 6h16M4 12h11M4 18h7" stroke-width="2" stroke-linecap="round"/>',
        text: 'Wohnzimmer',
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<path d="M6 9h20M6 17h14M6 24h9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
    deviceTypes: [],
    // it is a heading, not a device: no card, no marker, and its own box on a plan
    bare: true,
    box: { width: 200, height: 40 },
    fields: [
        { name: 'text', label: 'text' },
        { name: 'icon', type: 'icon-image', label: 'icon' },
        { name: 'oid', type: 'id', label: 'oid_value', tooltip: 'oid_value_tooltip' },
        { name: 'unit', label: 'unit', hidden: '!data.oid' },
        {
            name: 'size',
            type: 'select',
            label: 'text_size',
            default: 'title',
            options: [
                { value: 'header', label: 'text_size_header' },
                { value: 'title', label: 'text_size_title' },
                { value: 'normal', label: 'text_size_normal' },
                { value: 'small', label: 'text_size_small' },
            ],
        },
        {
            name: 'align',
            type: 'select',
            label: 'text_align',
            default: 'left',
            options: [
                { value: 'left', label: 'text_align_left' },
                { value: 'center', label: 'text_align_center' },
                { value: 'right', label: 'text_align_right' },
                { value: 'between', label: 'text_align_between' },
            ],
        },
        { name: 'bold', type: 'checkbox', label: 'text_bold', default: true },
        { name: 'color', type: 'color', label: 'text_color' },
    ],
    tile: { columns: 'full', rows: 1 },
    render: context => {
        const { data, theme, tokens } = context;
        const raw = data.oid ? context.valueOf('oid') : undefined;
        // a measured value with six places after the point is a wall of digits; one place is a reading
        const written0 = typeof raw === 'number' && !Number.isInteger(raw) ? raw.toFixed(1) : asText(raw);
        const written = written0 ? `${written0}${data.unit ? ` ${data.unit}` : ''}` : '';
        const value = context.isFloatComma ? written.replace('.', ',') : written;
        /*
         * `between` is a row of its own kind: the words say what it is and the reading stands at the far right,
         * the way a list of readings is read. In the other three the two are one line, because a heading that
         * says `Outside 6.4 °C` is one thing and not two.
         */
        const spread = data.align === 'between';
        const line = spread ? data.text || '' : [data.text, value].filter(part => part).join(' ');

        const size = SIZES[data.size || 'title'];
        const align = data.align === 'center' ? 'center' : data.align === 'right' ? 'right' : 'left';
        const text = {
            fontSize: size,
            fontWeight: data.bold === false || data.bold === 'false' ? 400 : 700,
            lineHeight: 1.25,
        };

        return {
            accent: theme.palette.text.primary,
            body: (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        boxSizing: 'border-box',
                        /*
                         * A heading has no card, and without one it would start at the very edge of its box
                         * while every card beside it holds its content a padding away from its own. The same
                         * padding here puts the words in the same column as the names on the cards, which is
                         * what makes a heading look like it belongs to the row under it.
                         */
                        padding: `0 ${tokens.padding}px`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: Math.round(size * 0.45),
                        justifyContent: spread
                            ? 'space-between'
                            : align === 'center'
                              ? 'center'
                              : align === 'right'
                                ? 'flex-end'
                                : 'flex-start',
                        color: data.color || theme.palette.text.primary,
                        overflow: 'hidden',
                    }}
                >
                    {/* the symbol belongs to the words, so the two stay together when the reading is sent away */}
                    <span
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: Math.round(size * 0.45),
                            minWidth: 0,
                        }}
                    >
                        {data.icon ? (
                            <span
                                style={{
                                    display: 'flex',
                                    // the symbol is read together with the words, so it is as tall as they are
                                    width: Math.round(size * 1.2),
                                    height: Math.round(size * 1.2),
                                    flexShrink: 0,
                                }}
                            >
                                <Icon
                                    src={data.icon}
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </span>
                        ) : null}
                        <span
                            style={{
                                minWidth: 0,
                                ...text,
                                // a heading that is longer than its box wraps rather than disappearing
                                textAlign: align,
                            }}
                        >
                            {line}
                        </span>
                    </span>
                    {spread && value ? (
                        <span
                            style={{
                                flexShrink: 0,
                                ...text,
                                textAlign: 'right',
                            }}
                        >
                            {value}
                        </span>
                    ) : null}
                </div>
            ),
            stateText: [data.text, value].filter(part => part).join(' '),
        };
    },
});

export default textDevice;
