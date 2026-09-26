/**
 * The conversions between the color notations that the RGB light works in.
 *
 * The widget set took them from a color package; here they are written out, because the only other thing it used
 * from that package - the wheel - is drawn by [[ColorWheel]] now.
 *
 * Ranges, as everywhere in this widget: `h` 0..360, `s`, `v` and `l` 0..100, `r`, `g` and `b` 0..255, `a` 0..1.
 */

export interface HsvaColor {
    h: number;
    s: number;
    v: number;
    a: number;
}

export interface RgbaColor {
    r: number;
    g: number;
    b: number;
    a: number;
}

export interface HslaColor {
    h: number;
    s: number;
    l: number;
    a: number;
}

/**
 * Keep a number inside its limits.
 *
 * @param value the number
 * @param max the biggest allowed value, 100 if not given
 * @returns the number, at most max and at least zero
 */
function clamp(value: number, max = 100): number {
    return Math.min(Math.max(value || 0, 0), max);
}

/**
 * The color of a light as hue, saturation and value.
 *
 * @param rgba the color in red, green and blue
 * @returns the same color as hue, saturation and value
 */
export function rgbaToHsva(rgba: RgbaColor): HsvaColor {
    const r = clamp(rgba.r, 255) / 255;
    const g = clamp(rgba.g, 255) / 255;
    const b = clamp(rgba.b, 255) / 255;

    const max = Math.max(r, g, b);
    const delta = max - Math.min(r, g, b);

    // the hue is the direction the biggest of the three channels points to
    let hue = 0;
    if (delta) {
        if (max === r) {
            hue = (g - b) / delta;
        } else if (max === g) {
            hue = 2 + (b - r) / delta;
        } else {
            hue = 4 + (r - g) / delta;
        }
    }

    return {
        h: 60 * (hue < 0 ? hue + 6 : hue),
        s: max ? (delta / max) * 100 : 0,
        v: max * 100,
        a: rgba.a === undefined ? 1 : rgba.a,
    };
}

/**
 * The color of a light as red, green and blue.
 *
 * @param hsva the color in hue, saturation and value
 * @returns the same color in red, green and blue
 */
export function hsvaToRgba(hsva: HsvaColor): RgbaColor {
    const h = ((hsva.h || 0) / 360) * 6;
    const s = clamp(hsva.s) / 100;
    const v = clamp(hsva.v) / 100;

    const hh = Math.floor(h);
    const b = v * (1 - s);
    const c = v * (1 - (h - hh) * s);
    const d = v * (1 - (1 - h + hh) * s);
    const module = hh % 6;

    return {
        r: Math.round([v, c, b, b, d, v][module] * 255),
        g: Math.round([d, v, v, c, b, b][module] * 255),
        b: Math.round([b, b, d, v, v, c][module] * 255),
        a: hsva.a === undefined ? 1 : hsva.a,
    };
}

/**
 * The color of a light as hue, saturation and luminance, which is how some lamps take it.
 *
 * @param hsva the color in hue, saturation and value
 * @returns the same color as hue, saturation and luminance
 */
export function hsvaToHsla(hsva: HsvaColor): HslaColor {
    const s = clamp(hsva.s);
    const v = clamp(hsva.v);
    const luminance = ((200 - s) * v) / 100;

    return {
        h: hsva.h || 0,
        s:
            luminance > 0 && luminance < 200
                ? ((s * v) / 100 / (luminance <= 100 ? luminance : 200 - luminance)) * 100
                : 0,
        l: luminance / 2,
        a: hsva.a === undefined ? 1 : hsva.a,
    };
}

/**
 * The color a lamp reports as hue, saturation and luminance, in hue, saturation and value.
 *
 * @param hsla the color in hue, saturation and luminance
 * @returns the same color as hue, saturation and value
 */
export function hslaToHsva(hsla: HslaColor): HsvaColor {
    const s = clamp(hsla.s);
    const l = clamp(hsla.l);
    const value = l + (s * (100 - Math.abs(2 * l - 100))) / 200;

    return {
        h: hsla.h || 0,
        s: value > 0 ? 2 * (1 - l / value) * 100 : 0,
        v: value,
        a: hsla.a === undefined ? 1 : hsla.a,
    };
}

/**
 * Two digits of a hexadecimal color.
 *
 * @param value one channel, 0..255
 * @returns the channel as two digits
 */
function channelToHex(value: number): string {
    const hex = Math.round(clamp(value, 255)).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
}

/**
 * The color as a lamp that takes one string wants it.
 *
 * @param rgba the color in red, green and blue
 * @returns the color as `#rrggbb`
 */
export function rgbaToHex(rgba: RgbaColor): string {
    return `#${channelToHex(rgba.r)}${channelToHex(rgba.g)}${channelToHex(rgba.b)}`;
}

/**
 * The color as a lamp that takes one string wants it.
 *
 * @param hsva the color in hue, saturation and value
 * @returns the color as `#rrggbb`
 */
export function hsvaToHex(hsva: HsvaColor): string {
    return rgbaToHex(hsvaToRgba(hsva));
}

/**
 * The color a lamp reports as one string, in hue, saturation and value.
 *
 * Short forms - `#rgb` - are understood as well, and anything that is not a color at all becomes black.
 *
 * @param hex the color as `#rgb`, `#rrggbb` or `#rrggbbaa`
 * @returns the same color as hue, saturation and value
 */
export function hexToHsva(hex: string): HsvaColor {
    let value = (hex || '').replace('#', '').trim();
    if (value.length === 3 || value.length === 4) {
        value = value
            .split('')
            .map(digit => digit + digit)
            .join('');
    }
    if (value.length !== 6 && value.length !== 8) {
        return { h: 0, s: 0, v: 0, a: 1 };
    }

    const r = parseInt(value.substring(0, 2), 16);
    const g = parseInt(value.substring(2, 4), 16);
    const b = parseInt(value.substring(4, 6), 16);
    const a = value.length === 8 ? parseInt(value.substring(6, 8), 16) / 255 : 1;

    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
        return { h: 0, s: 0, v: 0, a: 1 };
    }

    return rgbaToHsva({ r, g, b, a });
}

/**
 * The colour of a white light of this temperature, as `#rrggbb`.
 *
 * A warm white lamp is not one colour and a cold one another: the whole range from candlelight to an overcast
 * sky is a curve, and this is the approximation of it that every lighting UI uses - Tanner Helland's, good to
 * a few percent between 1000 and 40000 Kelvin, which is far more than an eye asks of a slider.
 *
 * @param kelvin - the colour temperature, as a lamp reports it
 * @returns the colour to paint with
 */
export function kelvinToHex(kelvin: number): string {
    const temperature = Math.max(1000, Math.min(40000, kelvin)) / 100;

    const red = temperature <= 66 ? 255 : 329.698727446 * Math.pow(Math.max(0, temperature - 60), -0.1332047592);
    const green =
        temperature <= 66
            ? 99.4708025861 * Math.log(temperature) - 161.1195681661
            : 288.1221695283 * Math.pow(Math.max(0, temperature - 60), -0.0755148492);
    const blue =
        temperature >= 66 ? 255 : temperature <= 19 ? 0 : 138.5177312231 * Math.log(temperature - 10) - 305.0447927307;

    return rgbaToHex({ r: red, g: green, b: blue, a: 1 });
}
