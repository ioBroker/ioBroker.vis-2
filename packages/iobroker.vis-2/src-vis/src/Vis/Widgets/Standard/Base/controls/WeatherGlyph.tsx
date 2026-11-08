import React from 'react';

import type { WeatherSymbol } from '../weatherStates';

export interface WeatherGlyphProps {
    symbol: WeatherSymbol;
    /** It is dark outside, so a moon stands where the sun would */
    night?: boolean;
    /** The colour of the sun; without it the yellow one expects a sun to have */
    sun?: string;
    /** The theme is dark, so the clouds are light; on a light card they have to be darker to be seen */
    dark: boolean;
    /** The rays turn and the rain falls; for the one picture that is looked at, not for a row of them */
    animated?: boolean;
    style?: React.CSSProperties;
}

const DEFAULT_SUN = '#FFC107';

/** SVG animations are not stopped by a style sheet, so they are left out for whoever asked for less motion */
function allowsMotion(): boolean {
    return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * What lets a drop or a flake fall and fade out.
 *
 * @param index - which one it is, so that they do not all fall at once
 */
function falling(index: number): React.JSX.Element {
    const begin = `${index * 0.35}s`;

    return (
        <>
            <animate
                attributeName="opacity"
                values="0;1;0"
                dur="1.2s"
                begin={begin}
                repeatCount="indefinite"
            />
            <animateTransform
                attributeName="transform"
                type="translate"
                from="1 -3"
                to="-1 4"
                dur="1.2s"
                begin={begin}
                repeatCount="indefinite"
            />
        </>
    );
}

/** Eight rays around a sun in the middle of the picture */
const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

/** A cloud, drawn into a box of 64 by 64 */
const CLOUD = 'M18 50a12 12 0 0 1-1.6-23.9A16 16 0 0 1 47 22.6 13.8 13.8 0 0 1 47 50z';

/**
 * The sun, with rays and a glow of its own, or the moon at night.
 *
 * @param props - where it stands and how large
 * @param props.cx - its middle
 * @param props.cy - its middle
 * @param props.r - the radius of the disc
 * @param props.color - what the sun is drawn in
 * @param props.night - draw the moon instead
 * @param props.animated - let the rays turn
 */
function Sky(props: {
    cx: number;
    cy: number;
    r: number;
    color: string;
    night?: boolean;
    animated?: boolean;
}): React.JSX.Element {
    const { cx, cy, r, color } = props;

    if (props.night) {
        return (
            <path
                d={`M${cx + r * 0.35} ${cy - r}a${r} ${r} 0 1 0 ${r * 0.65} ${r * 1.45}a${r * 0.85} ${r * 0.85} 0 0 1 -${r * 0.65} -${r * 1.45}z`}
                fill="#CFD8E3"
            />
        );
    }

    return (
        <g style={{ filter: `drop-shadow(0 0 ${r * 0.35}px ${color})` }}>
            <g>
                {RAYS.map(angle => (
                    <line
                        key={angle}
                        x1={cx}
                        y1={cy - r * 1.35}
                        x2={cx}
                        y2={cy - r * 1.8}
                        stroke={color}
                        strokeWidth={Math.max(1.6, r * 0.2)}
                        strokeLinecap="round"
                        transform={`rotate(${angle} ${cx} ${cy})`}
                    />
                ))}
                {props.animated ? (
                    <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from={`0 ${cx} ${cy}`}
                        to={`360 ${cx} ${cy}`}
                        dur="40s"
                        repeatCount="indefinite"
                    />
                ) : null}
            </g>
            <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={color}
            />
        </g>
    );
}

/**
 * The state of the sky as a drawing.
 *
 * It takes the place of the small pictures of a weather service wherever the widget knows what they mean, so that
 * the same drawing works in a tile of a day and as the big picture behind the card, and the sun is yellow and
 * shines instead of being a flat disc.
 *
 * @param props - what to draw, and in which colours
 */
export default function WeatherGlyph(props: WeatherGlyphProps): React.JSX.Element {
    const sun = props.sun || DEFAULT_SUN;
    const cloud = props.dark ? '#E4EAF1' : '#8E9BAA';
    const cloudBack = props.dark ? '#9AA7B6' : '#B9C3CE';
    const rain = '#4FA3E3';
    const { symbol, night } = props;
    const animated = !!props.animated && allowsMotion();

    const front = (
        <path
            d={CLOUD}
            fill={cloud}
        />
    );
    // what stands behind a cloud that carries rain, snow or lightning: the same cloud, higher up
    const raised = (
        <path
            d={CLOUD}
            fill={cloud}
            transform="translate(0 -8)"
        />
    );

    return (
        <svg
            viewBox="0 0 64 64"
            preserveAspectRatio="xMidYMid meet"
            style={{ display: 'block', overflow: 'visible', ...props.style }}
            aria-hidden="true"
        >
            {symbol === 'clear' ? (
                <Sky
                    cx={32}
                    cy={32}
                    r={13}
                    color={sun}
                    night={night}
                    animated={animated}
                />
            ) : null}
            {symbol === 'few' || symbol === 'rain' ? (
                <Sky
                    cx={44}
                    cy={20}
                    r={9}
                    color={sun}
                    night={night}
                    animated={animated}
                />
            ) : null}
            {symbol === 'few' ? front : null}
            {symbol === 'scattered' ? front : null}
            {symbol === 'broken' ? (
                <>
                    <path
                        d={CLOUD}
                        fill={cloudBack}
                        transform="translate(9 -10) scale(0.82)"
                    />
                    {front}
                </>
            ) : null}
            {symbol === 'showers' || symbol === 'rain' || symbol === 'storm' || symbol === 'snow' ? raised : null}
            {symbol === 'showers' || symbol === 'rain'
                ? [22, 32, 42].map((x, index) => (
                      <line
                          key={x}
                          x1={x}
                          y1={47}
                          x2={x - 3}
                          y2={57}
                          stroke={rain}
                          strokeWidth="3"
                          strokeLinecap="round"
                      >
                          {animated ? falling(index) : null}
                      </line>
                  ))
                : null}
            {symbol === 'storm' ? (
                <path
                    d="M35 40l-9 12h7l-3 10 11-14h-7l4-8z"
                    fill={sun}
                >
                    {animated ? (
                        <animate
                            attributeName="opacity"
                            values="1;1;0.25;1;0.4;1;1"
                            dur="3s"
                            repeatCount="indefinite"
                        />
                    ) : null}
                </path>
            ) : null}
            {symbol === 'snow'
                ? [
                      [22, 49],
                      [32, 54],
                      [42, 49],
                      [27, 59],
                      [37, 59],
                  ].map(([x, y], index) => (
                      <circle
                          key={`${x}-${y}`}
                          cx={x}
                          cy={y}
                          r="2.4"
                          fill={props.dark ? '#fff' : rain}
                      >
                          {animated ? falling(index) : null}
                      </circle>
                  ))
                : null}
            {symbol === 'mist'
                ? [20, 30, 40, 50].map((y, index) => (
                      <line
                          key={y}
                          x1={index % 2 ? 14 : 8}
                          y1={y}
                          x2={index % 2 ? 56 : 50}
                          y2={y}
                          stroke={cloud}
                          strokeWidth="4"
                          strokeLinecap="round"
                      />
                  ))
                : null}
        </svg>
    );
}
