import React from 'react';

interface DoorAnimationProps {
    open: boolean;
    size?: number;
}

/**
 * A door that swings open and shut.
 *
 * In the widget set this was a Lottie animation of 197 KB plus the library that plays it. Here it is the door
 * itself: a frame and a leaf that turns on its hinge, drawn in the current color and moved by a transition. What
 * it says is the same - open or closed - and the widget it belongs to, the lock, brings no library of its own.
 */
export default function DoorAnimation(props: DoorAnimationProps): React.JSX.Element {
    const height = props.size || 120;
    const width = Math.round(height * 0.62);

    return (
        <div
            style={{
                position: 'relative',
                width,
                height,
                // the leaf turns away from the viewer, so the frame needs depth
                perspective: height * 2,
            }}
        >
            {/* the frame stays where it is, and shows the opening behind the leaf */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    border: '2px solid currentColor',
                    borderRadius: 4,
                    opacity: 0.5,
                    boxSizing: 'border-box',
                }}
            />
            {/* the leaf turns on its hinge; it carries the surface and the handle, which keep their own opacity */}
            <div
                style={{
                    position: 'absolute',
                    inset: 4,
                    transformOrigin: 'left center',
                    transform: props.open ? 'rotateY(-65deg)' : 'rotateY(0deg)',
                    transition: 'transform 0.5s ease',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 2,
                        border: '1px solid currentColor',
                        boxSizing: 'border-box',
                        background: 'currentColor',
                        // turned away, the leaf shows its edge, so it is drawn stronger to stay visible
                        opacity: props.open ? 0.55 : 0.3,
                        transition: 'opacity 0.5s ease',
                    }}
                />
                {/* the handle, on the side the door opens from */}
                <div
                    style={{
                        position: 'absolute',
                        right: Math.max(4, Math.round(width * 0.1)),
                        top: '50%',
                        width: Math.max(4, Math.round(width * 0.09)),
                        height: Math.max(4, Math.round(width * 0.09)),
                        marginTop: Math.round(-width * 0.045),
                        borderRadius: '50%',
                        background: 'currentColor',
                        opacity: 0.9,
                    }}
                />
            </div>
        </div>
    );
}
