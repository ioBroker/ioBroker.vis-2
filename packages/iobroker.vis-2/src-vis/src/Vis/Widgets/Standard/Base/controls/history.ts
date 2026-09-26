import type { Connection } from '@iobroker/gui-components';

/** The adapters that keep a history of a state */
const HISTORY_ADAPTERS = /^(history|sql|influxdb)\.\d+$/;

/** One reading out of the history */
export interface HistoryPoint {
    ts: number;
    val: number;
}

/**
 * The instance that logs a state, out of what its object says, or null if none does.
 *
 * A state is logged when it carries the settings of a history adapter under `common.custom`. Which of them to
 * ask, when there are several, is what the system setting `defaultHistory` says; without it the first one
 * found is taken.
 *
 * The object itself is not read here: the widget has it anyway - it wants the limits and the unit from it too
 * - and reading it twice for one state is a round trip for nothing.
 *
 * @param common - the `common` of the state, as the object carries it
 * @param defaultHistory - the instance the system prefers, out of the system settings
 */
export function historyInstanceIn(
    common: ioBroker.StateCommon | null | undefined,
    defaultHistory?: string,
): string | null {
    const custom = common?.custom as Record<string, { enabled?: boolean }> | undefined;
    if (!custom) {
        return null;
    }

    const recorded = (instance: string): boolean =>
        HISTORY_ADAPTERS.test(instance) && custom[instance]?.enabled !== false;

    if (defaultHistory && recorded(defaultHistory)) {
        return defaultHistory;
    }
    return Object.keys(custom).find(recorded) || null;
}

/**
 * The readings of a state over the last hours, thinned out to about as many points as there are pixels.
 *
 * @param socket - the connection to the ioBroker server
 * @param instance - the history instance to ask, see `historyInstanceOf`
 * @param oid - the state
 * @param hours - how far back to go
 * @param points - about how many readings are wanted
 */
export async function loadHistory(
    socket: Connection,
    instance: string,
    oid: string,
    hours: number,
    points = 120,
): Promise<HistoryPoint[]> {
    const end = Date.now();
    const start = end - hours * 3_600_000;

    let result: { val: number | null; ts: number }[] | undefined;
    try {
        result = (await socket.getHistory(oid, {
            instance,
            start,
            end,
            aggregate: 'average',
            count: points,
            // a gap at the left edge makes a chart start in the middle of the card
            addId: false,
            ignoreNull: true,
        } as any)) as { val: number | null; ts: number }[];
    } catch {
        return [];
    }

    return (result || [])
        .filter(item => item && typeof item.val === 'number' && isFinite(item.val))
        .map(item => ({ ts: item.ts, val: item.val as number }));
}

/**
 * The readings, with the jitter taken out of them.
 *
 * A power meter that is read every ten seconds draws a saw, not a line, and the saw says nothing that
 * the shape underneath it does not say better. Each reading is replaced by the average of everything
 * within half the window to either side of it, which keeps the curve where it is - a smoothing that
 * only looks backwards drags the whole line to the right.
 *
 * The window moves forward with the readings rather than being summed afresh for each one, so this
 * costs one pass whatever the window is.
 *
 * @param points - the readings, oldest first
 * @param windowSec - how much time is averaged over; nothing happens at zero
 */
export function smoothHistory(points: HistoryPoint[], windowSec: number): HistoryPoint[] {
    if (windowSec <= 0 || points.length < 3) {
        return points;
    }
    const half = windowSec * 500;
    const out: HistoryPoint[] = [];
    let from = 0;
    let to = 0;
    let sum = 0;

    for (const point of points) {
        while (to < points.length && points[to].ts <= point.ts + half) {
            sum += points[to].val;
            to++;
        }
        while (points[from].ts < point.ts - half) {
            sum -= points[from].val;
            from++;
        }
        out.push({ ts: point.ts, val: sum / Math.max(1, to - from) });
    }

    return out;
}

/**
 * The `d` of a smooth line through these places, as cubic curves.
 *
 * Straight segments say exactly what was measured, and that is why they are the default; a curve is what one
 * wants when the shape matters more than the single reading. The curve is monotone - between two readings it
 * never leaves the band the two of them span - so a line that never went below zero is not drawn dipping under
 * it, which is what a plain Catmull-Rom spline would do at every turn.
 *
 * It is the method of Fritsch and Carlson: the slope at a reading is the average of the two around it, held at
 * zero wherever the line turns, and never steeper than three times the gentler of its neighbours.
 *
 * @param points - where the readings sit on the drawing, left to right
 */
export function curvePath(points: { x: number; y: number }[]): string {
    if (points.length < 2) {
        return '';
    }
    const last = points.length - 1;

    /** How steep it is between one reading and the next */
    const slope: number[] = [];
    for (let index = 0; index < last; index++) {
        const run = points[index + 1].x - points[index].x;
        slope.push(run ? (points[index + 1].y - points[index].y) / run : 0);
    }

    /** How steep the curve leaves each reading */
    const tangent: number[] = new Array(points.length);
    tangent[0] = slope[0];
    tangent[last] = slope[last - 1];
    for (let index = 1; index < last; index++) {
        if (slope[index - 1] * slope[index] <= 0) {
            // a peak or a trough stays one: a curve that runs on past it would overshoot
            tangent[index] = 0;
        } else {
            const mean = (slope[index - 1] + slope[index]) / 2;
            const limit = 3 * Math.min(Math.abs(slope[index - 1]), Math.abs(slope[index]));
            tangent[index] = Math.sign(mean) * Math.min(Math.abs(mean), limit);
        }
    }

    let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let index = 0; index < last; index++) {
        const third = (points[index + 1].x - points[index].x) / 3;
        const x1 = points[index].x + third;
        const y1 = points[index].y + tangent[index] * third;
        const x2 = points[index + 1].x - third;
        const y2 = points[index + 1].y - tangent[index + 1] * third;
        d +=
            ` C${x1.toFixed(1)} ${y1.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)} ` +
            `${points[index + 1].x.toFixed(1)} ${points[index + 1].y.toFixed(1)}`;
    }

    return d;
}

/**
 * The path of a line through these readings, and the area under it, in a box of the given size.
 *
 * The two are given back as SVG path data, so the drawing itself is a couple of elements and no library. The
 * value axis is stretched to what the readings actually cover, with a tenth of that as air above and below, so
 * a temperature that moves by half a degree is still a line and not a flat stroke.
 *
 * @param points - the readings, oldest first
 * @param width - the width of the box in its own coordinates
 * @param height - its height
 * @param spline - draw it as a smooth curve rather than from corner to corner
 */
export function historyPath(
    points: HistoryPoint[],
    width: number,
    height: number,
    spline?: boolean,
): { line: string; area: string } | null {
    if (points.length < 2) {
        return null;
    }
    const first = points[0].ts;
    const span = points[points.length - 1].ts - first || 1;

    let low = points[0].val;
    let high = points[0].val;
    for (const point of points) {
        low = Math.min(low, point.val);
        high = Math.max(high, point.val);
    }
    const air = (high - low) * 0.1 || 1;
    low -= air;
    high += air;
    const range = high - low || 1;

    const places = points.map(point => ({
        x: ((point.ts - first) / span) * width,
        y: height - ((point.val - low) / range) * height,
    }));

    const line = spline
        ? curvePath(places)
        : places.map((place, index) => `${index ? 'L' : 'M'}${place.x.toFixed(1)} ${place.y.toFixed(1)}`).join(' ');

    return { line, area: `${line} L${width} ${height} L0 ${height} Z` };
}
