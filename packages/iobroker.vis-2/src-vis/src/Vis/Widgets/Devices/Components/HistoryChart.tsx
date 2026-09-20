import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Box, Button, ButtonGroup, LinearProgress } from '@mui/material';

import type { Connection, ThemeType } from '@iobroker/gui-components';

/**
 * The history of one or two states, drawn as an SVG.
 *
 * The widgets of this set show a line, a step curve and a tooltip - that is a few hundred lines of SVG and does
 * not need a charting library. It is modelled on the chart of the devices adapter
 * (`src-admin/src/WidgetsManager/Widgets/ChartDialog.tsx`).
 *
 * What it can do: one or two series, line or step, pan with the mouse, zoom with the wheel, a crosshair with the
 * values under the cursor, a second axis when the two states have different units, and the words of a state with
 * `common.states` instead of its number.
 */

const MARGIN = { top: 10, right: 12, bottom: 32, left: 52 };

/** How far back the chart looks, and what the buttons above it offer. */
const RANGES: { hours: number; label: string }[] = [
    { hours: 1, label: '1h' },
    { hours: 6, label: '6h' },
    { hours: 12, label: '12h' },
    { hours: 24, label: '1d' },
    { hours: 72, label: '3d' },
    { hours: 168, label: '7d' },
    { hours: 720, label: '30d' },
];

const DEFAULT_COLORS = ['#3f8cd9', '#e08a3c'];

export interface ChartSeries {
    data: { ts: number; val: number }[];
    color: string;
    name?: string;
    unit?: string;
    /** The words of a state that has `common.states`, by its value. */
    states?: Record<string, string>;
    /** true and false instead of 1 and 0. */
    isBoolean?: boolean;
    /** A boolean or a state list is held until the next value arrives. */
    step?: boolean;
}

/**
 * The time under a tick of the time axis.
 *
 * @param ts the moment
 * @param rangeMs how much time the chart shows, which decides whether the day is written as well
 * @returns the time as text
 */
function formatTime(ts: number, rangeMs: number): string {
    const d = new Date(ts);
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    if (rangeMs > 3 * 86_400_000) {
        return `${d.getDate()}.${d.getMonth() + 1} ${time}`;
    }
    return time;
}

/**
 * A value with as many decimals as it needs.
 *
 * @param value the number
 * @param isFloatComma true when the system writes a comma instead of a point
 * @returns the number as text
 */
function formatValue(value: number, isFloatComma?: boolean): string {
    const abs = Math.abs(value);
    const text = abs >= 1000 ? value.toFixed(0) : abs >= 10 ? value.toFixed(1) : value.toFixed(2);
    return isFloatComma ? text.replace('.', ',') : text;
}

/**
 * The label of a value on the axis or in the tooltip: the word of a state, true/false, or the number.
 *
 * @param series the series the value belongs to
 * @param value the value
 * @param isFloatComma true when the system writes a comma instead of a point
 * @returns the value as text
 */
function formatSeriesValue(series: ChartSeries | undefined, value: number, isFloatComma?: boolean): string {
    if (series?.isBoolean) {
        return value >= 0.5 ? 'TRUE' : 'FALSE';
    }
    if (series?.states) {
        const word = series.states[Math.round(value).toString()];
        if (word !== undefined) {
            return word;
        }
    }
    return formatValue(value, isFloatComma);
}

/**
 * A step for the ticks that a human would choose: 1, 2, 5 or 10 times a power of ten.
 *
 * @param range what has to be covered
 * @param ticks about how many ticks there should be
 * @returns the distance between two ticks
 */
function niceStep(range: number, ticks: number): number {
    const raw = range / ticks;
    const pow = 10 ** Math.floor(Math.log10(raw));
    const norm = raw / pow;
    const step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
    return step * pow;
}

/**
 * The value of a series at a moment between two of its points.
 *
 * @param data the points of the series, by time
 * @param ts the moment
 * @returns the value, or null when the series has no points
 */
function interpolateAt(data: { ts: number; val: number }[], ts: number): number | null {
    if (!data.length) {
        return null;
    }
    if (ts <= data[0].ts) {
        return data[0].val;
    }
    if (ts >= data[data.length - 1].ts) {
        return data[data.length - 1].val;
    }
    let lo = 0;
    let hi = data.length - 1;
    while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (data[mid].ts <= ts) {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    const a = data[lo];
    const b = data[hi];
    return a.val + ((ts - a.ts) / (b.ts - a.ts)) * (b.val - a.val);
}

/**
 * The `d` of the line: straight from point to point, or held until the next one.
 *
 * @param points where the points sit on the drawing
 * @param step true when the value is held until the next point
 * @returns the path
 */
function buildLinePath(points: { x: number; y: number }[], step?: boolean): string {
    if (points.length < 2) {
        return '';
    }
    if (step) {
        let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
        for (let i = 1; i < points.length; i++) {
            d += `H${points[i].x.toFixed(1)}V${points[i].y.toFixed(1)}`;
        }
        return d;
    }
    return `M${points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L')}`;
}

/** What the crosshair shows: where it stands and the value of every series there. */
interface Tooltip {
    x: number;
    ts: number;
    entries: { val: number; y: number; color: string; name?: string; unit?: string; series: ChartSeries }[];
}

interface InteractiveChartProps {
    series: ChartSeries[];
    width: number;
    height: number;
    title?: string;
    isFloatComma?: boolean;
    themeType: ThemeType;
    /** The period that was asked for - it is shown while no data has arrived. */
    fallback: { start: number; end: number };
    /** Called 400 ms after the last pan or zoom, with the range that is now shown. */
    onViewSettle?: (start: number, end: number) => void;
}

/**
 * The drawing itself.
 *
 * @param props the series and the size it may take
 * @returns the SVG
 */
function InteractiveChart(props: InteractiveChartProps): React.JSX.Element {
    const { series, width, height, title, isFloatComma, themeType, onViewSettle } = props;
    const svgRef = useRef<SVGSVGElement>(null);
    const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const panRef = useRef<{ startX: number; startViewStart: number; startViewEnd: number } | null>(null);

    // what the data covers
    let globalTsMin = Infinity;
    let globalTsMax = -Infinity;
    let valMin = Infinity;
    let valMax = -Infinity;
    for (const s of series) {
        for (const p of s.data) {
            if (p.ts < globalTsMin) {
                globalTsMin = p.ts;
            }
            if (p.ts > globalTsMax) {
                globalTsMax = p.ts;
            }
        }
    }
    if (globalTsMin === Infinity) {
        // nothing came back: show the period that was asked for
        globalTsMin = props.fallback.start;
        globalTsMax = props.fallback.end;
    }

    // two states with different units get an axis each, otherwise they share the left one
    const dualAxis = series.length === 2 && !!series[0].unit && !!series[1].unit && series[0].unit !== series[1].unit;

    /**
     * The smallest and the biggest value of some series, with a little air above and below.
     *
     * @param list the series to look at
     * @returns the range of the axis
     */
    const rangeOf = (list: ChartSeries[]): { min: number; max: number } => {
        let min = Infinity;
        let max = -Infinity;
        for (const s of list) {
            if (s.isBoolean) {
                min = Math.min(min, 0);
                max = Math.max(max, 1);
            }
            for (const p of s.data) {
                if (p.val < min) {
                    min = p.val;
                }
                if (p.val > max) {
                    max = p.val;
                }
            }
        }
        if (min === Infinity) {
            return { min: 0, max: 1 };
        }
        const air = (max - min || 1) * 0.05;
        return { min: min - air, max: max + air };
    };

    const left = rangeOf(dualAxis ? [series[0]] : series);
    const right = dualAxis ? rangeOf([series[1]]) : left;
    valMin = left.min;
    valMax = left.max;

    const marginRight = dualAxis ? 52 : MARGIN.right;
    const plotW = width - MARGIN.left - marginRight;
    const plotH = height - MARGIN.top - MARGIN.bottom;

    const [viewStart, setViewStart] = useState(globalTsMin);
    const [viewEnd, setViewEnd] = useState(globalTsMax);
    const [tooltip, setTooltip] = useState<Tooltip | null>(null);

    // new data means a new view
    useEffect(() => {
        setViewStart(globalTsMin);
        setViewEnd(globalTsMax);
    }, [globalTsMin, globalTsMax]);

    useEffect(
        () => () => {
            if (settleTimer.current) {
                clearTimeout(settleTimer.current);
            }
        },
        [],
    );

    const scheduleSettle = useCallback(
        (start: number, end: number): void => {
            if (settleTimer.current) {
                clearTimeout(settleTimer.current);
            }
            if (onViewSettle) {
                settleTimer.current = setTimeout(() => {
                    settleTimer.current = null;
                    onViewSettle(start, end);
                }, 400);
            }
        },
        [onViewSettle],
    );

    const tsToX = (ts: number): number => MARGIN.left + ((ts - viewStart) / (viewEnd - viewStart)) * plotW;
    const valToY = (val: number): number => MARGIN.top + plotH - ((val - valMin) / (valMax - valMin)) * plotH;
    const valToY2 = (val: number): number => MARGIN.top + plotH - ((val - right.min) / (right.max - right.min)) * plotH;
    const xToTs = (x: number): number => viewStart + ((x - MARGIN.left) / plotW) * (viewEnd - viewStart);

    const onPointerDown = (e: React.PointerEvent): void => {
        if (e.button !== 0) {
            return;
        }
        (e.target as SVGSVGElement).setPointerCapture(e.pointerId);
        panRef.current = { startX: e.clientX, startViewStart: viewStart, startViewEnd: viewEnd };
        setTooltip(null);
    };

    const onPointerMove = (e: React.PointerEvent): void => {
        const pan = panRef.current;
        if (pan) {
            const dt = -(e.clientX - pan.startX) * ((pan.startViewEnd - pan.startViewStart) / plotW);
            setViewStart(pan.startViewStart + dt);
            setViewEnd(pan.startViewEnd + dt);
            return;
        }
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) {
            return;
        }
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        if (mx < MARGIN.left || mx > width - marginRight || my < MARGIN.top || my > height - MARGIN.bottom) {
            setTooltip(null);
            return;
        }
        // the crosshair snaps to the point that is nearest in time
        const ts = xToTs(mx);
        let bestTs = ts;
        let bestDist = Infinity;
        for (const s of series) {
            for (const p of s.data) {
                const dist = Math.abs(p.ts - ts);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestTs = p.ts;
                }
            }
        }
        const entries: Tooltip['entries'] = [];
        for (let i = 0; i < series.length; i++) {
            const value = interpolateAt(series[i].data, bestTs);
            if (value !== null) {
                entries.push({
                    val: value,
                    y: (dualAxis && i === 1 ? valToY2 : valToY)(value),
                    color: series[i].color,
                    name: series[i].name,
                    unit: series[i].unit,
                    series: series[i],
                });
            }
        }
        if (entries.length) {
            setTooltip({ x: tsToX(bestTs), ts: bestTs, entries });
        }
    };

    const onPointerUp = (e: React.PointerEvent): void => {
        if (panRef.current) {
            (e.target as SVGSVGElement).releasePointerCapture(e.pointerId);
            panRef.current = null;
            scheduleSettle(viewStart, viewEnd);
        }
    };

    const onWheel = (e: React.WheelEvent): void => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) {
            return;
        }
        const pivot = xToTs(e.clientX - rect.left);
        const factor = e.deltaY > 0 ? 1.2 : 1 / 1.2;
        const newStart = pivot - (pivot - viewStart) * factor;
        const newEnd = pivot + (viewEnd - pivot) * factor;
        // not closer than five minutes
        if (newEnd - newStart > 300_000) {
            setViewStart(newStart);
            setViewEnd(newEnd);
            scheduleSettle(newStart, newEnd);
        }
        setTooltip(null);
    };

    // the lines
    const paths: React.JSX.Element[] = [];
    for (let i = 0; i < series.length; i++) {
        const s = series[i];
        const visible = s.data.filter(p => p.ts >= viewStart && p.ts <= viewEnd);
        if (visible.length < 2) {
            continue;
        }
        const yFn = dualAxis && i === 1 ? valToY2 : valToY;
        const points = visible.map(p => ({ x: tsToX(p.ts), y: yFn(p.val) }));
        const d = buildLinePath(points, s.step);
        if (!d) {
            continue;
        }
        const baseY = (MARGIN.top + plotH).toFixed(1);
        paths.push(
            <React.Fragment key={i}>
                <path
                    d={`${d}L${points[points.length - 1].x.toFixed(1)},${baseY}L${points[0].x.toFixed(1)},${baseY}Z`}
                    fill={s.color}
                    opacity={0.12}
                />
                <path
                    d={d}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2"
                    strokeLinejoin="round"
                />
            </React.Fragment>,
        );
    }

    const viewRange = viewEnd - viewStart;
    const timeTicks: number[] = [];
    const timeStep = niceStep(viewRange, Math.max(3, Math.floor(plotW / 80)));
    for (let t = Math.ceil(viewStart / timeStep) * timeStep; t <= viewEnd; t += timeStep) {
        timeTicks.push(t);
    }

    /**
     * The values the axis writes out.
     *
     * @param min the smallest value of the axis
     * @param max the biggest value of the axis
     * @param s the series the axis belongs to, for a boolean or a state list
     * @returns the values of the ticks
     */
    const ticksOf = (min: number, max: number, s?: ChartSeries): number[] => {
        if (s?.isBoolean) {
            return [0, 1];
        }
        if (s?.states) {
            const values = Object.keys(s.states)
                .map(key => parseFloat(key))
                .filter(value => !isNaN(value) && value >= min && value <= max);
            if (values.length && values.length < 12) {
                return values.sort((a, b) => a - b);
            }
        }
        const result: number[] = [];
        const step = niceStep(max - min, Math.max(3, Math.floor(plotH / 40)));
        for (let v = Math.ceil(min / step) * step; v <= max; v += step) {
            result.push(v);
        }
        return result;
    };

    const valTicks = ticksOf(valMin, valMax, dualAxis ? series[0] : series.length === 1 ? series[0] : undefined);
    const val2Ticks = dualAxis ? ticksOf(right.min, right.max, series[1]) : [];
    const paperColor = themeType === 'dark' ? '#2b2b2b' : '#ffffff';

    return (
        <svg
            ref={svgRef}
            width={width}
            height={height}
            style={{
                touchAction: 'none',
                userSelect: 'none',
                cursor: panRef.current ? 'grabbing' : 'crosshair',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => setTooltip(null)}
            onWheel={onWheel}
        >
            {valTicks.map(v => (
                <line
                    key={`vg${v}`}
                    x1={MARGIN.left}
                    x2={width - marginRight}
                    y1={valToY(v)}
                    y2={valToY(v)}
                    stroke="currentColor"
                    opacity={0.08}
                />
            ))}
            {timeTicks.map(t => (
                <line
                    key={`tg${t}`}
                    x1={tsToX(t)}
                    x2={tsToX(t)}
                    y1={MARGIN.top}
                    y2={height - MARGIN.bottom}
                    stroke="currentColor"
                    opacity={0.08}
                />
            ))}

            <defs>
                <clipPath id="vis-2-history-clip">
                    <rect
                        x={MARGIN.left}
                        y={MARGIN.top}
                        width={plotW}
                        height={plotH}
                    />
                </clipPath>
            </defs>
            <g clipPath="url(#vis-2-history-clip)">{paths}</g>

            {timeTicks.map(t => (
                <text
                    key={`tl${t}`}
                    x={tsToX(t)}
                    y={height - MARGIN.bottom + 16}
                    textAnchor="middle"
                    fontSize={11}
                    fill="currentColor"
                    opacity={0.5}
                >
                    {formatTime(t, viewRange)}
                </text>
            ))}

            {valTicks.map((v, i) => {
                const axisSeries = dualAxis ? series[0] : series.length === 1 ? series[0] : undefined;
                const unit = dualAxis ? series[0].unit : series.length === 1 ? series[0].unit : undefined;
                return (
                    <text
                        key={`vl${v}`}
                        x={MARGIN.left - 6}
                        y={valToY(v) + 4}
                        textAnchor="end"
                        fontSize={11}
                        fill={dualAxis ? series[0].color : 'currentColor'}
                        opacity={dualAxis ? 0.7 : 0.5}
                    >
                        {formatSeriesValue(axisSeries, v, isFloatComma)}
                        {!axisSeries?.isBoolean && !axisSeries?.states && i === valTicks.length - 1 && unit
                            ? ` ${unit}`
                            : ''}
                    </text>
                );
            })}

            {val2Ticks.map((v, i) => (
                <text
                    key={`vr${v}`}
                    x={width - marginRight + 6}
                    y={valToY2(v) + 4}
                    textAnchor="start"
                    fontSize={11}
                    fill={series[1].color}
                    opacity={0.7}
                >
                    {formatSeriesValue(series[1], v, isFloatComma)}
                    {i === val2Ticks.length - 1 && series[1].unit ? ` ${series[1].unit}` : ''}
                </text>
            ))}

            {tooltip
                ? (() => {
                      const timeLabel = formatTime(tooltip.ts, viewRange);
                      const fontSize = 11;
                      const lineHeight = fontSize + 3;
                      const padX = 6;
                      const padY = 3;

                      const labels = tooltip.entries.map(e => {
                          const name = e.name || (series.length === 1 ? title : undefined);
                          const value = formatSeriesValue(e.series, e.val, isFloatComma);
                          const unit = e.series.isBoolean || e.series.states ? '' : e.unit ? ` ${e.unit}` : '';
                          return `${name ? `${name}: ` : ''}${value}${unit}`;
                      });
                      const boxW = Math.max(...[...labels, timeLabel].map(l => l.length)) * 6.5 + padX * 2;
                      const boxH = lineHeight * labels.length + (fontSize - 1) + padY * 2 + 4;

                      const topY = Math.min(...tooltip.entries.map(e => e.y));
                      const above = topY - boxH - 12 > MARGIN.top;
                      const boxY = above ? topY - boxH - 8 : Math.max(...tooltip.entries.map(e => e.y)) + 12;
                      let boxX = tooltip.x - boxW / 2;
                      if (boxX < MARGIN.left) {
                          boxX = MARGIN.left;
                      }
                      if (boxX + boxW > width - marginRight) {
                          boxX = width - marginRight - boxW;
                      }

                      return (
                          <>
                              <line
                                  x1={tooltip.x}
                                  x2={tooltip.x}
                                  y1={MARGIN.top}
                                  y2={height - MARGIN.bottom}
                                  stroke="currentColor"
                                  opacity={0.2}
                                  strokeDasharray="3,3"
                              />
                              {tooltip.entries.map((e, i) => (
                                  <circle
                                      key={i}
                                      cx={tooltip.x}
                                      cy={e.y}
                                      r={4}
                                      fill={e.color}
                                      stroke={paperColor}
                                      strokeWidth={1.5}
                                  />
                              ))}
                              <rect
                                  x={boxX}
                                  y={boxY}
                                  width={boxW}
                                  height={boxH}
                                  rx={4}
                                  fill={paperColor}
                                  stroke="currentColor"
                                  strokeOpacity={0.15}
                              />
                              {labels.map((label, i) => (
                                  <text
                                      key={i}
                                      x={boxX + padX}
                                      y={boxY + padY + lineHeight * i + fontSize}
                                      fontSize={fontSize}
                                      fontWeight={600}
                                      fill={tooltip.entries[i].color}
                                  >
                                      {label}
                                  </text>
                              ))}
                              <text
                                  x={boxX + padX}
                                  y={boxY + padY + lineHeight * labels.length + (fontSize - 1)}
                                  fontSize={fontSize - 1}
                                  fill="currentColor"
                                  opacity={0.5}
                              >
                                  {timeLabel}
                              </text>
                          </>
                      );
                  })()
                : null}
        </svg>
    );
}

/** What a widget has to say about a state whose history it wants to see. */
export interface HistoryChartObject {
    common: ioBroker.StateCommon;
    _id: string;
}

export interface HistoryChartProps {
    socket: Connection;
    /** The state whose history is shown. */
    obj: HistoryChartObject | null | undefined;
    /** A second state, drawn into the same chart. */
    obj2?: HistoryChartObject | null;
    /** The instance that logs the first state, e.g. `history.0`. */
    historyInstance: string | null;
    /** The instance that logs the second state, when it is another one. */
    historyInstance2?: string | null;
    /** The first state is held until the next value arrives. */
    objStep?: boolean;
    /** The second state is held until the next value arrives. */
    obj2Step?: boolean;
    chartTitle?: string;
    themeType: ThemeType;
    /** The system writes a comma instead of a point. */
    isFloatComma?: boolean;
    /** No buttons for the period above the chart. */
    noToolbar?: boolean;
    t: (word: string) => string;
}

/**
 * The chart with the buttons for the period above it: it asks the history adapter for the values and draws them.
 *
 * @param props the states, where their history is, and how it should look
 * @returns the chart
 */
export default function HistoryChart(props: HistoryChartProps): React.JSX.Element {
    const { socket, obj, obj2, historyInstance, historyInstance2, themeType, noToolbar, t } = props;

    const [hours, setHours] = useState(24);
    const [series, setSeries] = useState<ChartSeries[]>([]);
    // what was asked for last, so that the chart has an axis even before the first value arrives
    const [range, setRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
    const [loading, setLoading] = useState(false);
    const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
    const divRef = useRef<HTMLDivElement>(null);

    // the chart fills what its place offers
    useEffect(() => {
        const element = divRef.current;
        if (!element) {
            return;
        }
        const observer = new ResizeObserver(entries => {
            const rect = entries[0].contentRect;
            setSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
        });
        observer.observe(element);
        setSize({ width: element.clientWidth, height: element.clientHeight });
        return () => observer.disconnect();
    }, []);

    const load = useCallback(
        async (start: number, end: number): Promise<void> => {
            const wanted: { object: HistoryChartObject; instance: string; step?: boolean; color: string }[] = [];
            if (obj?._id && historyInstance) {
                wanted.push({
                    object: obj,
                    instance: historyInstance,
                    step: props.objStep,
                    color: DEFAULT_COLORS[0],
                });
            }
            const instance2 = historyInstance2 || historyInstance;
            if (obj2?._id && instance2) {
                wanted.push({
                    object: obj2,
                    instance: instance2,
                    step: props.obj2Step,
                    color: DEFAULT_COLORS[1],
                });
            }
            if (!wanted.length) {
                setSeries([]);
                return;
            }

            setLoading(true);
            const result: ChartSeries[] = [];
            for (const { object, instance, step, color } of wanted) {
                try {
                    const history = await socket.getHistory(object._id, {
                        instance,
                        start,
                        end,
                        // above an hour the adapter may thin the values out, below it every value is wanted
                        aggregate: end - start > 3_600_000 ? 'minmax' : 'none',
                        count: 2000,
                        from: false,
                        ack: false,
                        q: false,
                        addId: false,
                        returnNewestEntries: true,
                    });
                    const data: { ts: number; val: number }[] = [];
                    if (Array.isArray(history)) {
                        for (const point of history) {
                            const value = point.val === true ? 1 : point.val === false ? 0 : Number(point.val);
                            if (point.val !== null && point.val !== undefined && !isNaN(value)) {
                                data.push({ ts: point.ts, val: value });
                            }
                        }
                    }
                    const isBoolean = object.common?.type === 'boolean';
                    result.push({
                        data,
                        color,
                        name: typeof object.common?.name === 'string' ? object.common.name : object._id,
                        unit: object.common?.unit,
                        states: object.common?.states as Record<string, string> | undefined,
                        isBoolean,
                        step: step || isBoolean || !!object.common?.states,
                    });
                } catch (e) {
                    console.warn(`Cannot read the history of ${object._id}: ${e as Error}`);
                }
            }
            setSeries(result);
            setLoading(false);
        },
        [obj, obj2, historyInstance, historyInstance2, socket, props.objStep, props.obj2Step],
    );

    useEffect(() => {
        const end = Date.now();
        const start = end - hours * 3_600_000;
        setRange({ start, end });
        void load(start, end);
    }, [load, hours]);

    return (
        <Box
            component="div"
            style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
        >
            {noToolbar ? null : (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
                    {loading ? (
                        <LinearProgress style={{ flexGrow: 1 }} />
                    ) : (
                        <div
                            style={{ flexGrow: 1, opacity: 0.6, fontSize: 12 }}
                            title={t('period')}
                        >
                            {props.chartTitle}
                        </div>
                    )}
                    <ButtonGroup size="small">
                        {RANGES.map(range => (
                            <Button
                                key={range.hours}
                                variant={range.hours === hours ? 'contained' : 'outlined'}
                                onClick={() => setHours(range.hours)}
                            >
                                {range.label}
                            </Button>
                        ))}
                    </ButtonGroup>
                </div>
            )}
            <div
                ref={divRef}
                style={{ width: '100%', flexGrow: 1, minHeight: 120, overflow: 'hidden' }}
            >
                {size.width > 80 && size.height > 80 ? (
                    <InteractiveChart
                        series={series}
                        width={size.width}
                        height={size.height}
                        title={props.chartTitle}
                        fallback={range}
                        isFloatComma={props.isFloatComma}
                        themeType={themeType}
                        onViewSettle={(start, end) => {
                            setRange({ start, end });
                            void load(start, end);
                        }}
                    />
                ) : null}
            </div>
        </Box>
    );
}
