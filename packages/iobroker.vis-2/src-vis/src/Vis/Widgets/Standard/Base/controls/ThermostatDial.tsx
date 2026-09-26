import React from 'react';

import { BOX, CENTRE, SWEEP, angleOf, arcPath, point, valueAt } from './dialGeometry';

export interface ThermostatDialProps {
    /** What the room is, or null while nobody has said */
    actual: number | null;
    /** What it should be */
    target: number;
    min: number;
    max: number;
    step?: number;
    /** What the numbers are measured in, like `°C` */
    unit: string;
    /** The word in front of the set value, like `Set` */
    setWord: string;
    /** The colour of the cold end of the scale */
    cold: string;
    /** The colour of the warm end */
    warm: string;
    /** The rail behind the scale */
    track: string;
    /** The colour of the big number */
    ink: string;
    /** The colour of the quiet line under it */
    quiet: string;
    /** The system writes a number with a comma, not a point */
    isFloatComma: boolean;
    /** Called while the knob is dragged, and once more when it is let go; without it nothing can be dragged */
    onChange?: (value: number, done: boolean) => void;
}

/** The number as it is written out */
function format(value: number, isComma: boolean, digits = 1): string {
    const text = value.toFixed(digits);
    return isComma ? text.replace('.', ',') : text;
}

/**
 * The dial of a thermostat: the scale as an arc, the room in the middle, what it should be underneath.
 *
 * Everything is one SVG with a `viewBox`, which is what makes it responsive without a line of JavaScript: the
 * browser scales the whole drawing - the arc, the knob and the numbers with it - to whatever box the card
 * hands over. Measuring the box and working out font sizes from it is the other way, and it is the way that
 * made the clock of the material set chase its own tail until React gave up.
 *
 * The knob is dragged along the arc; what it is dragged over is shown at once and written when it is let go,
 * because a thermostat that is told every degree the finger passes over spends the next minute catching up.
 *
 * @param props - the two temperatures, what the scale reaches, and in which colours
 */
export default function ThermostatDial(props: ThermostatDialProps): React.JSX.Element {
    const svgRef = React.useRef<SVGSVGElement>(null);
    const dragging = React.useRef(false);
    const { min, max, onChange } = props;

    const arc = arcPath(-SWEEP, SWEEP);
    const knob = point(angleOf(props.target, min, max));

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
        const wanted = valueAt(event, rect, min, max);
        const step = props.step || 0.5;

        onChange(Math.round(wanted / step) * step, done);
    };

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
            <defs>
                <linearGradient
                    id="vis-thermostat-scale"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                >
                    <stop
                        offset="0%"
                        stopColor={props.cold}
                    />
                    <stop
                        offset="50%"
                        stopColor={props.cold}
                        stopOpacity="0.55"
                    />
                    <stop
                        offset="100%"
                        stopColor={props.warm}
                    />
                </linearGradient>
            </defs>

            <path
                d={arc}
                fill="none"
                stroke={props.track}
                strokeWidth="12"
                strokeLinecap="round"
                opacity="0.35"
            />
            <path
                d={arc}
                fill="none"
                stroke="url(#vis-thermostat-scale)"
                strokeWidth="10"
                strokeLinecap="round"
            />

            <circle
                cx={knob.x}
                cy={knob.y}
                r="10"
                fill="#fff"
                stroke="rgba(0, 0, 0, 0.25)"
                strokeWidth="1"
            />

            <text
                x={CENTRE.x}
                y={CENTRE.y + 12}
                textAnchor="middle"
                fontFamily="system-ui, sans-serif"
                fontSize="40"
                fontWeight="700"
                fill={props.ink}
            >
                {props.actual === null ? '--' : format(props.actual, props.isFloatComma)}
                <tspan
                    fontSize="17"
                    fontWeight="400"
                    fill={props.quiet}
                >
                    {props.unit}
                </tspan>
            </text>
            <text
                x={CENTRE.x}
                y={CENTRE.y + 34}
                textAnchor="middle"
                fontFamily="system-ui, sans-serif"
                fontSize="15"
                fill={props.quiet}
            >
                {`${props.setWord} ${format(props.target, props.isFloatComma)}${props.unit}`}
            </text>
        </svg>
    );
}
