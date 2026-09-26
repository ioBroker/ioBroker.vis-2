import React from 'react';

/** How far apart the slats of a blind sit, and how thick a line they are when the blind is fully open, in px */
const SLAT_PITCH = 8;
const SLAT_LINE = 2;

/**
 * The slats of a blind, as a background that repeats down the window.
 *
 * The thickness of a line is what says how far the slats are turned: fully turned they are thin lines with the
 * light between them, fully closed they run into each other and the blind is a solid surface. Taken from
 * `ShutterViz` of `ioBroker.aura`.
 *
 * @param color - the colour of a slat
 * @param tilt - how far the slats are turned, from 0 (closed) to 1 (open); open when it is not known
 */
export function slatGradient(color: string, tilt?: number): string {
    const turned = tilt === undefined ? 1 : Math.max(0, Math.min(1, tilt));
    const thick = SLAT_LINE + (SLAT_PITCH - SLAT_LINE) * (1 - turned);
    const gap = Math.max(0, SLAT_PITCH - thick);

    return `repeating-linear-gradient(to bottom, transparent 0px, transparent ${gap}px, ${color} ${gap}px, ${color} ${SLAT_PITCH}px)`;
}

export interface BlindWindowProps {
    /** How far the window is covered, from 0 to 100 */
    closed: number;
    /** How far the slats are turned, from 0 to 1; without it they are open */
    tilt?: number;
    /** The colour of the line that marks the lower edge of the blind */
    accent: string;
    /** The colour of the window behind the blind */
    background: string;
    /** The colour of the frame and of the slats */
    outline: string;
    /** Whether the blind is moving right now, which is what the marker line shows */
    moving?: boolean;
    /**
     * Pull the blind with the pointer inside the window.
     *
     * Called while it is dragged and once more when it is let go, with how far the window should be covered,
     * from 0 to 100. Without it the window is only a picture - which it is in the editor, where the pointer
     * belongs to the editor and not to the blind.
     */
    onDrag?: (closed: number, done: boolean) => void;
}

/**
 * The window a blind hangs in, filled from the top as far as the blind is down.
 *
 * This is the one drawing that says at a glance what a blind is doing, so it is worth its space: the slats, the
 * light between them, and a line in the colour of the state marking where the blind ends.
 *
 * @param props - how far down the blind is and which colours to draw it in
 */
export default function BlindWindow(props: BlindWindowProps): React.JSX.Element {
    const closed = Math.max(0, Math.min(100, props.closed));
    const { onDrag } = props;

    /** How far the blind would be down if it were pulled to this point */
    const positionAt = (element: HTMLElement, clientY: number): number => {
        const box = element.getBoundingClientRect();
        if (!box.height) {
            return closed;
        }
        return Math.max(0, Math.min(100, ((clientY - box.top) / box.height) * 100));
    };

    const pull = onDrag
        ? {
              onPointerDown: (e: React.PointerEvent<HTMLDivElement>): void => {
                  // the pointer belongs to the window until it is let go, so the blind follows it outside too
                  e.currentTarget.setPointerCapture(e.pointerId);
                  e.stopPropagation();
                  onDrag(positionAt(e.currentTarget, e.clientY), false);
              },
              onPointerMove: (e: React.PointerEvent<HTMLDivElement>): void => {
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                      onDrag(positionAt(e.currentTarget, e.clientY), false);
                  }
              },
              onPointerUp: (e: React.PointerEvent<HTMLDivElement>): void => {
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                      onDrag(positionAt(e.currentTarget, e.clientY), true);
                  }
              },
          }
        : undefined;

    return (
        <div
            {...pull}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: 32,
                borderRadius: 6,
                overflow: 'hidden',
                background: props.background,
                border: `1px solid ${props.outline}`,
                boxSizing: 'border-box',
                cursor: onDrag ? 'ns-resize' : undefined,
                // a drag inside the window is a drag of the blind, not of the text around it
                touchAction: onDrag ? 'none' : undefined,
                userSelect: onDrag ? 'none' : undefined,
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: `${closed}%`,
                    background: slatGradient(props.outline, props.tilt),
                    transition: 'height 0.4s ease',
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: `calc(${closed}% - 1px)`,
                    height: 2,
                    background: props.accent,
                    boxShadow: `0 0 4px ${props.accent}66`,
                    transition: 'top 0.4s ease, background 0.3s',
                }}
            />
            {props.moving ? (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: 8,
                        height: 8,
                        marginTop: -4,
                        marginLeft: -4,
                        borderRadius: '50%',
                        background: props.accent,
                        animation: 'vis-standard-pulse 1.2s ease-in-out infinite',
                    }}
                />
            ) : null}
        </div>
    );
}
