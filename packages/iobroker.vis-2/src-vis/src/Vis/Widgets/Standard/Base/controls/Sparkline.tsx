import React from 'react';

import type { Connection } from '@iobroker/gui-components';

import { historyPath, loadHistory, smoothHistory, type HistoryPoint } from './history';

export interface SparklineProps {
    socket: Connection;
    /** The state whose history is drawn */
    oid: string;
    /** The instance that logs it, out of `historyInstanceOf`; without one nothing is drawn */
    instance: string | null | undefined;
    /** How far back to draw, in hours */
    hours: number;
    /** The colour of the line and of the area under it */
    color: string;
    /** The value that arrived last, so the drawing follows the widget without asking the history again */
    latest?: number;
    /** Over how many seconds the readings are averaged; none at zero */
    smoothing?: number;
    /** Draw the line as a smooth curve rather than from reading to reading */
    spline?: boolean;
}

/** The box the path is worked out in; the SVG stretches it to whatever the card is */
const BOX = { width: 200, height: 60 };

/** How often the drawing asks the history for what has come in since, in ms */
const REFRESH = 60_000;

/**
 * The history of a value as a line behind the card.
 *
 * It is drawn as two SVG paths - the line and the area under it - and nothing else: a chart library for a
 * thumbnail nobody reads a number off is a megabyte for a decoration. The chart with the axes, the tooltip and
 * the periods is {@link HistoryChart}, and a click opens it.
 *
 * The value axis is stretched to what the readings cover, so the shape says what the value did, not how large
 * it is. Nothing is drawn when the state is not logged, or when the history holds fewer than two readings; the
 * widget then simply has no background, which is why this is never given a height of its own.
 *
 * @param props - which state, how far back, and in which colour
 */
export default function Sparkline(props: SparklineProps): React.JSX.Element | null {
    const [points, setPoints] = React.useState<HistoryPoint[]>([]);
    const { socket, oid, instance, hours } = props;

    React.useEffect(() => {
        if (!instance || !oid) {
            setPoints([]);
            return;
        }
        let dropped = false;

        const read = async (): Promise<void> => {
            const loaded = await loadHistory(socket, instance, oid, hours);
            if (!dropped) {
                setPoints(loaded);
            }
        };

        void read();
        // a card that hangs on a wall for a day would otherwise show the same hour for ever
        const timer = setInterval(() => void read(), REFRESH);

        return () => {
            dropped = true;
            clearInterval(timer);
        };
    }, [socket, oid, instance, hours]);

    // when the drawing last reached the present; read in an effect, because what a render works out of the
    // clock is different on every render and React may render whenever it likes
    const [now, setNow] = React.useState(0);
    React.useEffect(() => setNow(Date.now()), [points, props.latest]);

    // the value that just arrived belongs at the right edge, so the line reaches the present
    const drawn = React.useMemo(() => {
        if (props.latest === undefined || !points.length || !now) {
            return points;
        }
        return [...points, { ts: Math.max(now, points[points.length - 1].ts), val: props.latest }];
    }, [points, props.latest, now]);

    const path = historyPath(smoothHistory(drawn, props.smoothing || 0), BOX.width, BOX.height, props.spline);
    if (!path) {
        return null;
    }

    return (
        <svg
            viewBox={`0 0 ${BOX.width} ${BOX.height}`}
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%', display: 'block' }}
        >
            <path
                d={path.area}
                fill={props.color}
                opacity={0.14}
            />
            <path
                d={path.line}
                fill="none"
                stroke={props.color}
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={0.55}
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}
