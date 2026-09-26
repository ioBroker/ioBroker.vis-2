import React, { useCallback, useRef } from 'react';

import { hsvaToHex, kelvinToHex, type HsvaColor } from './colorUtils';

/**
 * The round color wheel of the RGB light, and the slider for its brightness below it.
 *
 * The widget set drew them with a color package; they are drawn here, because a wheel is two gradients and a dot:
 * the hue turns around the circle, the saturation grows from the middle outwards, and the finger drags the dot.
 */

const POINTER_SIZE = 18;

interface WheelProps {
    /** The color the wheel points at. */
    hsva: HsvaColor;
    /**
     * Called while the pointer is dragged, with hue and saturation of the place it is at, and once more when
     * it is let go - `done` says which of the two it is.
     */
    onChange: (hsva: HsvaColor, done: boolean) => void;
    /**
     * How large the wheel is: a number of pixels, or a length like `100%`.
     *
     * A length is taken as the height, and the width follows from it - a wheel is round, and in a card that is
     * wider than it is tall the height is what there is least of.
     */
    size?: number | string;
    /** Nothing can be dragged. */
    disabled?: boolean;
}

/**
 * Follow the pointer while it is down.
 *
 * The element takes the pointer for itself, so the drag goes on even when the finger leaves the wheel - which is
 * what one does when reaching for a strong color at the edge.
 *
 * `done` tells the two apart: a lamp is shown every colour the finger passes over, and is sent only the one it
 * is let go on. A bus that carries every frame of a drag is a bus that carries nothing else.
 *
 * @param onPoint what to do with the place the pointer is at, and whether the drag is over
 * @param disabled nothing happens while this is true
 * @returns the handlers for the element that is dragged
 */
function usePointerDrag(
    onPoint: (event: React.PointerEvent<HTMLDivElement>, done: boolean) => void,
    disabled?: boolean,
): {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
} {
    const dragging = useRef(false);

    const onPointerDown = useCallback(
        (event: React.PointerEvent<HTMLDivElement>): void => {
            if (disabled) {
                return;
            }
            dragging.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            onPoint(event, false);
        },
        [onPoint, disabled],
    );

    const onPointerMove = useCallback(
        (event: React.PointerEvent<HTMLDivElement>): void => {
            if (dragging.current && !disabled) {
                onPoint(event, false);
            }
        },
        [onPoint, disabled],
    );

    const onPointerUp = useCallback(
        (event: React.PointerEvent<HTMLDivElement>): void => {
            const wasDragging = dragging.current;
            dragging.current = false;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
            }
            if (wasDragging && !disabled) {
                onPoint(event, true);
            }
        },
        [onPoint, disabled],
    );

    return { onPointerDown, onPointerMove, onPointerUp };
}

/**
 * The wheel: hue around, saturation outwards.
 *
 * @param props the color, what to call on a change, and how big it should be
 * @returns the wheel
 */
export default function ColorWheel(props: WheelProps): React.JSX.Element {
    const { hsva, onChange, size, disabled } = props;

    const onPoint = useCallback(
        (event: React.PointerEvent<HTMLDivElement>, done: boolean): void => {
            const rect = event.currentTarget.getBoundingClientRect();
            const radius = Math.min(rect.width, rect.height) / 2;
            const dx = event.clientX - (rect.left + rect.width / 2);
            const dy = event.clientY - (rect.top + rect.height / 2);

            // twelve o'clock is red, and the hue grows clockwise - the way the gradient below is painted
            const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
            const saturation = Math.min(100, (Math.sqrt(dx * dx + dy * dy) / radius) * 100);

            onChange({ ...hsva, h: hue, s: saturation }, done);
        },
        [hsva, onChange],
    );

    const handlers = usePointerDrag(onPoint, disabled);

    // where the dot sits: the hue gives the direction, the saturation the distance from the middle
    const angle = ((hsva.h - 90) * Math.PI) / 180;
    const distance = Math.min(100, Math.max(0, hsva.s)) / 2;
    const left = 50 + Math.cos(angle) * distance;
    const top = 50 + Math.sin(angle) * distance;

    /*
     * A wheel is round, and staying round in a box of any shape is harder than it looks.
     *
     * `aspect-ratio` together with `max-width` does not do it: the height here is a definite `100%`,
     * so a clamped width cannot make the height follow and the wheel comes out as an egg - which is
     * exactly what it did. The two container units say it in one go: as wide as the shorter side of
     * the box, and as high as that. The box around it declares itself the container they measure.
     */
    const fit = typeof size === 'string' ? 'min(100cqw, 100cqh)' : size || 200;

    const wheel = (
        <div
            {...handlers}
            style={{
                position: 'relative',
                width: fit,
                height: fit,
                flexShrink: 0,
                borderRadius: '50%',
                touchAction: 'none',
                userSelect: 'none',
                cursor: disabled ? undefined : 'pointer',
                background:
                    'radial-gradient(circle closest-side, #FFFFFF, rgba(255, 255, 255, 0) 100%), ' +
                    'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    left: `${left}%`,
                    top: `${top}%`,
                    width: POINTER_SIZE,
                    height: POINTER_SIZE,
                    marginLeft: -POINTER_SIZE / 2,
                    marginTop: -POINTER_SIZE / 2,
                    borderRadius: '50%',
                    border: '2px solid #FFFFFF',
                    boxShadow: '0 0 3px rgba(0, 0, 0, 0.6)',
                    background: hsvaToHex({ ...hsva, v: 100 }),
                    pointerEvents: 'none',
                }}
            />
        </div>
    );

    // a wheel of a fixed size needs nothing around it; one that has to fit a box needs the box to say
    // how big it is, which is what a container query asks
    if (typeof size !== 'string') {
        return wheel;
    }

    return (
        <div
            style={{
                containerType: 'size',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {wheel}
        </div>
    );
}

interface ShadeSliderProps {
    /** The color whose brightness is set. */
    hsva: HsvaColor;
    /**
     * Called while the pointer is dragged with the brightness of the place it is at, 0..100, and once more
     * when it is let go.
     */
    onChange: (value: number, done: boolean) => void;
    /** Nothing can be dragged. */
    disabled?: boolean;
}

/**
 * The bar below the wheel: black at the left, the chosen color at the right.
 *
 * @param props the color, what to call on a change
 * @returns the bar
 */
export function ShadeSlider(props: ShadeSliderProps): React.JSX.Element {
    const { hsva, onChange, disabled } = props;

    const onPoint = useCallback(
        (event: React.PointerEvent<HTMLDivElement>, done: boolean): void => {
            const rect = event.currentTarget.getBoundingClientRect();
            const value = ((event.clientX - rect.left) / rect.width) * 100;
            onChange(Math.min(100, Math.max(0, value)), done);
        },
        [onChange],
    );

    const handlers = usePointerDrag(onPoint, disabled);

    return (
        <div
            {...handlers}
            style={{
                position: 'relative',
                width: '100%',
                height: 16,
                margin: '8px 0',
                borderRadius: 8,
                touchAction: 'none',
                userSelect: 'none',
                cursor: disabled ? undefined : 'pointer',
                background: `linear-gradient(to right, #000000, ${hsvaToHex({ ...hsva, v: 100 })})`,
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    left: `${Math.min(100, Math.max(0, hsva.v))}%`,
                    top: '50%',
                    width: POINTER_SIZE,
                    height: POINTER_SIZE,
                    marginLeft: -POINTER_SIZE / 2,
                    marginTop: -POINTER_SIZE / 2,
                    borderRadius: '50%',
                    border: '2px solid #FFFFFF',
                    boxShadow: '0 0 3px rgba(0, 0, 0, 0.6)',
                    background: hsvaToHex(hsva),
                    pointerEvents: 'none',
                }}
            />
        </div>
    );
}

interface ColorTempSliderProps {
    /** Where the slider stands, in Kelvin */
    kelvin: number;
    /** The warm end of what this lamp can do */
    min: number;
    /** The cold end */
    max: number;
    /** Called while the pointer is dragged, and once more when it is let go */
    onChange: (kelvin: number, done: boolean) => void;
    disabled?: boolean;
}

/**
 * The bar for the colour temperature: candlelight at the left, daylight at the right.
 *
 * It is painted with the temperatures the lamp can actually do, so a lamp that only goes from 2700 to 4000
 * Kelvin shows that stretch across the whole bar rather than a range it cannot reach.
 *
 * @param props - where it stands, what the lamp can do, and where the answer goes
 * @returns the bar
 */
export function ColorTempSlider(props: ColorTempSliderProps): React.JSX.Element {
    const { kelvin, min, max, onChange, disabled } = props;
    const span = max - min || 1;

    const at = useCallback(
        (event: React.PointerEvent<HTMLDivElement>): number => {
            const rect = event.currentTarget.getBoundingClientRect();
            const share = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
            return Math.round(min + share * span);
        },
        [min, span],
    );

    const handlers = usePointerDrag((event, done) => onChange(at(event), done), disabled);

    // five stops are enough for a bar: the curve between them is smooth enough for an eye
    const stops = [0, 0.25, 0.5, 0.75, 1].map(share => kelvinToHex(min + share * span)).join(', ');

    return (
        <div
            {...handlers}
            style={{
                position: 'relative',
                width: '100%',
                height: 16,
                margin: '8px 0',
                borderRadius: 8,
                touchAction: 'none',
                userSelect: 'none',
                cursor: disabled ? undefined : 'pointer',
                background: `linear-gradient(to right, ${stops})`,
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    left: `${((Math.min(max, Math.max(min, kelvin)) - min) / span) * 100}%`,
                    top: '50%',
                    width: POINTER_SIZE,
                    height: POINTER_SIZE,
                    marginLeft: -POINTER_SIZE / 2,
                    marginTop: -POINTER_SIZE / 2,
                    borderRadius: '50%',
                    border: '2px solid #FFFFFF',
                    boxShadow: '0 0 3px rgba(0, 0, 0, 0.6)',
                    background: kelvinToHex(kelvin),
                    pointerEvents: 'none',
                }}
            />
        </div>
    );
}
