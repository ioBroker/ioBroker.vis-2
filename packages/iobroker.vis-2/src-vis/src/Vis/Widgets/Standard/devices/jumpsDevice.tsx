import React from 'react';

import { defineDeviceWidget, type StandardRxData } from '../Base/defineDeviceWidget';

interface JumpsRxData extends StandardRxData {
    /** Where the marks stand in the row */
    align?: 'left' | 'center';
    /** The colour of the marks */
    color?: string;
}

/**
 * A row of jump marks: one for every section of the page that has a title.
 *
 * A phone page of a house is long - the rooms stand under each other, and the bedroom is five screens down. This
 * is the row of buttons at the top of such a page that gets there with one tap. It needs no setting to be built:
 * the marks are the titles of the sections, in their order, and a section that is added, renamed or moved is
 * in the row at once. The section the row itself stands in is not offered; it is where one already is.
 *
 * More marks than fit across the screen are scrolled to sideways, the way a row of tabs is on a phone.
 */
const jumpsDevice = defineDeviceWidget<JumpsRxData>({
    name: 'Jumps',
    label: 'widget_jumps',
    help: 'help_jumps',
    picture: {
        glyph:
            '<rect x="2.5" y="8" width="8" height="8" rx="4" stroke-width="2"/>' +
            '<rect x="13.5" y="8" width="8" height="8" rx="4" stroke-width="2"/>',
        text: 'Wohnzimmer · Küche',
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<rect x="3" y="11" width="11" height="10" rx="5" stroke="currentColor" stroke-width="2.5"/>' +
        '<rect x="18" y="11" width="11" height="10" rx="5" stroke="currentColor" stroke-width="2.5"/></svg>',
    deviceTypes: [],
    // a row of buttons over the page, not a device: no card and no marker
    bare: true,
    box: { width: 360, height: 44 },
    fields: [
        {
            name: 'align',
            type: 'select',
            label: 'text_align',
            default: 'left',
            options: [
                { value: 'left', label: 'text_align_left' },
                { value: 'center', label: 'text_align_center' },
            ],
        },
        { name: 'color', type: 'color', label: 'button_color' },
    ],
    tile: { columns: 'full', rows: 1 },
    render: context => {
        const { data, accents, theme, tokens, t } = context;
        const accent = data.color || accents.blue;
        const targets = context.sectionTargets();

        return {
            accent,
            body: (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        boxSizing: 'border-box',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: data.align === 'center' ? 'safe center' : 'flex-start',
                        gap: 8,
                        padding: `0 ${tokens.padding}px`,
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        // a row that is scrolled sideways shows no bar for it on a phone either
                        scrollbarWidth: 'none',
                    }}
                >
                    {targets.length ? (
                        targets.map(target => (
                            <button
                                key={target.id}
                                type="button"
                                onClick={context.editMode ? undefined : () => context.scrollToSection(target.id)}
                                style={{
                                    flexShrink: 0,
                                    height: 32,
                                    padding: '0 14px',
                                    borderRadius: 16,
                                    border: `1px solid ${accent}`,
                                    background: `${accent}22`,
                                    color: accent,
                                    font: 'inherit',
                                    fontSize: tokens.smallSize + 1,
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    cursor: context.editMode ? undefined : 'pointer',
                                    ...context.css.text,
                                }}
                            >
                                {target.label}
                            </button>
                        ))
                    ) : context.editMode ? (
                        // in the runtime an empty row is simply not there; the editor says why it is empty
                        <span style={{ color: theme.palette.text.secondary, fontSize: tokens.smallSize }}>
                            {t('button_section_none')}
                        </span>
                    ) : null}
                </div>
            ),
            stateText: targets.map(target => target.label).join(' · '),
        };
    },
});

export default jumpsDevice;
