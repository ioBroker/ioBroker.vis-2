import React from 'react';

export interface CameraViewProps {
    /** Where the picture comes from: an address, or a `data:image/...` the state itself carries */
    src: string;
    /** How often a new one is fetched, in seconds; 0 leaves it at the one it has */
    refresh: number;
    /** `cover` fills the box and crops, `contain` shows the whole picture */
    fit: 'cover' | 'contain';
    /** The camera hangs at an angle: 0, 90, 180 or 270 degrees */
    rotate: number;
    radius?: number;
    /** What to say while there is nothing to show */
    emptyText: string;
    /** The colour of that line */
    quiet: string;
    /** The line around the box */
    outline: string;
}

/**
 * The picture of a camera.
 *
 * Most cameras in ioBroker are a still picture behind an address, not a stream: the `cameras` adapter serves
 * one, and so does every doorbell that can be asked over HTTP. A still picture has to be fetched again to stay
 * a picture of now, which is what `refresh` is for.
 *
 * The new picture replaces the old one only once it has arrived. Pointing the same element at a new address
 * makes it go white while it loads, and a camera that blinks every few seconds is harder to watch than one
 * that lags - so the next one is loaded out of sight and swapped in when it is there.
 *
 * @param props - where the picture comes from, how often, and how it should sit in its box
 */
export default function CameraView(props: CameraViewProps): React.JSX.Element {
    const [shown, setShown] = React.useState(props.src);
    const [failed, setFailed] = React.useState(false);
    const { src, refresh } = props;

    // a picture that carries its own data is already here; only an address can be asked again
    const isData = src.startsWith('data:');

    React.useEffect(() => {
        setShown(src);
        setFailed(false);
    }, [src]);

    React.useEffect(() => {
        if (!refresh || !src || isData) {
            return;
        }
        let dropped = false;

        const timer = setInterval(
            () => {
                const next = `${src}${src.includes('?') ? '&' : '?'}_=${Date.now()}`;
                const loader = new Image();
                loader.onload = () => {
                    if (!dropped) {
                        setShown(next);
                        setFailed(false);
                    }
                };
                loader.onerror = () => {
                    if (!dropped) {
                        setFailed(true);
                    }
                };
                loader.src = next;
            },
            Math.max(1, refresh) * 1000,
        );

        return () => {
            dropped = true;
            clearInterval(timer);
        };
    }, [src, refresh, isData]);

    if (!src || failed) {
        return (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px dashed ${props.outline}`,
                    borderRadius: props.radius || 8,
                    color: props.quiet,
                    fontSize: 12,
                    textAlign: 'center',
                    padding: 8,
                    boxSizing: 'border-box',
                }}
            >
                {props.emptyText}
            </div>
        );
    }

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                borderRadius: props.radius || 8,
                display: 'flex',
            }}
        >
            <img
                src={shown}
                alt=""
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: props.fit,
                    // a camera that hangs sideways is turned here rather than in the camera
                    transform: props.rotate ? `rotate(${props.rotate}deg)` : undefined,
                }}
                onError={() => setFailed(true)}
            />
        </div>
    );
}
