import React from 'react';

export interface SlideToggleProps {
    on: boolean;
    disabled?: boolean;
    /** The colour of the track while the device is on */
    color: string;
    /** The colour of the track while it is off */
    offColor: string;
    /** The width of the track, in px; the thumb and the travel follow from it */
    width?: number;
    onChange: () => void;
}

/**
 * The slide toggle of these widget sets.
 *
 * It is drawn here rather than taken from MUI because it is part of what the sets look like: a track the full
 * height of the thumb, the thumb a plain white circle with a shadow, and the colour of the track the colour of
 * the state - green for a switch that is on, the divider of the theme when it is off. The same shape as in
 * `ioBroker.aura`, whose widgets these sets follow.
 *
 * @param props - the state, the two colours and what to do when it is pressed
 */
export default function SlideToggle(props: SlideToggleProps): React.JSX.Element {
    const width = props.width || 48;
    const height = Math.round(width / 2);
    const thumb = height - 4;

    return (
        <div
            role="switch"
            aria-checked={props.on}
            aria-disabled={props.disabled}
            onClick={e => {
                e.stopPropagation();
                if (!props.disabled) {
                    props.onChange();
                }
            }}
            style={{
                position: 'relative',
                width,
                height,
                flexShrink: 0,
                borderRadius: height / 2,
                background: props.on ? props.color : props.offColor,
                opacity: props.disabled ? 0.5 : 1,
                cursor: props.disabled ? 'default' : 'pointer',
                transition: 'background 0.2s',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: 2,
                    left: 2,
                    width: thumb,
                    height: thumb,
                    borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                    transform: props.on ? `translateX(${width - thumb - 4}px)` : undefined,
                    transition: 'transform 0.2s',
                }}
            />
        </div>
    );
}
