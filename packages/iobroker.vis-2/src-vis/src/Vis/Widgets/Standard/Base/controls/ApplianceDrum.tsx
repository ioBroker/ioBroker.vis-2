import React from 'react';

export interface ApplianceDrumProps {
    /** A programme is running, so the drum turns where nothing says how far it has got */
    running: boolean;
    /** How far the programme has got, 0..1, or null where that cannot be worked out */
    share: number | null;
    /** What stands in the middle: how much longer it has, or what the machine calls its state */
    text: string;
    /** The unit behind it, where the middle holds a time */
    unit?: string;
    /** The line under it: the programme, or the time of day it will be done at */
    note?: string;
    /** The colour of the ring and of the glass */
    accent: string;
    /** The ring it runs around */
    track: string;
    /** The colour of the time */
    ink: string;
    /** The colour of the line under it */
    quiet: string;
}

/** The ring the programme runs around */
const RADIUS = 46;
const CIRCLE = 2 * Math.PI * RADIUS;

/**
 * The drum of a machine: a ring that fills as the programme runs, with what is left of it in the middle.
 *
 * A machine that says when it started and when it will be done gets the ring; one that only says how much is
 * left gets a mark that goes round instead, because a share of nothing cannot be drawn. It is one `viewBox`,
 * so it is the size of whatever it is put in and nothing here measures anything.
 *
 * @param props - how far it has got, what stands in the middle, and in which colours
 */
export default function ApplianceDrum(props: ApplianceDrumProps): React.JSX.Element {
    return (
        <svg
            viewBox="0 0 120 120"
            preserveAspectRatio="xMidYMid meet"
            style={{ width: '100%', height: '100%', display: 'block' }}
        >
            <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                stroke={props.track}
                strokeWidth="9"
                opacity="0.5"
            />
            {/* the glass, which is what the machine looks like when it is doing nothing */}
            <circle
                cx="60"
                cy="60"
                r={RADIUS - 9}
                fill={props.accent}
                opacity={props.running ? 0.14 : 0.07}
            />

            {props.share !== null ? (
                <circle
                    cx="60"
                    cy="60"
                    r={RADIUS}
                    fill="none"
                    stroke={props.accent}
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={`${(props.share * CIRCLE).toFixed(1)} ${CIRCLE.toFixed(1)}`}
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dasharray 0.6s' }}
                />
            ) : props.running ? (
                // nothing says how far it has got, so the drum simply turns
                <g style={{ animation: 'vis-standard-spin 2.6s linear infinite', transformOrigin: '60px 60px' }}>
                    <circle
                        cx="60"
                        cy="60"
                        r={RADIUS}
                        fill="none"
                        stroke={props.accent}
                        strokeWidth="9"
                        strokeLinecap="round"
                        strokeDasharray={`${(CIRCLE * 0.18).toFixed(1)} ${CIRCLE.toFixed(1)}`}
                    />
                </g>
            ) : null}

            <text
                x="60"
                y={props.note ? 58 : 66}
                textAnchor="middle"
                fontFamily="system-ui, sans-serif"
                fontSize={props.unit ? 26 : 15}
                fontWeight="700"
                fill={props.ink}
            >
                {props.text}
                {props.unit ? (
                    <tspan
                        fontSize="12"
                        fontWeight="400"
                        fill={props.quiet}
                    >
                        {` ${props.unit}`}
                    </tspan>
                ) : null}
            </text>
            {props.note ? (
                <text
                    x="60"
                    y="76"
                    textAnchor="middle"
                    fontFamily="system-ui, sans-serif"
                    fontSize="11"
                    fill={props.quiet}
                >
                    {props.note}
                </text>
            ) : null}
        </svg>
    );
}
