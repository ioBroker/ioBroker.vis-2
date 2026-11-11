import React from 'react';

export interface ClockFaceProps {
    /** `analog` is a face with hands, `digital` is the time written out */
    mode: 'analog' | 'digital';
    /** What was set in the CSS attributes of the widget for how the reading is written */
    textStyle?: React.CSSProperties;
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
 * About how wide a text is, in units of its font size.
 *
 * Only an estimate - the real width depends on the font - but one that knows the characters apart that matter:
 * a Chinese character is as wide as it is high, a capital or a digit wider than a small letter, a space or a
 * comma much narrower.
 *
 * @param text - the text as it is written
 */
export function estimateTextWidth(text: string): number {
    let width = 0;
    for (const char of text) {
        if (/[⺀-鿿가-힯＀-￯]/.test(char)) {
            width += 1;
        } else if (/[\s.,:;'’]/.test(char)) {
            width += 0.3;
        } else if (/[A-Z0-9mw]/.test(char)) {
            width += 0.66;
        } else {
            width += 0.52;
        }
    }
    return width;
}

/**
 * The size a line is written in so that it fits its width, and whether it has to be squeezed into it as well.
 *
 * The size comes from the estimate; since that is one, a line that had to be made smaller is also given its
 * width as `textLength`, so that it ends at the edge even where the font is wider than estimated. An SVG does
 * not wrap: a line that is too long is drawn past the edge, and the card cuts it off - `Mittwoch, 11. November`
 * lost its `M` and its `r` that way.
 *
 * @param text - the line
 * @param widest - the width it has, in units of the drawing
 * @param preferred - the size it is written in where it fits
 */
export function fitText(text: string, widest: number, preferred: number): { size: number; squeeze: boolean } {
    const width = estimateTextWidth(text) * preferred;
    if (width <= widest) {
        return { size: preferred, squeeze: false };
    }
    return { size: (preferred * widest) / width, squeeze: true };
}

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

        /*
         * The digits are written as large as they fit, not as large as they would like to be.
         *
         * How long the time is depends on the language and on the settings: `18:22` is five characters,
         * `6:27:44 PM` is ten. A size chosen for the short one runs out of the box with the long one, and an
         * SVG does not wrap - it simply draws past its edge, which the card then cuts off.
         */
        const widest = BOX * 0.92;
        const perCharacter = 0.56;
        const size = Math.min(props.withSeconds ? 30 : 38, widest / (time.length * perCharacter));
        // the date is as long as the language makes it: `Mittwoch, 11. November` does not fit in size 12
        const date = props.dateText ? fitText(props.dateText, widest, 12) : null;

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
                    fontSize={size}
                    fontWeight="700"
                    fill={props.ink}
                    style={props.textStyle}
                >
                    {time}
                </text>
                {props.dateText && date ? (
                    <text
                        x={CENTRE}
                        y={58}
                        textAnchor="middle"
                        fontFamily="system-ui, sans-serif"
                        fontSize={date.size}
                        fill={props.quiet}
                        {...(date.squeeze ? { textLength: widest, lengthAdjust: 'spacingAndGlyphs' } : undefined)}
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
