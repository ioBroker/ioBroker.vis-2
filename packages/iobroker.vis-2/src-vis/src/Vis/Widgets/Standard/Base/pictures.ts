/**
 * The pictures the palette shows for these widget sets.
 *
 * A tooltip that shows the same 30 pixel icon as the row it belongs to says nothing, so it gets a picture of
 * the widget as it looks on a page: the card with its name, its value and its slider, or the marker as it sits
 * on a floor plan. They are drawn here, from the same description the widget itself is built from - a device
 * says what it shows, and the two sets each draw their own version of it.
 *
 * Screenshots would have been the other way. They would also be eleven files per device that nobody remembers
 * to retake when a card changes, and they would be a light theme on a dark page or the other way round. This
 * stays true to the widget because it is made of the same parts.
 */

/** What a device shows, as far as a picture of it is concerned */
export interface DevicePicture {
    /** The colour the device is drawn in - the accent of a card, the ring of a marker */
    accent: string;
    /** The big number on the card, like `45 %`; a marker of that shape shows it too */
    value?: string;
    /** A quiet word left of the value, like `Open` on a blind */
    label?: string;
    /** The symbol of the device, as paths in a box of 24 by 24, drawn in `currentColor` */
    glyph: string;
    /** A toggle beside the value */
    toggle?: boolean;
    /** A slider across the bottom */
    slider?: boolean;
    /** The window of a blind in the middle, with its three buttons beside it */
    window?: boolean;
    /** A colour wheel in the middle */
    wheel?: boolean;
    /** The scale of a thermostat over the value */
    dial?: boolean;
    /** A heading, which is drawn as itself and not as a card */
    text?: string;
    /** A web page in a frame, likewise without a card */
    frame?: boolean;
    /** The bar of a fill level, with its scale */
    tank?: boolean;
    /** The picture of a camera, filling the card */
    camera?: boolean;
    /** The history of the value behind it */
    chart?: boolean;
}

/*
 * The colours of the picture.
 *
 * A tooltip is dark in both themes - that is what MUI does with it - so these are fixed rather than taken from
 * the theme: a card drawn in the light theme on the dark paper of a tooltip would be a white block.
 */
const PAPER = '#1b212c';
const LINE = '#39414f';
const INK = '#e6e9ef';
const QUIET = '#66707f';
const PLAN = '#0d1117';

/** The symbol of the device, in a box of the given size */
function glyphAt(glyph: string, x: number, y: number, size: number, color: string): string {
    return (
        `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
        `stroke="${color}" color="${color}">${glyph}</svg>`
    );
}

/** The number, with its unit smaller behind it */
function valueAt(value: string, x: number, y: number, size: number): string {
    const [number, unit] = value.split(' ');
    return (
        `<text x="${x}" y="${y}" font-family="system-ui, sans-serif" font-size="${size}" font-weight="700" ` +
        `fill="${INK}">${number}${
            unit
                ? `<tspan font-size="${Math.round(size * 0.6)}" font-weight="400" fill="${QUIET}"> ${unit}</tspan>`
                : ''
        }</text>`
    );
}

/** The wheel, as slices of hue with the white middle over them */
function wheel(cx: number, cy: number, r: number): string {
    const slices: string[] = [];
    const count = 24;
    for (let i = 0; i < count; i++) {
        const from = ((i / count) * 360 - 90 - 180 / count) * (Math.PI / 180);
        const to = (((i + 1) / count) * 360 - 90 - 180 / count) * (Math.PI / 180);
        const x1 = (cx + Math.cos(from) * r).toFixed(1);
        const y1 = (cy + Math.sin(from) * r).toFixed(1);
        const x2 = (cx + Math.cos(to) * r).toFixed(1);
        const y2 = (cy + Math.sin(to) * r).toFixed(1);
        slices.push(
            `<path d="M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2} Z" ` +
                `fill="hsl(${Math.round((i / count) * 360)}, 100%, 50%)"/>`,
        );
    }

    return (
        `<defs><radialGradient id="vis-wheel-white"><stop offset="0%" stop-color="#fff" stop-opacity="1"/>` +
        `<stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>` +
        `<g>${slices.join('')}</g>` +
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#vis-wheel-white)"/>`
    );
}

/** The line of a history behind the number - a shape, not real readings */
function chartBehind(accent: string): string {
    const points = [78, 62, 70, 44, 52, 58, 40, 46, 30, 36, 22, 28, 18];
    const path = points.map((y, i) => `${i ? 'L' : 'M'}${12 + i * 15} ${y}`).join(' ');
    return (
        `<path d="${path} L${12 + (points.length - 1) * 15} 108 L12 108 Z" fill="${accent}" opacity="0.14"/>` +
        `<path d="${path}" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.5"/>`
    );
}

/**
 * The widget of the set `relative`: a card in a section.
 *
 * @param picture - what the device shows
 */
export function relativePicture(picture: DevicePicture): string {
    // a heading and a web page have no card around them, so their picture has none either
    if (picture.text !== undefined) {
        return (
            `<svg viewBox="0 0 200 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">` +
            `<text x="16" y="56" font-family="system-ui, sans-serif" font-size="27" font-weight="700" ` +
            `fill="${INK}">${picture.text}</text>` +
            `<rect x="16" y="72" width="120" height="6" rx="3" fill="${QUIET}" opacity="0.4"/>` +
            `<rect x="16" y="86" width="86" height="6" rx="3" fill="${QUIET}" opacity="0.25"/></svg>`
        );
    }
    if (picture.frame) {
        return (
            `<svg viewBox="0 0 200 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">` +
            `<rect x="8" y="8" width="184" height="104" rx="8" fill="${PLAN}" stroke="${LINE}"/>` +
            `<path d="M8 30 H192" stroke="${LINE}"/>` +
            `<circle cx="20" cy="19" r="3" fill="${QUIET}"/><circle cx="31" cy="19" r="3" fill="${QUIET}"/>` +
            `<circle cx="42" cy="19" r="3" fill="${QUIET}"/>` +
            `<rect x="56" y="15" width="120" height="8" rx="4" fill="${QUIET}" opacity="0.3"/>` +
            `<rect x="24" y="46" width="152" height="8" rx="4" fill="${QUIET}" opacity="0.35"/>` +
            `<rect x="24" y="64" width="110" height="8" rx="4" fill="${QUIET}" opacity="0.25"/>` +
            `<rect x="24" y="82" width="134" height="8" rx="4" fill="${QUIET}" opacity="0.2"/></svg>`
        );
    }

    const parts: string[] = [`<rect x="1" y="1" width="198" height="118" rx="10" fill="${PAPER}" stroke="${LINE}"/>`];

    if (picture.chart) {
        parts.push(chartBehind(picture.accent));
    }

    // the header: the symbol and the name of the device, quietly
    parts.push(glyphAt(picture.glyph, 12, 11, 16, picture.accent));
    parts.push(`<rect x="34" y="16" width="76" height="7" rx="3.5" fill="${QUIET}" opacity="0.6"/>`);

    if (picture.window) {
        parts.push(`<rect x="12" y="34" width="104" height="50" rx="4" fill="${PLAN}" stroke="${LINE}"/>`);
        for (let y = 38; y < 62; y += 5) {
            parts.push(`<path d="M14 ${y} H114" stroke="${QUIET}" stroke-width="2" opacity="0.5"/>`);
        }
        parts.push(`<path d="M12 63 H116" stroke="${picture.accent}" stroke-width="2.5"/>`);
        // up, stop and down beside it
        [34, 51, 68].forEach((y, index) => {
            parts.push(
                `<rect x="124" y="${y}" width="16" height="15" rx="4" fill="none" stroke="${LINE}"/>` +
                    `<path d="${index === 1 ? `M128 ${y + 7} h8` : `M129 ${y + (index ? 6 : 9)} l3 ${index ? 3 : -3} l3 ${index ? -3 : 3}`}" ` +
                    `stroke="${QUIET}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
            );
        });
    }

    if (picture.wheel) {
        parts.push(wheel(100, 58, 26));
    }

    if (picture.camera) {
        // what a camera shows is the widget, so the picture of it is a picture
        parts.push(
            `<rect x="12" y="34" width="176" height="74" rx="8" fill="${PLAN}" stroke="${LINE}"/>` +
                `<path d="M12 94 L58 62 L92 88 L126 56 L188 96 L188 100 a8 8 0 0 1 -8 8 H20 a8 8 0 0 1 -8 -8 Z" ` +
                `fill="${picture.accent}" opacity="0.35"/>` +
                `<circle cx="150" cy="54" r="9" fill="${picture.accent}" opacity="0.5"/>`,
        );
        return `<svg viewBox="0 0 200 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${
            parts.join('') + glyphAt(picture.glyph, 12, 11, 16, picture.accent)
        }<rect x="34" y="16" width="76" height="7" rx="3.5" fill="${QUIET}" opacity="0.6"/></svg>`;
    }

    if (picture.tank) {
        const x = 78;
        const width = 30;
        parts.push(
            `<rect x="${x}" y="24" width="${width}" height="86" rx="10" fill="${LINE}" fill-opacity="0.4" ` +
                `stroke="${LINE}"/>` +
                `<path d="M${x} 62 h${width} v38 a10 10 0 0 1 -10 10 h-10 a10 10 0 0 1 -10 -10 z" ` +
                `fill="${picture.accent}"/>`,
        );
        [24, 45, 67, 88, 110].forEach(y =>
            parts.push(`<path d="M${x - 5} ${y} H${x + 5}" stroke="${QUIET}" stroke-width="1.5" opacity="0.7"/>`),
        );
    }

    if (picture.dial) {
        parts.push(
            `<defs><linearGradient id="vis-dial-scale" x1="0" y1="0" x2="1" y2="0">` +
                `<stop offset="0%" stop-color="#3f8cd9"/><stop offset="100%" stop-color="#ff7a33"/>` +
                `</linearGradient></defs>` +
                `<path d="M58 84 A42 42 0 1 1 142 84" fill="none" stroke="url(#vis-dial-scale)" ` +
                `stroke-width="8" stroke-linecap="round"/>` +
                `<circle cx="135" cy="52" r="7" fill="#fff"/>`,
        );
    }

    if (picture.label) {
        parts.push(
            `<text x="12" y="${picture.slider ? 92 : 100}" font-family="system-ui, sans-serif" font-size="11" ` +
                `fill="${QUIET}">${picture.label}</text>`,
        );
    }
    if (picture.value) {
        if (picture.dial) {
            parts.push(valueAt(picture.value, 100, 82, 26).replace('<text ', '<text text-anchor="middle" '));
        } else if (picture.tank) {
            parts.push(valueAt(picture.value, 116, 40, 18));
        } else {
            // with a slider under it the number sits a line higher, as it does on the card itself
            const y = picture.slider ? 95 : 103;
            const x = picture.label || picture.window || picture.wheel ? 188 : 12;
            const anchor = x === 188 ? ' text-anchor="end"' : '';
            parts.push(valueAt(picture.value, x, y, 24).replace('<text ', `<text${anchor} `));
        }
    }
    if (picture.toggle) {
        parts.push(
            `<rect x="150" y="${picture.slider ? 78 : 86}" width="36" height="19" rx="9.5" fill="${picture.accent}"/>` +
                `<circle cx="${176}" cy="${picture.slider ? 87.5 : 95.5}" r="7.5" fill="#fff"/>`,
        );
    }
    if (picture.slider) {
        parts.push(
            `<rect x="12" y="105" width="176" height="6" rx="3" fill="${LINE}"/>` +
                `<rect x="12" y="105" width="104" height="6" rx="3" fill="${picture.accent}"/>` +
                `<circle cx="116" cy="108" r="8" fill="${picture.accent}"/>`,
        );
    }

    return `<svg viewBox="0 0 200 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`;
}

/**
 * The widget of the set `absolute`: a marker on a plan of the flat.
 *
 * @param picture - what the device shows
 */
export function absolutePicture(picture: DevicePicture): string {
    // on a plan these two are the same thing they are in a section, only placed by hand
    if (picture.text !== undefined || picture.frame) {
        return relativePicture(picture);
    }

    const withValue = !!picture.value;
    const cx = 100;
    const cy = 48;

    /*
     * Nothing behind it but the dark of a page.
     *
     * A hint of a floor plan was drawn here at first, because that is what these markers are put on. It
     * looked like a mistake: the lines ran straight through the marker and the eye read the two as one
     * drawing. What the picture is about is the marker, and a marker on a dark page is what it looks like.
     */
    const parts: string[] = [`<rect x="0" y="0" width="200" height="120" rx="6" fill="${PLAN}"/>`];

    // the glow of a marker is half of how it looks, and it is what finds it again on a busy picture
    parts.push(
        withValue
            ? `<rect x="${cx - 58}" y="${cy - 27}" width="116" height="54" rx="27" fill="${picture.accent}" ` +
                  `opacity="0.16"/>`
            : `<circle cx="${cx}" cy="${cy}" r="30" fill="${picture.accent}" opacity="0.16"/>`,
    );

    if (withValue) {
        parts.push(
            `<rect x="${cx - 52}" y="${cy - 21}" width="104" height="42" rx="21" fill="${PAPER}" ` +
                `stroke="${picture.accent}" stroke-width="2.5"/>`,
        );
        parts.push(glyphAt(picture.glyph, cx - 36, cy - 11, 22, picture.accent));
        parts.push(
            valueAt(picture.value as string, cx - 6, cy + 8, 22).replace('<text ', '<text text-anchor="start" '),
        );
    } else {
        parts.push(
            `<circle cx="${cx}" cy="${cy}" r="24" fill="${PAPER}" stroke="${picture.accent}" stroke-width="2.5"/>`,
        );
        parts.push(glyphAt(picture.glyph, cx - 13, cy - 13, 26, picture.accent));
    }

    /*
     * No name under it.
     *
     * A bar stood here for the caption the marker can carry. Under a card it reads as a name, because it
     * sits in a header row beside the icon; alone under a marker it reads as a grey bar that somebody
     * forgot to remove. The caption is a setting anyway - most markers on a plan show none.
     */

    return `<svg viewBox="0 0 200 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`;
}
