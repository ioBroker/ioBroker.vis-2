import React from 'react';

export interface ClockFaceProps {
    /** `analog` is a face with hands, `digital` is the time written out */
    mode: 'analog' | 'digital';
    /** The moment to show */
    now: Date;
    /** The seconds as well: the second hand, or the seconds in the digits */
    withSeconds?: boolean;
    /** The date under the time */
    dateText?: string;
    /** The language the time is written in */
    language: string;
    /** The colour of the hands and of the digits */
    ink: string;
    /** The colour of the marks and of the date */
    quiet: string;
    /** The colour of the second hand */
    accent: string;
}

/** The box the clock is drawn in; the SVG stretches it to whatever the card is */
const BOX = 120;
const CENTRE = BOX / 2;

/**
 * A clock, with hands or in digits.
 *
 * It is drawn in a `viewBox` and scales with its card, like every other drawing of these sets. That
 * is not a detail: the clock of the material set measured its own box, wrote the result into its
 * state and was measured again - and since the measurement decided the size, the two chased each
 * other until React gave up with "Maximum update depth exceeded". A drawing that is scaled by the
 * browser cannot do that.
 *
 * @param props - the moment, how to show it, and in which colours
 */
export default function ClockFace(props: ClockFaceProps): React.JSX.Element {
    const { now } = props;

    if (props.mode === 'digital') {
        const time = now.toLocaleTimeString(props.language, {
            hour: '2-digit',
            minute: '2-digit',
            ...(props.withSeconds ? { second: '2-digit' } : {}),
        });

        return (
            <svg
                viewBox={`0 0 ${BOX} ${props.dateText ? 66 : 50}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ width: '100%', height: '100%', display: 'block' }}
            >
                <text
                    x={CENTRE}
                    y={36}
                    textAnchor="middle"
                    fontFamily="system-ui, sans-serif"
                    fontSize={props.withSeconds ? 30 : 38}
                    fontWeight="700"
                    fill={props.ink}
                >
                    {time}
                </text>
                {props.dateText ? (
                    <text
                        x={CENTRE}
                        y={58}
                        textAnchor="middle"
                        fontFamily="system-ui, sans-serif"
                        fontSize="12"
                        fill={props.quiet}
                    >
                        {props.dateText}
                    </text>
                ) : null}
            </svg>
        );
    }

    const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
    const minutes = now.getMinutes() + seconds / 60;
    const hours = (now.getHours() % 12) + minutes / 60;

    /**
     * The far end of a hand.
     *
     * @param turns - how far round the face it stands, from 0 to 1
     * @param length - how long the hand is
     */
    const end = (turns: number, length: number): { x: number; y: number } => {
        const radians = (turns * 360 - 90) * (Math.PI / 180);
        return { x: CENTRE + Math.cos(radians) * length, y: CENTRE + Math.sin(radians) * length };
    };

    const hour = end(hours / 12, 28);
    const minute = end(minutes / 60, 40);
    const second = end(seconds / 60, 44);

    return (
        <svg
            viewBox={`0 0 ${BOX} ${BOX}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: '100%', height: '100%', display: 'block' }}
        >
            <circle
                cx={CENTRE}
                cy={CENTRE}
                r="56"
                fill="none"
                stroke={props.quiet}
                strokeWidth="2"
                opacity="0.5"
            />
            {/* the twelve hours, the quarters a little longer */}
            {Array.from({ length: 12 }, (_, index) => {
                const outer = end(index / 12, 52);
                const inner = end(index / 12, index % 3 === 0 ? 43 : 47);
                return (
                    <path
                        key={index}
                        d={`M${inner.x.toFixed(1)} ${inner.y.toFixed(1)} L${outer.x.toFixed(1)} ${outer.y.toFixed(1)}`}
                        stroke={props.quiet}
                        strokeWidth={index % 3 === 0 ? 3 : 1.5}
                        strokeLinecap="round"
                    />
                );
            })}

            <path
                d={`M${CENTRE} ${CENTRE} L${hour.x.toFixed(1)} ${hour.y.toFixed(1)}`}
                stroke={props.ink}
                strokeWidth="5"
                strokeLinecap="round"
            />
            <path
                d={`M${CENTRE} ${CENTRE} L${minute.x.toFixed(1)} ${minute.y.toFixed(1)}`}
                stroke={props.ink}
                strokeWidth="3.5"
                strokeLinecap="round"
            />
            {props.withSeconds ? (
                <path
                    d={`M${CENTRE} ${CENTRE} L${second.x.toFixed(1)} ${second.y.toFixed(1)}`}
                    stroke={props.accent}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
            ) : null}
            <circle
                cx={CENTRE}
                cy={CENTRE}
                r="3"
                fill={props.accent}
            />
        </svg>
    );
}
