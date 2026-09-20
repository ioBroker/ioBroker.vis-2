import React, { useCallback, useRef } from 'react';

import { hsvaToHex, type HsvaColor } from './colorUtils';

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
    /** Called while the pointer is dragged, with hue and saturation of the place it is at. */
    onChange: (hsva: HsvaColor) => void;
    /** Diameter in pixels, 200 if not given - the size the widget set had. */
    size?: number;
    /** Nothing can be dragged. */
    disabled?: boolean;
}

/**
 * Follow the pointer while it is down.
 *
 * The element takes the pointer for itself, so the drag goes on even when the finger leaves the wheel - which is
 * what one does when reaching for a strong color at the edge.
 *
 * @param onPoint what to do with the place the pointer is at
 * @param disabled nothing happens while this is true
 * @returns the handlers for the element that is dragged
 */
function usePointerDrag(
    onPoint: (event: React.PointerEvent<HTMLDivElement>) => void,
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
            onPoint(event);
        },
        [onPoint, disabled],
    );

    const onPointerMove = useCallback(
        (event: React.PointerEvent<HTMLDivElement>): void => {
            if (dragging.current && !disabled) {
                onPoint(event);
            }
        },
        [onPoint, disabled],
    );

    const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>): void => {
        dragging.current = false;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    }, []);

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
        (event: React.PointerEvent<HTMLDivElement>): void => {
            const rect = event.currentTarget.getBoundingClientRect();
            const radius = Math.min(rect.width, rect.height) / 2;
            const dx = event.clientX - (rect.left + rect.width / 2);
            const dy = event.clientY - (rect.top + rect.height / 2);

            // twelve o'clock is red, and the hue grows clockwise - the way the gradient below is painted
            const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
            const saturation = Math.min(100, (Math.sqrt(dx * dx + dy * dy) / radius) * 100);

            onChange({ ...hsva, h: hue, s: saturation });
        },
        [hsva, onChange],
    );

    const handlers = usePointerDrag(onPoint, disabled);

    // where the dot sits: the hue gives the direction, the saturation the distance from the middle
    const angle = ((hsva.h - 90) * Math.PI) / 180;
    const distance = Math.min(100, Math.max(0, hsva.s)) / 2;
    const left = 50 + Math.cos(angle) * distance;
    const top = 50 + Math.sin(angle) * distance;

    return (
        <div
            {...handlers}
            style={{
                position: 'relative',
                width: size || 200,
                height: size || 200,
                aspectRatio: '1 / 1',
                margin: 'auto',
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
}

interface ShadeSliderProps {
    /** The color whose brightness is set. */
    hsva: HsvaColor;
    /** Called while the pointer is dragged, with the brightness of the place it is at, 0..100. */
    onChange: (value: number) => void;
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
        (event: React.PointerEvent<HTMLDivElement>): void => {
            const rect = event.currentTarget.getBoundingClientRect();
            const value = ((event.clientX - rect.left) / rect.width) * 100;
            onChange(Math.min(100, Math.max(0, value)));
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
