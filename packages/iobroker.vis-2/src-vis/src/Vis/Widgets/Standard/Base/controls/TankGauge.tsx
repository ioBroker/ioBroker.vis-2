import React from 'react';

export interface TankGaugeProps {
    /** How full it is, or null while nobody has said */
    value: number | null;
    /** What an empty tank reads */
    min: number;
    /** What a full one reads */
    max: number;
    unit?: string;
    /** Places after the point */
    digits?: number;
    /** The colour of what is in the tank */
    accent: string;
    /** The empty part and the ticks */
    track: string;
    /** The colour of the number */
    ink: string;
    /** The colour of the scale */
    quiet: string;
    /** The system writes a number with a comma, not a point */
    isFloatComma: boolean;
    /** Where the number stands, which decides how much room the bar gets */
    valuePosition?: 'right' | 'top' | 'bottom' | 'inside' | 'none';
}

/** How many marks the scale has, the two ends included */
const TICKS = 5;

/**
 * How much room the labels of the scale need beside the bar.
 *
 * Four digits at the size the labels are drawn, and never more than a third of a narrow card.
 */
const SCALE_WIDTH = 'min(44px, 30%)';

/** Room above and below for the first and the last label, which stand on the ends of the bar */
const EDGE = 8;

/**
 * A tank: how full it is, as a bar with a scale beside it.
 *
 * A cistern, a pellet store, an oil tank, a battery - a number between two ends that everyone reads as a
 * height rather than as a digit. The scale is what makes it readable: a bar on its own says "fairly full",
 * a bar with five marks says which fairly full.
 *
 * It is drawn in boxes rather than in an SVG, because a drawing with a `viewBox` keeps its proportions and
 * a tank should not: given a tall card it should be a tall tank, and given a wide one a wide tank. An SVG
 * left the height of the card unused. Nothing here measures itself either - how big the type is and how
 * round the corners are is asked of the box it was given, with container queries.
 *
 * @param props - how full it is, what the ends read, and in which colours
 */
export default function TankGauge(props: TankGaugeProps): React.JSX.Element {
    const position = props.valuePosition || 'right';
    const span = props.max - props.min || 1;
    const share = props.value === null ? 0 : Math.max(0, Math.min(1, (props.value - props.min) / span));

    const digits = props.digits ?? (span > 20 ? 0 : 1);
    const written = props.value === null ? '--' : props.value.toFixed(digits);
    const shown = props.isFloatComma ? written.replace('.', ',') : written;

    /** The marks of the scale, from the top down */
    const ticks = Array.from({ length: TICKS }, (_, index) => {
        const step = index / (TICKS - 1);
        const at = props.max - span * step;
        const text = at.toFixed(span > 20 ? 0 : 1);

        return { step, label: props.isFloatComma ? text.replace('.', ',') : text };
    });

    /** The reading, at the size the place it stands can carry */
    const number = (size: string, unitSize: string, shadow: boolean): React.JSX.Element => (
        <span
            style={{
                fontFamily: 'system-ui, sans-serif',
                fontSize: size,
                fontWeight: 700,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                color: props.ink,
                // a number standing on the bar has the filled part behind it, so it carries a shadow
                textShadow: shadow ? '0 1px 3px rgba(0, 0, 0, 0.45)' : undefined,
            }}
        >
            {shown}
            {props.unit ? (
                <span
                    style={{
                        fontSize: unitSize,
                        fontWeight: 400,
                        color: shadow ? props.ink : props.quiet,
                    }}
                >
                    {` ${props.unit}`}
                </span>
            ) : null}
        </span>
    );

    return (
        <div
            style={{
                containerType: 'size',
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                padding: `${EDGE}px 0`,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
            }}
        >
            {position === 'top' ? (
                <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                    {number('clamp(12px, 10cqh, 22px)', 'clamp(9px, 6cqh, 14px)', false)}
                </div>
            ) : null}

            <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'stretch', gap: 4 }}>
                {/* the scale: every mark stands at its own share of the height, so it follows the bar */}
                <div style={{ position: 'relative', width: SCALE_WIDTH, flexShrink: 0 }}>
                    {ticks.map(tick => (
                        <div
                            key={tick.step}
                            style={{
                                position: 'absolute',
                                top: `${tick.step * 100}%`,
                                right: 0,
                                transform: 'translateY(-50%)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <span
                                style={{
                                    fontFamily: 'system-ui, sans-serif',
                                    fontSize: 'clamp(8px, 5cqh, 13px)',
                                    lineHeight: 1,
                                    color: props.quiet,
                                }}
                            >
                                {tick.label}
                            </span>
                            <span
                                style={{
                                    width: 9,
                                    height: 1.5,
                                    background: props.quiet,
                                    opacity: 0.7,
                                    flexShrink: 0,
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* the tank itself, which is its own container so its corners can follow its width */}
                <div style={{ flex: 1, minWidth: 0, position: 'relative', containerType: 'size' }}>
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: 'min(33cqw, 40px)',
                            border: `1px solid ${props.track}`,
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{ position: 'absolute', inset: 0, background: props.track, opacity: 0.35 }} />
                        <div
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                bottom: 0,
                                height: `${share * 100}%`,
                                background: props.accent,
                                transition: 'height 0.3s',
                            }}
                        />
                    </div>
                    {position === 'inside' ? (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {number('clamp(14px, 16cqh, 34px)', 'clamp(10px, 9cqh, 18px)', true)}
                        </div>
                    ) : null}
                </div>

                {position === 'right' ? (
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-start' }}>
                        {number('clamp(12px, 9cqh, 20px)', 'clamp(9px, 6cqh, 13px)', false)}
                    </div>
                ) : null}
            </div>

            {position === 'bottom' ? (
                <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                    {number('clamp(12px, 10cqh, 22px)', 'clamp(9px, 6cqh, 14px)', false)}
                </div>
            ) : null}
        </div>
    );
}
