/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 *
 * Short content:
 * Licensees may copy, distribute, display and perform the work and make derivative works based on it only if they give the author or licensor the credits in the manner specified by these.
 * Licensees may copy, distribute, display, and perform the work and make derivative works based on it only for noncommercial purposes.
 * (Free for non-commercial use).
 */

import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';
import VisRxWidget from '../../visRxWidget';

type RxData = {
    oid: string;
    title: string;
    min: number | string;
    max: number | string;
    label: string;
    background: string;
    padding: number | string;
    /** the tick values, separated by semicolons */
    ticks: string;
    showTickLabels: boolean;
    tickPadding: number | string;
    tickColor: string;
    /** the upper bound of each coloured band, separated by semicolons */
    intervals: string;
    intervalColors: string;
    intervalInnerRadius: number | string;
    intervalOuterRadius: number | string;
    shadowOffset: number | string;
    shadowAlpha: number | string;
    shadowDepth: number | string;
    ringColor: string;
    ringWidth: number | string;
    needleThickness: number | string;
    needlePad: number | string;
    hubRadius: number | string;
};

/**
 * The drawing happens in this box and is scaled into whatever size the widget has, so a radius that was set
 * for the 460x280 the widget started out with keeps meaning the same thing.
 */
const BOX_WIDTH = 460;
const BOX_HEIGHT = 280;
const CENTER_X = 230;
const CENTER_Y = 250;
const RADIUS = 225;
/** `span` of the jqPlot renderer is 180, which puts the arc between these two angles */
const START_ANGLE = 180;
const END_ANGLE = 0;

/** The colours the jqPlot renderer fell back to, kept so an untouched widget looks as it did */
const DEFAULT_RING_COLOR = '#BBC6D0';
const DEFAULT_TICK_COLOR = '#989898';
const DEFAULT_BACKGROUND = '#efefef';

/**
 * A point on a circle around the middle of the gauge.
 *
 * @param angle - in degrees, counted like in mathematics: 0 to the right, 180 to the left
 * @param radius - distance from the middle
 */
function polar(angle: number, radius: number): { x: number; y: number } {
    const rad = (angle * Math.PI) / 180;
    return { x: CENTER_X + radius * Math.cos(rad), y: CENTER_Y - radius * Math.sin(rad) };
}

/**
 * The path of a ring segment between two radii, drawn from `from` to `to` degrees.
 *
 * @param from - where the segment starts, in degrees
 * @param to - where it ends
 * @param inner - the smaller radius
 * @param outer - the bigger radius
 */
function ringSegment(from: number, to: number, inner: number, outer: number): string {
    // the arc goes clockwise on the screen because the angle counts the other way round than the y axis
    const large = Math.abs(to - from) > 180 ? 1 : 0;
    const a = polar(from, outer);
    const b = polar(to, outer);
    const c = polar(to, inner);
    const d = polar(from, inner);
    return (
        `M ${a.x} ${a.y} A ${outer} ${outer} 0 ${large} 1 ${b.x} ${b.y} ` +
        `L ${c.x} ${c.y} A ${inner} ${inner} 0 ${large} 0 ${d.x} ${d.y} Z`
    );
}

/** Read a setting that is a number, and fall back when it is empty or not a number */
function num(value: number | string | undefined, fallback: number): number {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }
    const parsed = parseFloat(value as string);
    return Number.isNaN(parsed) ? fallback : parsed;
}

/** Read a list of numbers written with semicolons between them, as the attributes of this widget are */
function numberList(value: string | undefined): number[] {
    if (!value) {
        return [];
    }
    return value
        .split(';')
        .map(entry => parseFloat(entry))
        .filter(entry => !Number.isNaN(entry));
}

/**
 * `jqplot - MeterGauge`: a state as a needle on a half-round scale.
 *
 * Replaces the can.js template `tplJqplotGauge`, which drew on a canvas through the jQuery plugin jqPlot. The
 * drawing is SVG here, so the plugin, jQuery and the resize handler the plugin needed are all gone - an SVG
 * scales by itself. Everything the template offered is still a setting and keeps its name, and the defaults
 * are the ones of the `MeterGaugeRenderer`: a span of 180 degrees, `#BBC6D0` for the ring, `#989898` for the
 * ticks, a hub of a eighteenth and a ring of a thirty-fifth of the diameter.
 */
class JqPlotGauge extends VisRxWidget<RxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplJqplotGauge',
            visSet: 'jqplot',
            visName: 'MeterGauge',
            visPrev: 'widgets/jqplot/img/Prev_MeterGauge.svg',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'oid', type: 'id' },
                        { name: 'title', type: 'text' },
                        { name: 'min', type: 'number' },
                        { name: 'max', type: 'number' },
                        { name: 'label', type: 'text' },
                        { name: 'background', type: 'color' },
                        { name: 'padding', type: 'slider', min: 0, max: 50, step: 1 },
                    ],
                },
                {
                    name: 'ticks',
                    fields: [
                        { name: 'ticks', type: 'text' },
                        { name: 'showTickLabels', type: 'checkbox', default: true },
                        { name: 'tickPadding', type: 'slider', min: 0, max: 50, step: 1 },
                        // read by the can.js widget although its attribute list never offered it
                        { name: 'tickColor', type: 'color' },
                    ],
                },
                {
                    name: 'intervals',
                    fields: [
                        { name: 'intervals', type: 'text' },
                        { name: 'intervalColors', type: 'text' },
                        { name: 'intervalInnerRadius', type: 'slider', min: 0, max: 550, step: 1 },
                        { name: 'intervalOuterRadius', type: 'slider', min: 0, max: 550, step: 1 },
                    ],
                },
                {
                    name: 'shadow',
                    fields: [
                        { name: 'shadowOffset', type: 'slider', min: 0, max: 50, step: 1 },
                        { name: 'shadowAlpha', type: 'slider', min: 0, max: 1, step: 0.05 },
                        { name: 'shadowDepth', type: 'slider', min: 0, max: 50, step: 1 },
                    ],
                },
                {
                    name: 'ring',
                    fields: [
                        { name: 'ringColor', type: 'color' },
                        { name: 'ringWidth', type: 'slider', min: 0, max: 150, step: 1 },
                    ],
                },
                {
                    name: 'needle',
                    fields: [
                        { name: 'needleThickness', type: 'slider', min: 0, max: 50, step: 1 },
                        { name: 'needlePad', type: 'slider', min: 0, max: 150, step: 1 },
                        { name: 'hubRadius', type: 'slider', min: 0, max: 150, step: 1 },
                    ],
                },
            ],
            visWidgetLabel: 'jqplot_meter_gauge', // Label of widget
            visHelp: 'help_jqplot_meter_gauge', // Description in the palette
            visDefaultStyle: {
                width: 460,
                height: 280,
            },
        } as const;
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return JqPlotGauge.getWidgetInfo();
    }

    /** Where the needle points: the angle that belongs to a value, clamped to the ends of the scale */
    // eslint-disable-next-line class-methods-use-this
    private angleOf(value: number, min: number, max: number): number {
        if (max === min) {
            return START_ANGLE;
        }
        const share = Math.min(1, Math.max(0, (value - min) / (max - min)));
        return START_ANGLE + share * (END_ANGLE - START_ANGLE);
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        // set default width and height
        props.style.width ??= 460;
        props.style.height ??= 280;

        const data = this.state.rxData;
        const min = num(data.min, 0);
        const max = num(data.max, 100);

        const raw = this.state.values[`${data.oid}.val`];
        const value = num(raw as number, min);

        // the geometry, all of it derived from the diameter the way the renderer did it
        const padding = num(data.padding, 0);
        const outerRadius = RADIUS - padding;
        const diameter = outerRadius * 2;
        const ringWidth = num(data.ringWidth, diameter / 35);
        const hubRadius = num(data.hubRadius, diameter / 18);
        const needleThickness = Math.max(2, num(data.needleThickness, diameter / 25));
        const needlePad = num(data.needlePad, 6);
        const tickPadding = num(data.tickPadding, diameter / 50);

        const showTickLabels = data.showTickLabels === undefined ? true : !!data.showTickLabels;
        const ringInner = outerRadius - ringWidth;
        // the labels sit between the ring and the coloured bands, so the bands start further in when shown
        const labelRoom = showTickLabels ? diameter / 12 : 0;
        const bandOuter = num(data.intervalOuterRadius, ringInner - tickPadding - labelRoom);
        const bandInner = num(data.intervalInnerRadius, bandOuter * 0.82);

        const ticks = numberList(data.ticks);
        const intervals = numberList(data.intervals);
        const intervalColors = data.intervalColors ? data.intervalColors.split(';') : [];

        const shadowOffset = num(data.shadowOffset, 0);
        const shadowAlpha = num(data.shadowAlpha, 0);
        const shadowDepth = num(data.shadowDepth, 0);
        const hasShadow = shadowAlpha > 0 && (shadowOffset > 0 || shadowDepth > 0);
        const shadowId = `gauge-shadow-${this.props.id}`;

        const needleAngle = this.angleOf(value, min, max);
        const needleTip = polar(needleAngle, bandInner - needlePad);
        // the needle is a triangle: a broad foot at the hub running out to a point
        const footA = polar(needleAngle + 90, needleThickness / 2);
        const footB = polar(needleAngle - 90, needleThickness / 2);

        return (
            <div
                className="vis-widget-body"
                style={{ width: '100%', height: '100%' }}
            >
                <svg
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${BOX_WIDTH} ${BOX_HEIGHT}`}
                    preserveAspectRatio="xMidYMid meet"
                    style={{ display: 'block' }}
                >
                    {hasShadow ? (
                        <defs>
                            <filter
                                id={shadowId}
                                x="-20%"
                                y="-20%"
                                width="140%"
                                height="140%"
                            >
                                <feDropShadow
                                    dx={shadowOffset}
                                    dy={shadowOffset}
                                    stdDeviation={shadowDepth / 2}
                                    floodOpacity={shadowAlpha}
                                />
                            </filter>
                        </defs>
                    ) : null}

                    <g filter={hasShadow ? `url(#${shadowId})` : undefined}>
                        {/* the face, and the ring around it */}
                        <path
                            d={ringSegment(START_ANGLE, END_ANGLE, 0, ringInner)}
                            fill={data.background || DEFAULT_BACKGROUND}
                        />
                        {ringWidth > 0 ? (
                            <path
                                d={ringSegment(START_ANGLE, END_ANGLE, ringInner, outerRadius)}
                                fill={data.ringColor || DEFAULT_RING_COLOR}
                            />
                        ) : null}

                        {/* the coloured bands: every interval reaches from the one before it to its own bound */}
                        {intervals.map((bound, index) => {
                            const from = index === 0 ? min : intervals[index - 1];
                            if (bound <= from) {
                                return null;
                            }
                            return (
                                <path
                                    key={index}
                                    d={ringSegment(
                                        this.angleOf(from, min, max),
                                        this.angleOf(bound, min, max),
                                        bandInner,
                                        bandOuter,
                                    )}
                                    fill={intervalColors[index] || DEFAULT_TICK_COLOR}
                                />
                            );
                        })}

                        {/* the ticks, and the numbers next to them */}
                        {ticks.map((tick, index) => {
                            const angle = this.angleOf(tick, min, max);
                            const outer = polar(angle, bandOuter + tickPadding);
                            const inner = polar(angle, bandOuter);
                            const label = polar(angle, bandOuter + tickPadding + diameter / 26);
                            return (
                                <g key={index}>
                                    <line
                                        x1={inner.x}
                                        y1={inner.y}
                                        x2={outer.x}
                                        y2={outer.y}
                                        stroke={data.tickColor || DEFAULT_TICK_COLOR}
                                        strokeWidth={Math.max(1, diameter / 200)}
                                    />
                                    {showTickLabels ? (
                                        <text
                                            x={label.x}
                                            y={label.y}
                                            fill={data.tickColor || DEFAULT_TICK_COLOR}
                                            fontSize={diameter / 22}
                                            fontFamily="Arial, Helvetica, sans-serif"
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                        >
                                            {tick}
                                        </text>
                                    ) : null}
                                </g>
                            );
                        })}

                        {/* the needle and the hub it turns on */}
                        <polygon
                            points={`${footA.x},${footA.y} ${needleTip.x},${needleTip.y} ${footB.x},${footB.y}`}
                            fill={data.ringColor || DEFAULT_RING_COLOR}
                        />
                        <circle
                            cx={CENTER_X}
                            cy={CENTER_Y}
                            r={hubRadius}
                            fill={data.ringColor || DEFAULT_RING_COLOR}
                        />
                    </g>

                    {data.title ? (
                        <text
                            x={CENTER_X}
                            y={diameter / 22}
                            fill={data.tickColor || DEFAULT_TICK_COLOR}
                            fontSize={diameter / 18}
                            fontFamily="Arial, Helvetica, sans-serif"
                            textAnchor="middle"
                        >
                            {data.title}
                        </text>
                    ) : null}

                    {data.label ? (
                        <text
                            x={CENTER_X}
                            y={CENTER_Y - hubRadius - diameter / 22}
                            fill={data.tickColor || DEFAULT_TICK_COLOR}
                            fontSize={diameter / 20}
                            fontFamily="Arial, Helvetica, sans-serif"
                            textAnchor="middle"
                        >
                            {data.label}
                        </text>
                    ) : null}
                </svg>
            </div>
        );
    }
}

export default JqPlotGauge;
