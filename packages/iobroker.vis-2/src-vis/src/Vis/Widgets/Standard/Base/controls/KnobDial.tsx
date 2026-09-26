import React from 'react';

import { BOX, RADIUS, SWEEP, angleOf, arcPath, point, valueAt } from './dialGeometry';

export interface KnobDialProps {
    /** Where it stands, or null while nobody has said */
    value: number | null;
    min: number;
    max: number;
    step?: number;
    /** What the number is measured in, like `%` */
    unit?: string;
    /** The colour of the part of the scale that is filled */
    accent: string;
    /** The colour it runs into towards the top end; without it the scale is of one colour */
    accentTo?: string;
    /** The rail behind it */
    track: string;
    /** The colour of the number */
    ink: string;
    /** The colour of the unit and of a word under it */
    quiet: string;
    /** A word under the number, like the name of the mode a fan is in */
    caption?: string;
    /** How many marks the scale carries, the two ends included; none without it */
    ticks?: number;
    /** How many places after the point the number has */
    digits?: number;
    /** The system writes a number with a comma, not a point */
    isFloatComma: boolean;
    /** Called while the knob is dragged, and once more when it is let go; without it nothing can be dragged */
    onChange?: (value: number, done: boolean) => void;
}

/**
 * A knob: a scale, how far along it the value is, and the number in the middle.
 *
 * The same arc as the thermostat - see `dialGeometry.ts` - but for one value rather than two, and with the
 * part up to the knob filled in, because a volume or a fan speed is a quantity and a quantity wants to be
 * seen at a glance rather than read.
 *
 * Like every drawing in these sets it is one SVG with a `viewBox`, so it fits whatever box it is given.
 *
 * @param props - where it stands, what it reaches, and in which colours
 */
export default function KnobDial(props: KnobDialProps): React.JSX.Element {
    const svgRef = React.useRef<SVGSVGElement>(null);
    const dragging = React.useRef(false);
    const { min, max, onChange } = props;

    const value = props.value ?? min;
    const angle = angleOf(value, min, max);
    const knob = point(angle);

    /**
     * Which value the pointer is over.
     *
     * @param event - where the pointer is
     * @param done - the finger was let go
     */
    const follow = (event: React.PointerEvent<SVGSVGElement>, done: boolean): void => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect || !onChange) {
            return;
        }
        const step = props.step || (max - min > 20 ? 1 : 0.1);
        const wanted = valueAt(event, rect, min, max);
        onChange(Math.round(wanted / step) * step, done);
    };

    const digits = props.digits ?? (max - min > 20 ? 0 : 1);
    const written = props.value === null ? '--' : props.value.toFixed(digits);
    const shown = props.isFloatComma ? written.replace('.', ',') : written;

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${BOX.width} ${BOX.height}`}
            preserveAspectRatio="xMidYMid meet"
            style={{
                width: '100%',
                height: '100%',
                display: 'block',
                touchAction: 'none',
                userSelect: 'none',
                cursor: onChange ? 'pointer' : undefined,
            }}
            onPointerDown={event => {
                if (!onChange) {
                    return;
                }
                dragging.current = true;
                event.currentTarget.setPointerCapture(event.pointerId);
                follow(event, false);
            }}
            onPointerMove={event => {
                if (dragging.current) {
                    follow(event, false);
                }
            }}
            onPointerUp={event => {
                if (dragging.current) {
                    dragging.current = false;
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                        event.currentTarget.releasePointerCapture(event.pointerId);
                    }
                    follow(event, true);
                }
            }}
        >
            {/* the marks of the scale, outside the rail: they say how far a quarter of the way is */}
            {props.ticks && props.ticks > 1
                ? Array.from({ length: props.ticks }, (_, index) => {
                      const at = -SWEEP + (index / (props.ticks! - 1)) * SWEEP * 2;
                      const outer = point(at, RADIUS + 15);
                      const inner = point(at, RADIUS + 9);
                      return (
                          <path
                              key={index}
                              d={`M${inner.x.toFixed(1)} ${inner.y.toFixed(1)} L${outer.x.toFixed(1)} ${outer.y.toFixed(1)}`}
                              stroke={props.quiet}
                              strokeWidth={index === 0 || index === props.ticks! - 1 ? 2.5 : 1.5}
                              strokeLinecap="round"
                              opacity="0.7"
                          />
                      );
                  })
                : null}

            <path
                d={arcPath(-SWEEP, SWEEP)}
                fill="none"
                stroke={props.track}
                strokeWidth="12"
                strokeLinecap="round"
                opacity="0.45"
            />
            {/* a knob that stands for a temperature runs from cold to warm, like the thermostat does */}
            {props.accentTo ? (
                <defs>
                    <linearGradient
                        id="vis-knob-scale"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                    >
                        <stop
                            offset="0%"
                            stopColor={props.accent}
                        />
                        <stop
                            offset="100%"
                            stopColor={props.accentTo}
                        />
                    </linearGradient>
                </defs>
            ) : null}
            {/* the part up to the knob, which is what says how far along it is */}
            {angle > -SWEEP + 0.5 ? (
                <path
                    d={arcPath(-SWEEP, angle)}
                    fill="none"
                    stroke={props.accentTo ? 'url(#vis-knob-scale)' : props.accent}
                    strokeWidth="12"
                    strokeLinecap="round"
                />
            ) : null}

            <circle
                cx={knob.x}
                cy={knob.y}
                r="10"
                fill="#fff"
                stroke="rgba(0, 0, 0, 0.25)"
                strokeWidth="1"
            />

            <text
                x={BOX.width / 2}
                y={props.caption ? 100 : 106}
                textAnchor="middle"
                fontFamily="system-ui, sans-serif"
                fontSize="42"
                fontWeight="700"
                fill={props.ink}
            >
                {shown}
                {props.unit ? (
                    <tspan
                        fontSize="18"
                        fontWeight="400"
                        fill={props.quiet}
                    >
                        {props.unit}
                    </tspan>
                ) : null}
            </text>
            {props.caption ? (
                <text
                    x={BOX.width / 2}
                    y={122}
                    textAnchor="middle"
                    fontFamily="system-ui, sans-serif"
                    fontSize="15"
                    fill={props.quiet}
                >
                    {props.caption}
                </text>
            ) : null}
        </svg>
    );
}
