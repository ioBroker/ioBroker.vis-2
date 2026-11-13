import React from 'react';

import {
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    List,
    ListItem,
    ListItemText,
} from '@mui/material';
import {
    Check as IconCheck,
    Close as IconClose,
    Download as IconInstall,
    Refresh as IconReload,
    Update as IconUpdate,
} from '@mui/icons-material';

import { I18n, type Connection } from '@iobroker/gui-components';
import type { Project } from '@iobroker/types-vis-2';

import { findMissingWidgetSets, findWidgetAdapter, missingKey, type MissingWidgetSet } from '@/Vis/visMissingWidgets';
import type { IncompatibleWidgetSet } from '@/Vis/visWidgetSetCompatibility';

/** Where the sets are remembered that the user has already been told about */
const MISSING_ACK = 'Vis.missingWidgetsAck';

/** How often it is looked whether the adapter is there, and for how long */
const POLL = 3_000;
const POLL_FOR = 5 * 60_000;

/** What the host does for a row: install the adapter, or update the one that is there */
type Action = 'add' | 'upgrade';

interface Row {
    /** What the row is named by: the set, or the adapter of a set that could not be loaded */
    key: string;
    /** The adapter that brings the widgets, where one is known */
    adapter: string | null;
    action: Action;
    /** What is said about it under its name */
    detail: string;
    status: 'idle' | 'running' | 'done' | 'error';
    error?: string;
}

interface MissingWidgetsDialogProps {
    socket: Connection;
    /** The project, once its widget sets are loaded */
    project: Project;
    /** Whether a widget type can be drawn */
    isKnown: (tpl: string) => boolean;
    /** The sets that were found but could not be loaded, and that the user was not told about yet */
    incompatibleSets: IncompatibleWidgetSet[];
    /** This adapter and its instance, to know on which host to install */
    adapterName: string;
    instance: number;
    /** The dialog was closed: the sets it was about are not to be shown again */
    onClose: () => void;
}

/**
 * Send a message to a host through the socket of `web`.
 *
 * `cmdExec` itself is a command of the socket of admin only; through `sendToHost` it reaches the host as well,
 * with the same permission to execute.
 *
 * @param socket - the connection
 * @param host - the host, with or without `system.host.`
 * @param command - what the host is asked
 * @param message - what it gets with it
 * @param timeout - how long the answer is waited for; a host that answers nothing is no error
 */
function sendToHost(
    socket: Connection,
    host: string,
    command: string,
    message: Record<string, unknown>,
    timeout: number,
): Promise<any> {
    return new Promise(resolve => {
        const timer = setTimeout(() => resolve(undefined), timeout);
        socket.getRawSocket().emit('sendToHost', host, command, message, (result: any) => {
            clearTimeout(timer);
            resolve(result);
        });
    });
}

/**
 * Install or update an adapter, and wait until it is there.
 *
 * The host writes what it does to its log and to the socket of admin, not to this one, so the only way to know that
 * it is done is to look at the object of the adapter: there at all after an installation, with another version after
 * an update.
 *
 * @param socket - the connection
 * @param host - the host to install on
 * @param adapter - the adapter
 * @param action - install it, or update it
 * @param track - is handed the timer that looks, so it can be stopped when the dialog goes away
 * @returns what went wrong, or null once the adapter is there
 */
async function installAdapter(
    socket: Connection,
    host: string,
    adapter: string,
    action: Action,
    track: (timer: ReturnType<typeof setInterval>) => void,
): Promise<string | null> {
    const before = await socket.getObject(`system.adapter.${adapter}`).catch(() => null);
    const started = Date.now();
    const result = await sendToHost(socket, host, 'cmdExec', { data: `${action} ${adapter}`, id: started }, 5_000);
    if (result?.error) {
        return result.error === 'permissionError' ? I18n.t('missing_widgets_no_permission') : `${result.error}`;
    }

    return new Promise(resolve => {
        const timer = setInterval(() => {
            void socket
                .getObject(`system.adapter.${adapter}`)
                .catch(() => null)
                .then(obj => {
                    const done = action === 'add' ? !!obj : !!obj && obj.common?.version !== before?.common?.version;
                    if (done || Date.now() - started > POLL_FOR) {
                        clearInterval(timer);
                        resolve(done ? null : I18n.t('missing_widgets_timeout'));
                    }
                });
        }, POLL);
        track(timer);
    });
}

/** The words of a list, short: `Home, Kitchen and 3 more` */
function listOf(names: string[]): string {
    return names.length > 3 ? `${names.slice(0, 3).join(', ')} +${names.length - 3}` : names.join(', ');
}

/**
 * The editor says which widgets of the project are missing, and installs them.
 *
 * Two things end up here. A widget of the project whose set is not installed is drawn as a striped box with
 * "Unknown widget type" in it; the dialog gathers them by set and finds the adapter that brings the set in the
 * repository. And a set that is installed but could not be loaded - built for an older React, or failing while
 * it was loaded - needs a newer version of its adapter. Both are a button away: the host installs or updates the
 * adapter, the dialog waits until it is there and offers to load the editor again, which is what brings the new
 * widgets in.
 *
 * Only the editor shows this. Whoever looks at the runtime on a wall panel can do nothing about a missing adapter,
 * and a dialog over the house is worse than a gap in it.
 */
export default function MissingWidgetsDialog(props: MissingWidgetsDialogProps): React.JSX.Element | null {
    const { socket, adapterName, instance } = props;

    // what is missing is worked out once, when the dialog comes up: the project changes under it while it is open
    const [missing] = React.useState<MissingWidgetSet[]>(() => {
        const found = findMissingWidgetSets(props.project, props.isKnown);
        let acknowledged: string | null = null;
        try {
            acknowledged = window.localStorage.getItem(MISSING_ACK);
        } catch {
            // without storage it is shown every time, which is the safe side
        }
        return found.length && acknowledged === missingKey(found.map(one => one.set)) ? [] : found;
    });
    const [rows, setRows] = React.useState<Row[] | null>(null);
    const [host, setHost] = React.useState<string>('');
    // what was missing stays missing after the dialog was closed: it is the closing that hides it
    const [closed, setClosed] = React.useState(false);
    const timers = React.useRef<ReturnType<typeof setInterval>[]>([]);

    const incompatible = props.incompatibleSets;
    const open = !closed && !!(missing.length || incompatible.length);

    React.useEffect(() => {
        if (!open) {
            return undefined;
        }
        let dropped = false;
        void (async (): Promise<void> => {
            const instanceObj = await socket.getObject(`system.adapter.${adapterName}.${instance}`).catch(() => null);
            const ownHost = instanceObj?.common?.host || '';

            // the repository says which adapter brings a set; without it only a name like `vis-…` is taken for one
            let repository: Record<string, unknown> | null = null;
            if (missing.length && ownHost) {
                const config = await socket.getSystemConfig().catch(() => null);
                const result = await sendToHost(
                    socket,
                    ownHost,
                    'getRepository',
                    { repo: config?.common?.activeRepo, update: false },
                    20_000,
                );
                repository = result && typeof result === 'object' && !result.error ? result : null;
            }

            const built: Row[] = [];
            for (const set of missing) {
                const adapter = findWidgetAdapter(set.set, repository);
                const installed = adapter
                    ? await socket.getObject(`system.adapter.${adapter}`).catch(() => null)
                    : null;
                built.push({
                    key: set.set || listOf(set.types),
                    adapter,
                    // an adapter that is there and still brings nothing is one too old for its widgets
                    action: installed ? 'upgrade' : 'add',
                    detail: I18n.t('missing_widgets_count', set.count, listOf(set.views)),
                    status: 'idle',
                });
            }
            for (const set of incompatible) {
                if (!built.find(row => row.adapter === set.adapter)) {
                    built.push({
                        key: set.adapter,
                        adapter: set.adapter,
                        action: 'upgrade',
                        detail:
                            set.problem === 'load'
                                ? set.error || I18n.t('missing_widgets_load_failed')
                                : I18n.t('missing_widgets_outdated'),
                        status: 'idle',
                    });
                }
            }
            if (!dropped) {
                setHost(ownHost);
                setRows(built);
            }
        })();

        return () => {
            dropped = true;
        };
        // the sets are known when the dialog comes up and do not change while it is open
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => () => timers.current.forEach(timer => clearInterval(timer)), []);

    if (!open) {
        return null;
    }

    const update = (key: string, change: Partial<Row>): void =>
        setRows(current => current?.map(row => (row.key === key ? { ...row, ...change } : row)) || null);

    const run = (row: Row): void => {
        if (!row.adapter || !host) {
            return;
        }
        update(row.key, { status: 'running', error: undefined });
        void installAdapter(socket, host, row.adapter, row.action, timer => timers.current.push(timer)).then(error =>
            update(row.key, error ? { status: 'error', error } : { status: 'done' }),
        );
    };

    const close = (): void => {
        try {
            window.localStorage.setItem(MISSING_ACK, missingKey(missing.map(one => one.set)));
        } catch {
            // it comes again next time, which is no harm
        }
        setClosed(true);
        props.onClose();
    };

    const anyDone = rows?.some(row => row.status === 'done');
    const anyRunning = rows?.some(row => row.status === 'running');

    return (
        <Dialog
            open
            maxWidth="sm"
            fullWidth
            onClose={anyRunning ? undefined : close}
        >
            <DialogTitle>{I18n.t('missing_widgets_title')}</DialogTitle>
            <DialogContent>
                <div style={{ marginBottom: 8 }}>{I18n.t('missing_widgets_text')}</div>
                {rows ? (
                    <List dense>
                        {rows.map(row => (
                            <ListItem
                                key={row.key}
                                disableGutters
                                secondaryAction={
                                    row.status === 'running' ? (
                                        <CircularProgress size={24} />
                                    ) : row.status === 'done' ? (
                                        <IconCheck color="success" />
                                    ) : row.adapter && host ? (
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={row.action === 'add' ? <IconInstall /> : <IconUpdate />}
                                            onClick={() => run(row)}
                                        >
                                            {I18n.t(row.action === 'add' ? 'missing_widgets_install' : 'Update')}
                                        </Button>
                                    ) : null
                                }
                            >
                                <ListItemText
                                    // the button must not stand over a long name or error
                                    style={{ paddingRight: 130 }}
                                    primary={row.adapter ? `${row.adapter}` : row.key}
                                    secondary={
                                        <>
                                            {row.detail}
                                            {!row.adapter ? (
                                                <span style={{ display: 'block' }}>
                                                    {I18n.t('missing_widgets_no_adapter', row.key)}
                                                </span>
                                            ) : null}
                                            {row.error ? (
                                                <span style={{ display: 'block', color: '#f44336' }}>{row.error}</span>
                                            ) : null}
                                        </>
                                    }
                                    slotProps={{ secondary: { sx: { wordBreak: 'break-word' } } }}
                                />
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <CircularProgress size={24} />
                )}
                {anyDone ? <div style={{ marginTop: 8 }}>{I18n.t('missing_widgets_reload_hint')}</div> : null}
            </DialogContent>
            <DialogActions>
                {anyDone ? (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<IconReload />}
                        disabled={anyRunning}
                        onClick={() => {
                            close();
                            window.location.reload();
                        }}
                    >
                        {I18n.t('missing_widgets_reload')}
                    </Button>
                ) : null}
                <Button
                    variant={anyDone ? 'outlined' : 'contained'}
                    color={anyDone ? 'grey' : 'primary'}
                    startIcon={<IconClose />}
                    disabled={anyRunning}
                    onClick={close}
                >
                    {I18n.t('Close')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
