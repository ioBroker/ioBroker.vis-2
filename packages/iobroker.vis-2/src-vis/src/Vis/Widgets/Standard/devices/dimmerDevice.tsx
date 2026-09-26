import React from 'react';

import { Lightbulb as DimmerIcon } from '@mui/icons-material';

import { Types } from '@iobroker/type-detector';

import FatSlider from '../Base/controls/FatSlider';
import SlideToggle from '../Base/controls/SlideToggle';
import { asNumber } from '../Base/controls/stateValue';
import { defineDeviceWidget, type DeviceContext, type StandardRxData } from '../Base/defineDeviceWidget';
import { fromPercent, limitsOf, toPercent } from '../Base/limits';

interface DimmerRxData extends StandardRxData {
    /** Where the light stands, when that is not the state it is set by */
    oidActual?: string;
    /** The state that switches it on and off, where that is a state of its own */
    oidSwitch?: string;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    /** Without a state of its own for on and off: `last` or `preset` */
    onBehaviour?: 'last' | 'preset';
    /** Where it goes when it is switched on, in percent */
    onValue?: number | string;
}

/** Where the brightness of a lamp is remembered, by the state that carries it */
const LAST_ON = 'vis.dimmer.';

/**
 * How bright the lamp was when it was last switched off.
 *
 * A lamp without a state of its own for on and off goes out by being set to nothing, and nothing is
 * all that is left of where it stood. The browser remembers it instead - per lamp, not per widget, so
 * two widgets for the same lamp agree.
 *
 * @param oid - the state the lamp is set by
 */
function rememberedBrightness(oid: string): number | null {
    try {
        const stored = window.localStorage.getItem(LAST_ON + oid);
        const value = stored === null ? null : parseFloat(stored);
        return value !== null && isFinite(value) && value > 0 ? value : null;
    } catch {
        // a browser that refuses its storage simply has nothing to remember
        return null;
    }
}

/**
 * Remember where the lamp stood.
 *
 * @param oid - the state the lamp is set by
 * @param percent - how bright it was
 */
function rememberBrightness(oid: string, percent: number): void {
    try {
        window.localStorage.setItem(LAST_ON + oid, `${percent}`);
    } catch {
        // nothing to be done about it, and nothing that would be worth a message
    }
}

/** How bright the light is, from 0 to 100, whatever the state counts in */
function brightness(context: DeviceContext<DimmerRxData>): number | null {
    const value = asNumber(context.data.oidActual ? context.valueOf('oidActual') : context.valueOf('oid'));
    if (value === null) {
        return null;
    }
    return toPercent(value, limitsOf(context, context.data.oidActual ? 'oidActual' : 'oid'));
}

/**
 * The dimmer: a light that is not only on or off but somewhere in between.
 *
 * It is the switch with a slider under it, and it is the same two questions: how bright is it, and how do I
 * change that. Where the light has a state of its own for on and off it is switched with that one - some lamps
 * remember their brightness and come back to it - and otherwise the level itself is set to zero and back to
 * where it was, which is what the widget remembers for the length of a page view.
 *
 * What the state counts in is the object's business, `min` and `max` are there to overrule it: a dimmer that
 * runs from 0 to 255 is as common as one from 0 to 100, and the card speaks in percent either way.
 */
const dimmerDevice = defineDeviceWidget<DimmerRxData>({
    name: 'Dimmer',
    label: 'widget_dimmer',
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<circle cx="16" cy="13" r="7" fill="currentColor" opacity="0.7"/>' +
        '<path d="M11 24h10M12 27h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    help: 'help_dimmer',
    picture: {
        glyph:
            '<circle cx="12" cy="9" r="5.5" fill="currentColor" stroke="none"/>' +
            '<path d="M9 17.5h6M10 20.5h4" stroke-width="2" stroke-linecap="round"/>',
        value: '45 %',
        toggle: true,
        slider: true,
    },
    deviceTypes: [Types.dimmer],
    fields: [
        { name: 'oid', type: 'id', label: 'oid' },
        { name: 'oidActual', type: 'id', label: 'oid_actual' },
        { name: 'oidSwitch', type: 'id', label: 'oid_switch' },
        { name: 'min', type: 'number', label: 'min' },
        { name: 'max', type: 'number', label: 'max' },
        { name: 'step', type: 'number', label: 'step' },
        {
            name: 'onBehaviour',
            type: 'select',
            label: 'dimmer_on_behaviour',
            default: 'last',
            tooltip: 'dimmer_on_behaviour_tooltip',
            hidden: '!!data.oidSwitch',
            options: [
                { value: 'last', label: 'dimmer_on_last' },
                { value: 'preset', label: 'dimmer_on_preset' },
            ],
        },
        {
            name: 'onValue',
            type: 'number',
            label: 'dimmer_on_value',
            default: 100,
            min: 1,
            max: 100,
            hidden: "!!data.oidSwitch || data.onBehaviour !== 'preset'",
        },
    ],
    tile: { columns: 6, rows: 2, minColumns: 3 },
    markerShape: 'value',
    // a lamp on a wall panel is worth a question where it is the wrong lamp to wake the house with
    confirmable: true,
    // a coin on a floor plan has no room for a slider
    popup: true,
    render: context => {
        const { data, accents, theme } = context;
        const percent = brightness(context);
        const known = percent !== null;
        const limits = limitsOf(context, 'oid');

        // the light is on when it says so, and otherwise when it is brighter than nothing
        const switched = data.oidSwitch ? context.valueOf('oidSwitch') : undefined;
        const on = data.oidSwitch ? !!switched && switched !== 'false' : !!percent;
        const accent = known && on ? accents.yellow : accents.off;

        /**
         * Set the brightness, and show it at once.
         *
         * A lamp that is given a brightness is on, and one that is dimmed down to nothing is off. Where
         * the lamp has a state of its own for that, it has to be told as well: otherwise the slider
         * stands at 57 % beside a switch that says the light is off, which is either a lie or a lamp
         * that has been told two different things.
         *
         * @param value - from 0 to 100
         * @param holding - the gesture is still running, so nothing is written yet
         */
        const setPercent = (value: number, holding: boolean): void => {
            const raw = fromPercent(value, limits);
            context.preview('oid', raw, holding);
            if (data.oidActual) {
                context.preview('oidActual', raw, holding);
            }

            const shouldBeOn = value > 0;
            if (data.oidSwitch && shouldBeOn !== on) {
                context.preview('oidSwitch', shouldBeOn, holding);
            }

            if (!holding) {
                if (data.oid) {
                    context.setValue(data.oid, raw);
                }
                if (data.oidSwitch && shouldBeOn !== on) {
                    context.setValue(data.oidSwitch, shouldBeOn);
                }
            }
        };

        const toggle = (): void =>
            context.act(on ? 'off' : 'on', () => {
                if (data.oidSwitch) {
                    context.setValue(data.oidSwitch, !on);
                    return;
                }
                if (!data.oid) {
                    return;
                }
                // without a state of its own a lamp goes out by being set to nothing, so where it
                // stood has to be kept somewhere - either here, or at the value that was set
                if (on) {
                    if (percent) {
                        rememberBrightness(data.oid, percent);
                    }
                    setPercent(0, false);
                } else {
                    const preset = asNumber(data.onValue) ?? 100;
                    const wanted = data.onBehaviour === 'preset' ? preset : (rememberedBrightness(data.oid) ?? preset);
                    setPercent(wanted, false);
                }
            });

        return {
            accent,
            active: known && on,
            icon: <DimmerIcon style={{ width: '100%', height: '100%' }} />,
            value: known ? (
                <span>
                    {Math.round(percent)}
                    <span style={{ fontSize: '0.65em', fontWeight: 400, marginLeft: 1 }}>%</span>
                </span>
            ) : (
                '--'
            ),
            valueColor: accent,
            stateText: known ? `${Math.round(percent)} %` : '--',
            marker: { text: known ? `${Math.round(percent)}` : '--', unit: '%' },
            control: (
                <SlideToggle
                    on={on}
                    disabled={!known}
                    color={accents.yellow}
                    offColor={theme.palette.divider}
                    onChange={toggle}
                />
            ),
            footer: data.oid ? (
                <FatSlider
                    value={percent ?? 0}
                    min={0}
                    max={100}
                    color={accent}
                    disabled={!data.oid}
                    // the number follows the knob while it is dragged, not only when it is let go
                    onChange={value => setPercent(value, true)}
                    onChangeCommitted={value => setPercent(value, false)}
                />
            ) : null,
        };
    },
});

export default dimmerDevice;
