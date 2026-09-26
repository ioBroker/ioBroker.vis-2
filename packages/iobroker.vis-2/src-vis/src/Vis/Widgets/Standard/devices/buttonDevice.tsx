import React from 'react';

import { PlayArrow as ButtonIcon } from '@mui/icons-material';

import { Types } from '@iobroker/type-detector';

import { asNumber } from '../Base/controls/stateValue';
import { defineDeviceWidget, type StandardRxData } from '../Base/defineDeviceWidget';

interface ButtonRxData extends StandardRxData {
    /** What is written when it is pressed; `true` where nothing is said */
    value?: string;
    /** What is written a moment later, for a state that has to be let go again */
    releaseValue?: string;
    /** How long the first value stays before the second is written, in milliseconds */
    releaseAfter?: number | string;
    /** The word on the button */
    text?: string;
    /** The colour of the button */
    color?: string;
}

/** What a value that came out of a field means to a state */
function asValue(value: string | undefined, fallback: boolean): string | number | boolean {
    if (value === undefined || value === '') {
        return fallback;
    }
    if (value === 'true' || value === 'false') {
        return value === 'true';
    }
    const number = asNumber(value);
    return number === null ? value : number;
}

/**
 * The button: something happens when it is pressed, and nothing is shown afterwards.
 *
 * A scene, a script, a doorbell, a gate. It is the one device that has no state to speak of - a button
 * does not remember having been pressed - so the card shows a button and nothing else.
 *
 * Where a device wants to be let go again, `releaseValue` is written a moment later. That is what a
 * relay wired as a pulse needs, and doing it in the widget saves a script that exists only for that.
 *
 * Like every device that switches, it can ask first: a button that opens a gate is worth a question.
 */
const buttonDevice = defineDeviceWidget<ButtonRxData>({
    name: 'Button',
    label: 'widget_button',
    help: 'help_button',
    picture: {
        glyph:
            '<circle cx="12" cy="12" r="8.5" stroke-width="2"/>' +
            '<circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"/>',
        value: 'Start',
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<rect x="4" y="10" width="24" height="13" rx="6.5" stroke="currentColor" stroke-width="2.5"/>' +
        '<circle cx="16" cy="16.5" r="3" fill="currentColor"/></svg>',
    deviceTypes: [Types.button],
    fields: [
        { name: 'oid', type: 'id', label: 'oid' },
        { name: 'text', label: 'button_text' },
        { name: 'value', label: 'button_value', tooltip: 'button_value_tooltip' },
        { name: 'releaseValue', label: 'button_release', tooltip: 'button_release_tooltip' },
        { name: 'releaseAfter', type: 'number', label: 'button_release_after', hidden: '!data.releaseValue' },
        { name: 'color', type: 'color', label: 'button_color' },
    ],
    tile: { columns: 6, rows: 2, minColumns: 2 },
    markerShape: 'icon',
    confirmable: true,
    render: context => {
        const { data, accents, t } = context;
        const accent = data.color || accents.blue;
        const word = data.text || t('button_press');

        const press = (): void =>
            context.act('on', () => {
                if (!data.oid) {
                    return;
                }
                context.setValue(data.oid, asValue(data.value, true));
                if (data.releaseValue !== undefined && data.releaseValue !== '') {
                    // a relay wired as a pulse has to be let go again, and this saves a script for it
                    setTimeout(
                        () => context.setValue(data.oid, asValue(data.releaseValue, false)),
                        asNumber(data.releaseAfter) ?? 300,
                    );
                }
            });

        return {
            accent,
            active: false,
            icon: <ButtonIcon style={{ width: '100%', height: '100%' }} />,
            // a marker on a plan is the button itself: one press and it has done its work
            onClick: context.editMode ? undefined : press,
            stateText: word,
            body:
                context.layout === 'default' ? (
                    <button
                        type="button"
                        disabled={context.editMode || !data.oid}
                        onClick={press}
                        style={{
                            width: '100%',
                            height: '100%',
                            minHeight: 36,
                            borderRadius: 10,
                            border: `1px solid ${accent}`,
                            background: `${accent}22`,
                            color: accent,
                            font: 'inherit',
                            fontSize: context.tokens.smallSize + 1,
                            fontWeight: 600,
                            cursor: context.editMode ? undefined : 'pointer',
                        }}
                    >
                        {word}
                    </button>
                ) : null,
            value: context.layout === 'default' ? undefined : word,
            valueColor: accent,
        };
    },
});

export default buttonDevice;
