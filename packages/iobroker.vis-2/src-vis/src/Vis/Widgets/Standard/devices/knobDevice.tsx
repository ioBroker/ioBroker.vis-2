import React from 'react';

import { Tune as KnobIcon } from '@mui/icons-material';

import { Types } from '@iobroker/type-detector';

import FatSlider from '../Base/controls/FatSlider';
import KnobDial from '../Base/controls/KnobDial';
import ModeButtons from '../Base/controls/ModeButtons';
import { parsePresets, presetModes } from '../Base/presets';
import { asNumber } from '../Base/controls/stateValue';
import { defineDeviceWidget, type StandardRxData } from '../Base/defineDeviceWidget';
import { limitsOf } from '../Base/limits';

interface KnobRxData extends StandardRxData {
    /** Where it stands, when that is not the state it is set by */
    oidActual?: string;
    /** `dial` or `slider` */
    shape?: 'dial' | 'slider';
    unit?: string;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    /** Places after the point */
    digits?: number | string;
    /** How many marks the scale carries */
    ticks?: number | string;
    /** The colour of the scale */
    color?: string;
    /** The colour the scale runs into at its top end */
    colorTo?: string;
    /** The values offered as buttons, like `0;25;50;100` */
    presets?: string;
    /** `control`, `presets` or `both` */
    controls?: 'control' | 'presets' | 'both';
}

/**
 * The knob: any number that is set by hand and is not a light.
 *
 * The volume of an amplifier, the speed of a fan, how far a valve is open, the setpoint of something that has
 * no widget of its own - all the same thing, a number between two ends. `shape` says whether it is turned or
 * pushed: the dial reads better from across a room, the slider takes less height in a list.
 *
 * What the state counts in comes from the object, `min` and `max` are there to overrule it.
 */
const knobDevice = defineDeviceWidget<KnobRxData>({
    name: 'Knob',
    label: 'widget_knob',
    help: 'help_knob',
    picture: {
        glyph:
            '<circle cx="12" cy="12" r="8" stroke-width="2"/>' +
            '<path d="M12 12L16 8" stroke-width="2" stroke-linecap="round"/>',
        value: '45 %',
        dial: true,
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<circle cx="16" cy="16" r="11" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M16 16L22 10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
    deviceTypes: [Types.slider, Types.volume, Types.volumeGroup],
    fields: [
        { name: 'oid', type: 'id', label: 'oid' },
        { name: 'oidActual', type: 'id', label: 'oid_actual' },
        {
            name: 'shape',
            type: 'select',
            label: 'knob_shape',
            default: 'dial',
            options: [
                { value: 'dial', label: 'knob_shape_dial' },
                { value: 'slider', label: 'knob_shape_slider' },
            ],
        },
        { name: 'unit', label: 'unit' },
        { name: 'presets', label: 'presets', tooltip: 'presets_tooltip' },
        {
            name: 'controls',
            type: 'select',
            label: 'controls',
            default: 'control',
            hidden: '!data.presets',
            options: [
                { value: 'control', label: 'controls_control' },
                { value: 'presets', label: 'controls_presets' },
                { value: 'both', label: 'controls_both' },
            ],
        },
        { name: 'min', type: 'number', label: 'min' },
        { name: 'max', type: 'number', label: 'max' },
        { name: 'step', type: 'number', label: 'step' },
        { name: 'digits', type: 'number', label: 'digits', min: 0, max: 3 },
        { name: 'ticks', type: 'number', label: 'knob_ticks', min: 0, max: 24, tooltip: 'knob_ticks_tooltip' },
        { name: 'color', type: 'color', label: 'knob_color' },
        { name: 'colorTo', type: 'color', label: 'knob_color_to', tooltip: 'knob_color_to_tooltip' },
    ],
    tile: { columns: 6, rows: 4, minColumns: 3, minRows: 2 },
    markerShape: 'value',
    // a dial is turned and a slider is pushed; a coin on a plan is neither
    popup: true,
    confirmable: true,
    render: context => {
        const { data, accents, theme } = context;
        const limits = limitsOf(context, 'oid');
        const value = asNumber(context.data.oidActual ? context.valueOf('oidActual') : context.valueOf('oid'));
        const known = value !== null;
        const unit = data.unit || context.commonOf('oid')?.unit || '';
        const digits = asNumber(data.digits);
        const asSlider = data.shape === 'slider';
        const accent = known ? data.color || accents.blue : accents.off;

        // a few values one actually wants are often better than a scale with every value on it
        const presets = parsePresets(data.presets);
        const offered = presets.length ? data.controls || 'control' : 'control';
        const withControl = offered !== 'presets';
        const withPresets = offered !== 'control' && presets.length > 0;

        /**
         * Set the value, and show it at once.
         *
         * @param wanted - the value, in what the state counts in
         * @param done - the finger was let go, so this one is written
         */
        const set = (wanted: number, done: boolean): void => {
            const clamped = Math.max(limits.min, Math.min(limits.max, wanted));
            context.preview('oid', clamped, !done);
            if (data.oidActual) {
                context.preview('oidActual', clamped, !done);
            }
            if (done && data.oid) {
                context.setValue(data.oid, clamped);
            }
        };

        const raw = known ? value.toFixed(digits ?? (limits.max - limits.min > 20 ? 0 : 1)) : '--';
        const written = context.isFloatComma ? raw.replace('.', ',') : raw;

        return {
            accent,
            active: false,
            icon: <KnobIcon style={{ width: '100%', height: '100%' }} />,
            // the dial says the number itself; beside a slider it has to be written out
            body:
                asSlider || !withControl || context.layout !== 'default' ? null : (
                    <KnobDial
                        value={value}
                        min={limits.min}
                        max={limits.max}
                        step={limits.step}
                        unit={unit}
                        digits={digits ?? undefined}
                        accent={accent}
                        accentTo={known ? data.colorTo : undefined}
                        ticks={asNumber(data.ticks) ?? undefined}
                        track={theme.palette.divider}
                        ink={theme.palette.text.primary}
                        quiet={theme.palette.text.secondary}
                        isFloatComma={context.isFloatComma}
                        onChange={context.editMode || !data.oid ? undefined : set}
                    />
                ),
            value:
                asSlider || !withControl || context.layout !== 'default'
                    ? `${written}${unit ? ` ${unit}` : ''}`
                    : undefined,
            valueColor: accent,
            stateText: `${written}${unit ? ` ${unit}` : ''}`,
            marker: { text: written, unit },
            footer:
                withPresets && context.layout === 'default' ? (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <ModeButtons
                            modes={presetModes(presets, unit, context.isFloatComma)}
                            current={value ?? undefined}
                            accent={accent}
                            theme={theme}
                            disabled={context.editMode}
                            onChange={wanted => set(Number(wanted), true)}
                        />
                        {asSlider && withControl && data.oid ? (
                            <FatSlider
                                value={value ?? limits.min}
                                min={limits.min}
                                max={limits.max}
                                step={limits.step}
                                color={accent}
                                disabled={context.editMode}
                                onChange={wanted => set(wanted, false)}
                                onChangeCommitted={wanted => set(wanted, true)}
                            />
                        ) : null}
                    </div>
                ) : asSlider && withControl && data.oid ? (
                    <FatSlider
                        value={value ?? limits.min}
                        min={limits.min}
                        max={limits.max}
                        step={limits.step}
                        color={accent}
                        disabled={context.editMode}
                        onChange={wanted => set(wanted, false)}
                        onChangeCommitted={wanted => set(wanted, true)}
                    />
                ) : null,
        };
    },
});

export default knobDevice;
