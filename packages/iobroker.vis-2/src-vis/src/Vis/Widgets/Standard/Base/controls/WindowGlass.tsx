import React from 'react';

/** What a window can be */
export type WindowState = 'closed' | 'tilted' | 'open';

export interface WindowGlassProps {
    state: WindowState;
    /** The colour of a window that is not closed */
    accent: string;
    /** The colour of the frame */
    outline: string;
    /** What lies behind the glass */
    background: string;
}

/**
 * A window, drawn as one: the frame, and the sash that stands open, tilts or sits flush.
 *
 * A word would do the job - `open` - and a word is what the sensor widget shows. This is for the card that
 * hangs on a wall and is read from across the room: the shape of a window standing open is recognised before
 * it is read, which is the whole point of putting it on a wall.
 *
 * It is drawn in a `viewBox` and scales with its box like everything else in these sets.
 *
 * @param props - what the window is doing and in which colours
 */
export default function WindowGlass(props: WindowGlassProps): React.JSX.Element {
    const open = props.state !== 'closed';
    const colour = open ? props.accent : props.outline;

    /*
     * The sash, in the three positions:
     *
     *   closed   flush in the frame
     *   tilted   turned on its bottom edge, so the top has come towards the viewer: lower and wider
     *   open     swung towards the viewer, so it is a parallelogram leaning out of the frame
     */
    const sash =
        props.state === 'open'
            ? 'M52 14 L92 6 L92 78 L52 70 Z'
            : props.state === 'tilted'
              ? 'M4 32 L96 32 L88 76 L12 76 Z'
              : 'M10 12 L90 12 L90 76 L10 76 Z';

    return (
        <svg
            viewBox="0 0 100 88"
            preserveAspectRatio="xMidYMid meet"
            style={{ width: '100%', height: '100%', display: 'block' }}
        >
            {/* the opening in the wall, which stays where it is whatever the sash does */}
            <rect
                x="6"
                y="8"
                width="88"
                height="72"
                rx="3"
                fill={props.background}
                stroke={props.outline}
                strokeWidth="2.5"
            />
            {/* the sill */}
            <path
                d="M2 80 H98"
                stroke={props.outline}
                strokeWidth="3"
                strokeLinecap="round"
            />

            <path
                d={sash}
                fill={colour}
                fillOpacity={open ? 0.18 : 0.1}
                stroke={colour}
                strokeWidth="2.5"
                strokeLinejoin="round"
                style={{ transition: 'all 0.3s' }}
            />
            {/* the handle, on the side the sash swings from */}
            <circle
                cx={props.state === 'open' ? 56 : 84}
                cy={props.state === 'tilted' ? 56 : 44}
                r="3"
                fill={colour}
            />
        </svg>
    );
}
