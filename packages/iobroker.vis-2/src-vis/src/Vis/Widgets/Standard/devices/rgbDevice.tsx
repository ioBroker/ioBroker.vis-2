import React from 'react';

import { Palette as RgbIcon } from '@mui/icons-material';

import { Types } from '@iobroker/type-detector';

import ColorWheel, { ColorTempSlider, ShadeSlider } from '../Base/controls/ColorWheel';
import SlideToggle from '../Base/controls/SlideToggle';
import { hexToHsva, hsvaToHex, hsvaToRgba, kelvinToHex, rgbaToHsva, type HsvaColor } from '../Base/controls/colorUtils';
import { asNumber } from '../Base/controls/stateValue';
import { defineDeviceWidget, type DeviceContext, type StandardRxData } from '../Base/defineDeviceWidget';

/** How a lamp says which colour it is in */
type RgbMode =
    /** One state, `#rrggbb` */
    | 'hex'
    /** One state, `#rrggbb`, and a white channel beside it */
    | 'hexw'
    /** Three states, 0 to 255 each */
    | 'rgb'
    /** Three states and a white one */
    | 'rgbw'
    /** Hue, saturation and brightness in three states */
    | 'hue'
    /** No colour at all, only how warm the white is */
    | 'ct';

interface RgbRxData extends StandardRxData {
    /** `hex`, `hexw`, `rgb`, `rgbw`, `hue` or `ct`; see {@link RgbMode} */
    mode?: RgbMode;
    oidRed?: string;
    oidGreen?: string;
    oidBlue?: string;
    oidWhite?: string;
    /** The saturation, for a lamp that speaks in hue */
    oidSaturation?: string;
    /** How bright the lamp is, where that is a state of its own */
    oidBrightness?: string;
    /** The state that switches it on and off */
    oidSwitch?: string;
    /** How warm the white is, in Kelvin */
    oidCt?: string;
    ctMin?: number | string;
    ctMax?: number | string;
}

/** What a lamp without its own limits is taken to do, in Kelvin */
const CT_RANGE = { min: 2700, max: 6500 };

/** A channel of 0 to 255, out of whatever the state carries */
function channel(context: DeviceContext<RgbRxData>, attr: string): number {
    return Math.max(0, Math.min(255, asNumber(context.valueOf(attr)) ?? 0));
}

/** Whether this lamp has a white channel beside its colour */
function hasWhite(mode: RgbMode): boolean {
    return mode === 'rgbw' || mode === 'hexw';
}

/** The colour the lamp is in, as the wheel wants it */
function colorOf(context: DeviceContext<RgbRxData>, mode: RgbMode): HsvaColor {
    if (mode === 'rgb' || mode === 'rgbw') {
        return rgbaToHsva({
            r: channel(context, 'oidRed'),
            g: channel(context, 'oidGreen'),
            b: channel(context, 'oidBlue'),
            a: 1,
        });
    }
    if (mode === 'hue') {
        return {
            h: asNumber(context.valueOf('oid')) ?? 0,
            s: asNumber(context.valueOf('oidSaturation')) ?? 100,
            v: asNumber(context.valueOf('oidBrightness')) ?? 100,
            a: 1,
        };
    }
    if (mode === 'ct') {
        return hexToHsva(kelvinToHex(asNumber(context.valueOf('oidCt')) ?? CT_RANGE.min));
    }
    const value = context.valueOf('oid');
    return hexToHsva(typeof value === 'string' ? value : '');
}

/**
 * The colour light: the wheel, the brightness under it, and the white beside it.
 *
 * Lamps disagree about how to be told a colour - one takes `#ff8800`, the next three numbers, the third a hue
 * and a saturation, and a white one only how warm it should be. `mode` says which of them this lamp is, and
 * from there on the widget speaks in one colour: what the wheel points at.
 *
 * The lamp is shown every colour the finger passes over and is written only the one it is let go on. A bus
 * that carries every frame of a drag is a bus that carries nothing else.
 */
const rgbDevice = defineDeviceWidget<RgbRxData>({
    name: 'Rgb',
    label: 'widget_rgb',
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28">' +
        '<circle cx="13" cy="12" r="7" fill="#e53935" opacity="0.85"/>' +
        '<circle cx="19" cy="12" r="7" fill="#43a047" opacity="0.7"/>' +
        '<circle cx="16" cy="19" r="7" fill="#1e88e5" opacity="0.7"/></svg>',
    help: 'help_rgb',
    picture: {
        glyph:
            '<circle cx="9.5" cy="9" r="5.5" fill="#e53935" stroke="none" opacity="0.9"/>' +
            '<circle cx="15" cy="9.5" r="5.5" fill="#43a047" stroke="none" opacity="0.75"/>' +
            '<circle cx="12" cy="15" r="5.5" fill="#1e88e5" stroke="none" opacity="0.75"/>',
        wheel: true,
        toggle: true,
        slider: true,
    },
    deviceTypes: [Types.rgb, Types.rgbSingle, Types.rgbwSingle, Types.hue, Types.ct, Types.cie],
    fields: [
        {
            name: 'mode',
            type: 'select',
            label: 'rgb_mode',
            default: 'hex',
            options: [
                { value: 'hex', label: 'rgb_mode_hex' },
                { value: 'hexw', label: 'rgb_mode_hexw' },
                { value: 'rgb', label: 'rgb_mode_rgb' },
                { value: 'rgbw', label: 'rgb_mode_rgbw' },
                { value: 'hue', label: 'rgb_mode_hue' },
                { value: 'ct', label: 'rgb_mode_ct' },
            ],
        },
        {
            name: 'oid',
            type: 'id',
            label: 'oid',
            hidden: "data.mode === 'rgb' || data.mode === 'rgbw' || data.mode === 'ct'",
        },
        { name: 'oidRed', type: 'id', label: 'oid_red', hidden: "data.mode !== 'rgb' && data.mode !== 'rgbw'" },
        { name: 'oidGreen', type: 'id', label: 'oid_green', hidden: "data.mode !== 'rgb' && data.mode !== 'rgbw'" },
        { name: 'oidBlue', type: 'id', label: 'oid_blue', hidden: "data.mode !== 'rgb' && data.mode !== 'rgbw'" },
        { name: 'oidWhite', type: 'id', label: 'oid_white', hidden: "data.mode !== 'rgbw' && data.mode !== 'hexw'" },
        { name: 'oidSaturation', type: 'id', label: 'oid_saturation', hidden: "data.mode !== 'hue'" },
        { name: 'oidBrightness', type: 'id', label: 'oid_brightness' },
        { name: 'oidSwitch', type: 'id', label: 'oid_switch' },
        { name: 'oidCt', type: 'id', label: 'oid_ct' },
        { name: 'ctMin', type: 'number', label: 'ct_min', hidden: '!data.oidCt' },
        { name: 'ctMax', type: 'number', label: 'ct_max', hidden: '!data.oidCt' },
    ],
    tile: { columns: 6, rows: 4, minColumns: 4, minRows: 3 },
    markerShape: 'icon',
    // a wheel does not fit on a coin, and a lamp on a floor plan is worth opening
    popup: true,
    confirmable: true,
    render: context => {
        const { data, accents, theme } = context;
        const mode: RgbMode = data.mode || 'hex';
        const color = colorOf(context, mode);
        const white = hasWhite(mode) ? channel(context, 'oidWhite') : null;

        // the lamp is on when it says so, and otherwise when it is not black
        const switched = data.oidSwitch ? context.valueOf('oidSwitch') : undefined;
        const on = data.oidSwitch ? !!switched && switched !== 'false' : color.v > 0;
        const shown = hsvaToHex({ ...color, v: 100 });
        // the accent of this device is the colour it is in - it is the one device whose state is a colour
        const accent = on ? shown : accents.off;

        /**
         * Tell the lamp the colour, and show it at once.
         *
         * @param next - the colour the wheel or the brightness bar points at
         * @param done - the finger was let go, so this one is written
         */
        const setColor = (next: HsvaColor, done: boolean): void => {
            if (mode === 'rgb' || mode === 'rgbw') {
                const rgba = hsvaToRgba(next);
                const parts: [string, number][] = [
                    ['oidRed', Math.round(rgba.r)],
                    ['oidGreen', Math.round(rgba.g)],
                    ['oidBlue', Math.round(rgba.b)],
                ];
                parts.forEach(([attr, value]) => {
                    context.preview(attr, value, !done);
                    if (done && data[attr]) {
                        context.setValue(data[attr] as string, value);
                    }
                });
                return;
            }
            if (mode === 'hue') {
                const parts: [string, number][] = [
                    ['oid', Math.round(next.h)],
                    ['oidSaturation', Math.round(next.s)],
                    ['oidBrightness', Math.round(next.v)],
                ];
                parts.forEach(([attr, value]) => {
                    context.preview(attr, value, !done);
                    if (done && data[attr]) {
                        context.setValue(data[attr] as string, value);
                    }
                });
                return;
            }
            const hex = hsvaToHex(next);
            context.preview('oid', hex, !done);
            if (done && data.oid) {
                context.setValue(data.oid, hex);
            }
        };

        /**
         * How bright the lamp should be.
         *
         * Where the lamp has a state for it, that one is set and the colour is left alone; otherwise the
         * brightness is part of the colour, and dimming means sending a darker one.
         *
         * @param value - from 0 to 100
         * @param done - the finger was let go
         */
        const setBrightness = (value: number, done: boolean): void => {
            if (data.oidBrightness && mode !== 'hue') {
                context.preview('oidBrightness', Math.round(value), !done);
                if (done) {
                    context.setValue(data.oidBrightness, Math.round(value));
                }
                return;
            }
            setColor({ ...color, v: value }, done);
        };

        const toggle = (): void =>
            context.act(on ? 'off' : 'on', () => {
                if (data.oidSwitch) {
                    context.setValue(data.oidSwitch, !on);
                } else {
                    setBrightness(on ? 0 : 100, true);
                }
            });

        const ctMin = asNumber(data.ctMin) ?? CT_RANGE.min;
        const ctMax = asNumber(data.ctMax) ?? CT_RANGE.max;
        const kelvin = asNumber(context.valueOf('oidCt')) ?? ctMin;

        /**
         * Tell the lamp how warm its white should be.
         *
         * @param value - in Kelvin
         * @param done - the finger was let go
         */
        const setKelvin = (value: number, done: boolean): void => {
            context.preview('oidCt', value, !done);
            if (done && data.oidCt) {
                context.setValue(data.oidCt, value);
            }
        };

        const wheel =
            mode === 'ct' ? null : (
                <ColorWheel
                    hsva={color}
                    size="100%"
                    disabled={context.editMode}
                    onChange={setColor}
                />
            );

        return {
            accent,
            active: on,
            icon: <RgbIcon style={{ width: '100%', height: '100%' }} />,
            body: wheel,
            value: (
                <span>
                    {Math.round(color.v)}
                    <span style={{ fontSize: '0.65em', fontWeight: 400, marginLeft: 1 }}>%</span>
                </span>
            ),
            valueColor: accent,
            stateText: on ? `${Math.round(color.v)} %` : context.t('off'),
            control: (
                <SlideToggle
                    on={on}
                    color={shown}
                    offColor={theme.palette.divider}
                    onChange={toggle}
                />
            ),
            footer: (
                <div style={{ width: '100%' }}>
                    {mode === 'ct' ? null : (
                        <ShadeSlider
                            hsva={color}
                            disabled={context.editMode}
                            onChange={setBrightness}
                        />
                    )}
                    {data.oidCt ? (
                        <ColorTempSlider
                            kelvin={kelvin}
                            min={ctMin}
                            max={ctMax}
                            disabled={context.editMode}
                            onChange={setKelvin}
                        />
                    ) : null}
                    {white !== null && data.oidWhite ? (
                        <ShadeSlider
                            hsva={{ h: 0, s: 0, v: (white / 255) * 100, a: 1 }}
                            disabled={context.editMode}
                            onChange={(value, done) => {
                                const raw = Math.round((value / 100) * 255);
                                context.preview('oidWhite', raw, !done);
                                if (done && data.oidWhite) {
                                    context.setValue(data.oidWhite, raw);
                                }
                            }}
                        />
                    ) : null}
                </div>
            ),
        };
    },
});

export default rgbDevice;
