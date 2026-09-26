import React from 'react';

import type { Connection } from '@iobroker/gui-components';

import { loadHistory } from './history';

export interface TrendArrowProps {
    socket: Connection;
    /** The state whose course is judged */
    oid: string;
    /** The instance that logs it, out of `historyInstanceOf`; without one nothing is drawn */
    instance: string | null | undefined;
    /** Over how many hours the value is compared with itself */
    hours: number;
    /** The value that arrived last; without it the newest reading of the history is taken instead */
    latest?: number;
    /** A change smaller than this counts as no change at all */
    threshold?: number;
    /** The colour of an arrow that points up */
    upColor: string;
    /** The colour of an arrow that points down */
    downColor: string;
    /** The colour of an arrow that lies flat */
    flatColor: string;
    /** How large the arrow is; without it, as large as the box it is put into */
    size?: number | string;
}

/** How often the arrow asks again, in ms */
const REFRESH = 60_000;

/**
 * Which way a value has gone, as an arrow.
 *
 * It compares the reading of an hour ago - or of whatever period it is given - with the one that arrived last,
 * and points up, down or straight ahead. The two colours are the widget's own business: for a temperature
 * rising is often the warm one, for a battery it is the good one.
 *
 * The end of the comparison is the value the widget is showing, not the newest reading of the history: a state
 * that is logged every half hour has one reading in the last hour, sometimes none, and asking two readings of
 * it would leave the arrow away on exactly the devices that change slowly enough to want one.
 *
 * Nothing is drawn while the history has not answered, and nothing when the state is not logged at all.
 *
 * @param props - which state, over how long, and in which colours
 */
export default function TrendArrow(props: TrendArrowProps): React.JSX.Element | null {
    // where the value stood at the beginning of the period
    const [then, setThen] = React.useState<number | null>(null);
    const { socket, oid, instance, hours } = props;

    React.useEffect(() => {
        if (!instance || !oid) {
            setThen(null);
            return;
        }
        let dropped = false;

        const read = async (): Promise<void> => {
            // a handful of readings, not two: a state that is logged every half hour has one or none in the
            // last hour, and the oldest of whatever came back is the one this is about
            const points = await loadHistory(socket, instance, oid, hours, 30);
            if (!dropped) {
                setThen(points.length ? points[0].val : null);
            }
        };

        void read();
        const timer = setInterval(() => void read(), REFRESH);

        return () => {
            dropped = true;
            clearInterval(timer);
        };
    }, [socket, oid, instance, hours]);

    if (then === null || props.latest === undefined) {
        return null;
    }
    const change = props.latest - then;

    const threshold = props.threshold ?? 0;
    const direction = change > threshold ? 'up' : change < -threshold ? 'down' : 'flat';
    const color = direction === 'up' ? props.upColor : direction === 'down' ? props.downColor : props.flatColor;
    const turn = direction === 'up' ? -45 : direction === 'down' ? 45 : 0;

    return (
        <svg
            viewBox="0 0 24 24"
            style={{
                // as a style and not as an attribute, so that a marker can hand in one of its own lengths
                width: props.size ?? '100%',
                height: props.size ?? '100%',
                flexShrink: 0,
                transform: `rotate(${turn}deg)`,
                transition: 'transform 0.3s',
            }}
            role="img"
            aria-label={direction}
        >
            <path
                d="M4 12 H17 M12 7 L17 12 L12 17"
                fill="none"
                stroke={color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
