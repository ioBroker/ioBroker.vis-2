import React from 'react';

/** What a window can be */
export type WindowState = 'closed' | 'tilted' | 'open';

/** Which of the two things is drawn */
export type WindowKind = 'window' | 'door';

/** The side the handle is on; the leaf is hinged on the other one */
export type WindowHandle = 'left' | 'right';

export interface WindowGlassProps {
    state: WindowState;
    /** A window sits in a wall and has a sill; a door is slimmer and reaches the floor */
    kind?: WindowKind;
    /** The side the handle is on; the leaf is hinged on the other one */
    handle?: WindowHandle;
    /** The colour of a window that is not closed */
    accent: string;
    /** The colour of the frame */
    outline: string;
    /** What lies behind the glass */
    background: string;
}

/** The box everything is drawn in */
export const BOX = { width: 100, height: 88 };

/** How far the near edge of an open leaf leans out of the frame at the top, and at the bottom */
const LEAN_TOP = 6;
const LEAN_BOTTOM = 6;

/** A door stands on the floor and the floor is the edge of the picture, so its leaf leans down less */
const LEAN_BOTTOM_DOOR = 4;

/**
 * How much of its width a leaf that stands open still covers.
 *
 * It says how far the leaf has been pushed open: the free edge turns out of the frame towards the viewer and
 * therefore moves towards the hinge, and the further it goes the less of the width is left. A window ajar is
 * what this draws - the free edge moves a fifth of the way. Swinging it right open moves the edge halfway
 * across the frame, which is a door standing in a doorway rather than a window somebody has opened.
 */
const OPEN_SHARE = 0.78;

/** Where the top edge of a tilted leaf stands, as a share of the height */
const TILT_SHARE = 0.31;

/** One corner of the leaf */
export interface LeafCorner {
    x: number;
    y: number;
}

/**
 * The opening in the wall, and the leaf that sits in it.
 *
 * @param kind - a window or a door
 */
export function leafBox(kind: WindowKind = 'window'): {
    frame: { x: number; y: number; width: number; height: number };
    leaf: { left: number; right: number; top: number; bottom: number };
} {
    const frame = kind === 'door' ? { x: 27, y: 4, width: 46, height: 77 } : { x: 6, y: 8, width: 88, height: 72 };

    return {
        frame,
        leaf: {
            left: frame.x + 4,
            right: frame.x + frame.width - 4,
            top: frame.y + 4,
            // a door reaches the floor, a window sits in its frame
            bottom: frame.y + frame.height - (kind === 'door' ? 0 : 4),
        },
    };
}

/**
 * The four corners of the leaf, always in the same order: hinge top, free top, free bottom, hinge bottom.
 *
 * The order is the whole point of this function. A browser moves from one shape to the next corner by corner,
 * so a corner has to mean the same thing in every state. When it did not - the first corner of the closed leaf
 * was its top left one, the first corner of the open leaf its hinge - the leaf did not swing open at all: its
 * left edge slid right across the whole frame to where the hinge is, and stood there for a third of a second.
 *
 * With the order kept, the hinge corners do not move between closed and open, and only the free edge travels,
 * which is exactly what a window does.
 *
 * @param state - what the window is doing
 * @param kind - a window or a door
 * @param handle - the side the handle is on; the leaf is hinged on the other one
 */
export function leafCorners(
    state: WindowState,
    kind: WindowKind = 'window',
    handle: WindowHandle = 'right',
): [LeafCorner, LeafCorner, LeafCorner, LeafCorner] {
    const { leaf } = leafBox(kind);
    const handleRight = handle !== 'left';
    // the hinge is the side without the handle, and `out` says which way is away from it
    const hinge = handleRight ? leaf.left : leaf.right;
    const free = handleRight ? leaf.right : leaf.left;
    const out = handleRight ? 1 : -1;
    const width = leaf.right - leaf.left;

    // a door does not tilt: one whose state says so is drawn open, because a leaf hanging in the air at an
    // angle is not a thing anybody would recognise
    if (state === 'open' || (kind === 'door' && state === 'tilted')) {
        const freeX = hinge + out * width * OPEN_SHARE;
        const leanBottom = kind === 'door' ? LEAN_BOTTOM_DOOR : LEAN_BOTTOM;

        return [
            { x: hinge, y: leaf.top },
            { x: freeX, y: leaf.top - LEAN_TOP },
            { x: freeX, y: leaf.bottom + leanBottom },
            { x: hinge, y: leaf.bottom },
        ];
    }

    if (state === 'tilted') {
        // it turns on its bottom edge, so the top has come towards the viewer: lower and wider
        const top = leaf.top + (leaf.bottom - leaf.top) * TILT_SHARE;

        return [
            { x: hinge - out * 6, y: top },
            { x: free + out * 6, y: top },
            { x: free - out * 2, y: leaf.bottom },
            { x: hinge + out * 2, y: leaf.bottom },
        ];
    }

    return [
        { x: hinge, y: leaf.top },
        { x: free, y: leaf.top },
        { x: free, y: leaf.bottom },
        { x: hinge, y: leaf.bottom },
    ];
}

/**
 * A window or a door, drawn as one: the frame, and the leaf that stands open, tilts or sits flush.
 *
 * A word would do the job - `open` - and a word is what the sensor widget shows. This is for the card that
 * hangs on a wall and is read from across the room: the shape of a window standing open is recognised before
 * it is read, which is the whole point of putting it on a wall.
 *
 * Two things decide what is drawn. A door is slimmer than a window, reaches the floor and carries a lever
 * rather than a knob, so the two are told apart at a glance. And the leaf turns on the side it is hinged on,
 * which is the side the handle is *not* on: the handle therefore stays on its own edge of the leaf and
 * travels with it, instead of jumping from one side of the frame to the other.
 *
 * It is drawn in a `viewBox` and scales with its box like everything else in these sets.
 *
 * @param props - what the window is doing, which way round it is, and in which colours
 */
export default function WindowGlass(props: WindowGlassProps): React.JSX.Element {
    const kind = props.kind === 'door' ? 'door' : 'window';
    const door = kind === 'door';
    const handleRight = (props.handle || 'right') !== 'left';
    const open = props.state !== 'closed';
    const colour = open ? props.accent : props.outline;

    const { frame } = leafBox(kind);
    const corners = leafCorners(props.state, kind, handleRight ? 'right' : 'left');
    const sash = `${corners.map((corner, index) => `${index ? 'L' : 'M'}${corner.x} ${corner.y}`).join(' ')} Z`;

    // the handle stands in the middle of the free edge, a little way onto the leaf
    const handleX = (corners[1].x + corners[2].x) / 2 + (handleRight ? -5 : 5);
    const handleY = (corners[1].y + corners[2].y) / 2;

    return (
        <svg
            viewBox={`0 0 ${BOX.width} ${BOX.height}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: '100%', height: '100%', display: 'block' }}
        >
            {/* the opening in the wall, which stays where it is whatever the leaf does */}
            <rect
                x={frame.x}
                y={frame.y}
                width={frame.width}
                height={frame.height}
                rx="3"
                fill={props.background}
                stroke={props.outline}
                strokeWidth="2.5"
            />
            {/* the sill of a window, or the floor a door stands on */}
            <path
                d={door ? `M${frame.x - 14} ${frame.y + frame.height} H${frame.x + frame.width + 14}` : 'M2 80 H98'}
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
                style={{ transition: 'd 0.3s, fill 0.3s, stroke 0.3s' }}
            />

            {/* a door is opened by a lever, a window by a knob - the second thing that tells the two apart */}
            {door ? (
                <rect
                    x={handleRight ? handleX - 9 : handleX - 2}
                    y={handleY - 1.75}
                    width="11"
                    height="3.5"
                    rx="1.75"
                    fill={colour}
                    style={{ transition: 'all 0.3s' }}
                />
            ) : (
                <circle
                    cx={handleX}
                    cy={handleY}
                    r="3"
                    fill={colour}
                    style={{ transition: 'all 0.3s' }}
                />
            )}
        </svg>
    );
}
