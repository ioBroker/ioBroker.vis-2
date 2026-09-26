import React from 'react';

import { Close as CloseIcon } from '@mui/icons-material';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';

import type { Connection, ThemeType } from '@iobroker/gui-components';

import HistoryChart, { type HistoryChartObject } from './HistoryChart';

export interface ChartDialogProps {
    socket: Connection;
    /** The state whose history is shown */
    oid: string;
    /** A second state, drawn into the same chart */
    oid2?: string;
    /** The instance that logs the first state, out of `historyInstanceOf` */
    instance: string;
    /** The instance that logs the second state, when it is another one */
    instance2?: string | null;
    /** What stands above the chart; without it the name of the state is taken */
    title?: string;
    /** The colour of the first line */
    color?: string;
    /** The colour of the second line */
    color2?: string;
    /** How far back the chart looks when it opens, in hours */
    hours?: number;
    /** Draw the lines as smooth curves rather than from reading to reading */
    spline?: boolean;
    themeType: ThemeType;
    /** The system writes a number with a comma, not a point */
    isFloatComma?: boolean;
    t: (word: string, ...args: (string | number)[]) => string;
    onClose: () => void;
}

/**
 * The history of a widget behind a click on it.
 *
 * The card itself only carries the shape of the last day, as a line behind the number; this is where the value
 * can be read: with its axes, the periods to choose from, a crosshair that says what stood there and when, and
 * the pan and zoom of {@link HistoryChart}.
 *
 * The states are read here rather than by the chart because it wants what the object says about them - the
 * unit, the words of a state that has some, whether it is a boolean and therefore a step curve.
 *
 * @param props - which states to show, where their history is, and how it should look
 */
export default function ChartDialog(props: ChartDialogProps): React.JSX.Element {
    const { socket, oid, oid2 } = props;
    const [objects, setObjects] = React.useState<{ first?: HistoryChartObject; second?: HistoryChartObject }>({});

    React.useEffect(() => {
        let dropped = false;

        void (async () => {
            const read = async (id: string | undefined): Promise<HistoryChartObject | undefined> => {
                if (!id) {
                    return undefined;
                }
                try {
                    const obj = (await socket.getObject(id)) as ioBroker.StateObject | null | undefined;
                    return obj ? { _id: obj._id, common: obj.common } : undefined;
                } catch {
                    return undefined;
                }
            };
            const [first, second] = await Promise.all([read(oid), read(oid2)]);
            if (!dropped) {
                setObjects({ first, second });
            }
        })();

        return () => {
            dropped = true;
        };
    }, [socket, oid, oid2]);

    const name =
        typeof objects.first?.common?.name === 'string' ? objects.first.common.name : objects.first?._id || oid;

    return (
        <Dialog
            open
            onClose={props.onClose}
            maxWidth="md"
            fullWidth
            slotProps={{ paper: { sx: { height: '80vh', maxHeight: 600 } } }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 6, pb: 0.5 }}>
                {props.title || name}
                <IconButton
                    onClick={props.onClose}
                    sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 1.5, pt: 0.5 }}>
                <HistoryChart
                    socket={socket}
                    obj={objects.first}
                    obj2={objects.second}
                    historyInstance={props.instance}
                    historyInstance2={props.instance2}
                    hours={props.hours}
                    spline={props.spline}
                    color={props.color}
                    color2={props.color2}
                    themeType={props.themeType}
                    isFloatComma={props.isFloatComma}
                    t={props.t}
                />
            </DialogContent>
        </Dialog>
    );
}
