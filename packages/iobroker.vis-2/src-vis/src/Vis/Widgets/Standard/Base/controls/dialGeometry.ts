/**
 * The arc that a dial is drawn on.
 *
 * Two widgets stand on it - the thermostat and the knob - and both want the same shape: an arc open at the
 * bottom, a knob that sits on it where the value is, and a pointer that is turned back into a value while it
 * is dragged. The shape lives here so the two cannot drift apart, which is what happens to a curve that is
 * written out twice.
 */

/** The box a dial is drawn in; the SVG stretches it to whatever the card gives it */
export const BOX = { width: 200, height: 150 };

/** The middle of the arc */
export const CENTRE = { x: 100, y: 96 };

export const RADIUS = 76;

/** How far the scale reaches to either side of twelve o'clock, in degrees */
export const SWEEP = 108;

/**
 * A point on the arc, by its angle from twelve o'clock.
 *
 * @param angle - degrees, negative to the left
 * @param radius - how far from the middle; the arc itself by default
 */
export function point(angle: number, radius = RADIUS): { x: number; y: number } {
    const radians = ((angle - 90) * Math.PI) / 180;
    return { x: CENTRE.x + Math.cos(radians) * radius, y: CENTRE.y + Math.sin(radians) * radius };
}

/**
 * The path of the arc between two angles.
 *
 * @param from - where it starts, in degrees from twelve o'clock
 * @param to - where it ends
 */
export function arcPath(from: number, to: number): string {
    const start = point(from);
    const end = point(to);
    const large = Math.abs(to - from) > 180 ? 1 : 0;
    return (
        `M${start.x.toFixed(1)} ${start.y.toFixed(1)} ` +
        `A${RADIUS} ${RADIUS} 0 ${large} 1 ${end.x.toFixed(1)} ${end.y.toFixed(1)}`
    );
}

/**
 * Where a value sits on the scale, as an angle.
 *
 * @param value - the value
 * @param min - the left end of the scale
 * @param max - the right end
 */
export function angleOf(value: number, min: number, max: number): number {
    const span = max - min || 1;
    const share = Math.max(0, Math.min(1, (value - min) / span));
    return -SWEEP + share * SWEEP * 2;
}

/** The part of the drawing an SVG shows, as its `viewBox` says it */
export interface DialView {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** The whole box */
export const FULL_VIEW: DialView = { x: 0, y: 0, width: BOX.width, height: BOX.height };

/**
 * Only what the thermostat draws, without the margin around it.
 *
 * The arc with its knob reaches from 14 to 186 across and from 10 to 130 down, the line under the reading ends
 * at 134. The rest of the box is air, and a drawing scaled to fit its card scales the air with it: the ring of a
 * thermostat stayed a size smaller than its card, however large the card was made.
 */
export const THERMOSTAT_VIEW: DialView = { x: 12, y: 8, width: 176, height: 128 };

/**
 * Where the pointer is in the coordinates of the drawing.
 *
 * The SVG keeps its proportions (`xMidYMid meet`): in a box of other proportions it is as large as the shorter
 * side allows and stands in the middle of the longer one. The pointer has to be read against that, not against
 * the box - reading it against the box bent the angle wherever the box was wider than the drawing.
 *
 * @param event - where the pointer is
 * @param event.clientX - its distance from the left edge of the window
 * @param event.clientY - its distance from the top
 * @param rect - the box the SVG ended up in
 * @param rect.left - its left edge
 * @param rect.top - its top edge
 * @param rect.width - how wide it ended up
 * @param rect.height - how high
 * @param view - the `viewBox` of the drawing
 */
export function pointerInView(
    event: { clientX: number; clientY: number },
    rect: { left: number; top: number; width: number; height: number },
    view: DialView,
): { x: number; y: number } {
    const scale = Math.min(rect.width / view.width, rect.height / view.height) || 1;
    const left = rect.left + (rect.width - view.width * scale) / 2;
    const top = rect.top + (rect.height - view.height * scale) / 2;

    return { x: view.x + (event.clientX - left) / scale, y: view.y + (event.clientY - top) / scale };
}

/**
 * Which value the pointer is over, out of where it is in the drawing.
 *
 * The drawing is scaled by the browser, so the pointer is put back into the coordinates of the `viewBox`
 * first - a dial that reads screen pixels works at one size and at no other.
 *
 * @param event - where the pointer is
 * @param event.clientX - its distance from the left edge of the window
 * @param event.clientY - its distance from the top
 * @param rect - the box the SVG ended up in
 * @param rect.left - its left edge
 * @param rect.top - its top edge
 * @param rect.width - how wide it ended up
 * @param rect.height - how high
 * @param min - the left end of the scale
 * @param max - the right end
 * @param view - the `viewBox` the drawing was given; the whole box if nothing else
 */
export function valueAt(
    event: { clientX: number; clientY: number },
    rect: { left: number; top: number; width: number; height: number },
    min: number,
    max: number,
    view: DialView = FULL_VIEW,
): number {
    const { x, y } = pointerInView(event, rect, view);
    const degrees = (Math.atan2(y - CENTRE.y, x - CENTRE.x) * 180) / Math.PI + 90;
    const turned = degrees > 180 ? degrees - 360 : degrees;

    return min + ((Math.max(-SWEEP, Math.min(SWEEP, turned)) + SWEEP) / (SWEEP * 2)) * (max - min || 1);
}
