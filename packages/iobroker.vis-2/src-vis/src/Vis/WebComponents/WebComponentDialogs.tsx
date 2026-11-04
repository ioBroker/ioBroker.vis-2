/**
 * The dialogs vis-2 opens for web components (`dialogs` of the contract): an element of the component framed by
 * a MUI dialog, or a form vis-2 renders from a JSON-Config panel.
 *
 * Loaded on demand: a page whose components never ask for a dialog does not fetch it.
 */
import React, { useEffect, useState } from 'react';

import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    IconButton,
    MenuItem,
    Slider,
    TextField,
    Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

import { I18n, SelectID, type Connection, type IobTheme } from '@iobroker/gui-components';
import {
    DECORATION_TYPES,
    DIALOG_CLOSE_EVENT,
    getText,
    isFormDialog,
    type WebComponentDialogRequest,
    type WebComponentElementDialog,
    type WebComponentFormDialog,
    type WebComponentSetting,
    type WebComponentText,
} from '@iobroker/web-components';

/** One open dialog and how it ends */
export interface OpenWebComponentDialog {
    id: number;
    request: WebComponentDialogRequest;
    resolve: (result: unknown) => void;
}

interface WebComponentDialogsProps {
    dialogs: OpenWebComponentDialog[];
    socket: Connection;
    theme: IobTheme;
}

function text(value: WebComponentText | undefined): string {
    return getText(value, I18n.getLanguage());
}

/** A value of a field as the text of an input */
function asText(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';
}

/** Width of the paper: what the component asks for, never wider than the window */
function paperStyle(request: WebComponentDialogRequest): React.CSSProperties {
    return {
        width: request.width ? `min(${request.width}px, calc(100vw - 32px))` : undefined,
        maxWidth: 'calc(100vw - 32px)',
    };
}

function Title(props: { title?: WebComponentText; onClose: () => void }): React.JSX.Element {
    return (
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
            <span style={{ flex: 1, minWidth: 0 }}>{text(props.title)}</span>
            <IconButton
                size="small"
                onClick={props.onClose}
                aria-label={I18n.t('Close')}
            >
                <CloseIcon />
            </IconButton>
        </DialogTitle>
    );
}

/**
 * The element of the component in a MUI dialog. The element brings its own styles (a shadow root); it closes the
 * dialog with `iob-dialog-close`, whose `detail` is the result
 */
function ElementDialog(props: {
    request: WebComponentElementDialog;
    resolve: (result: unknown) => void;
}): React.JSX.Element {
    const { request, resolve } = props;
    // State, not a ref: the dialog renders its content through a portal, after its own first commit - an effect
    // reading a ref would find nothing there and never run again
    const [box, setBox] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!box) {
            return undefined;
        }
        box.appendChild(request.element);
        const onClose = (event: Event): void => resolve((event as CustomEvent).detail ?? null);
        box.addEventListener(DIALOG_CLOSE_EVENT, onClose);
        return () => {
            box.removeEventListener(DIALOG_CLOSE_EVENT, onClose);
            request.element.remove();
        };
    }, [box, request, resolve]);

    return (
        <Dialog
            open
            onClose={() => resolve(null)}
            maxWidth={false}
            slotProps={{ paper: { style: paperStyle(request) } }}
        >
            <Title
                title={request.title}
                onClose={() => resolve(null)}
            />
            <DialogContent>
                <div
                    ref={setBox}
                    style={{ height: request.height ? `min(${request.height}px, calc(100vh - 160px))` : undefined }}
                />
            </DialogContent>
        </Dialog>
    );
}

/**
 * A JS expression of JSON-Config over `data`
 *
 * @param expression e.g. `!data.on`
 * @param data the values of the form
 */
function evaluate(expression: string | undefined, data: Record<string, unknown>): boolean {
    if (!expression) {
        return false;
    }
    try {
        // eslint-disable-next-line no-new-func
        return !!new Function('data', `return ${expression};`)(data);
    } catch {
        return false;
    }
}

interface FieldProps {
    name: string;
    setting: WebComponentSetting;
    value: unknown;
    disabled: boolean;
    onChange: (value: unknown) => void;
    socket: Connection;
    theme: IobTheme;
}

/** One field of a form: the types every host of the contract can show */
function FormField(props: FieldProps): React.JSX.Element | null {
    const { name, setting, value, disabled, onChange } = props;
    const label = text(setting.label);
    const help = setting.help ? text(setting.help) : undefined;
    const [selectId, setSelectId] = useState(false);
    const [instances, setInstances] = useState<string[] | null>(null);

    useEffect(() => {
        if (setting.type === 'instance' && !instances) {
            props.socket
                .getAdapterInstances(setting.adapter || '')
                .then(list => setInstances(list.map(obj => obj._id.replace(/^system\.adapter\./, ''))))
                .catch(() => setInstances([]));
        }
    }, [setting.type, setting.adapter, instances, props.socket]);

    switch (setting.type) {
        case 'header':
            return <Typography sx={{ fontWeight: 'bold', mt: 1 }}>{text(setting.text ?? setting.label)}</Typography>;
        case 'staticText':
            return <Typography variant="body2">{text(setting.text ?? setting.label)}</Typography>;
        case 'divider':
            return <Divider />;
        case 'checkbox':
            return (
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={value === true}
                            disabled={disabled}
                            onChange={e => onChange(e.target.checked)}
                        />
                    }
                    label={label}
                />
            );
        case 'slider':
            return (
                <div>
                    <Typography variant="caption">{label}</Typography>
                    <Slider
                        value={typeof value === 'number' ? value : Number(value) || setting.min || 0}
                        min={setting.min ?? 0}
                        max={setting.max ?? 100}
                        step={setting.step ?? 1}
                        disabled={disabled}
                        valueLabelDisplay="auto"
                        onChange={(_e, newValue) => onChange(newValue)}
                    />
                </div>
            );
        case 'select':
        case 'instance': {
            const options =
                setting.type === 'select'
                    ? (setting.options || []).map(option => ({
                          value: String(option.value),
                          label: text(option.label),
                      }))
                    : (instances || []).map(instance => ({ value: instance, label: instance }));
            return (
                <TextField
                    select
                    variant="standard"
                    fullWidth
                    label={label}
                    helperText={help}
                    disabled={disabled}
                    value={asText(value)}
                    onChange={e => {
                        const option = (setting.options || []).find(o => String(o.value) === e.target.value);
                        onChange(option ? option.value : e.target.value);
                    }}
                >
                    {options.map(option => (
                        <MenuItem
                            key={option.value}
                            value={option.value}
                        >
                            {option.label}
                        </MenuItem>
                    ))}
                </TextField>
            );
        }
        case 'objectId':
            return (
                <>
                    <TextField
                        variant="standard"
                        fullWidth
                        label={label}
                        helperText={help}
                        disabled={disabled}
                        value={typeof value === 'string' ? value : ''}
                        onChange={e => onChange(e.target.value)}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <Button
                                        size="small"
                                        style={{ minWidth: 30 }}
                                        disabled={disabled}
                                        onClick={() => setSelectId(true)}
                                    >
                                        ...
                                    </Button>
                                ),
                            },
                        }}
                    />
                    {selectId ? (
                        <SelectID
                            imagePrefix="../"
                            theme={props.theme}
                            socket={props.socket}
                            selected={typeof value === 'string' ? value : ''}
                            types={setting.types}
                            root={setting.root}
                            onOk={selected => onChange(Array.isArray(selected) ? selected[0] : selected)}
                            onClose={() => setSelectId(false)}
                        />
                    ) : null}
                </>
            );
        default: {
            // text, password, number, color
            const type = setting.type === 'password' || setting.type === 'number' ? setting.type : 'text';
            return (
                <TextField
                    variant="standard"
                    fullWidth
                    name={name}
                    type={setting.type === 'color' ? 'text' : type}
                    label={label}
                    helperText={help}
                    disabled={disabled}
                    multiline={setting.type === 'text' && (setting.minRows || 1) > 1}
                    minRows={setting.minRows}
                    value={asText(value)}
                    slotProps={{
                        htmlInput: { min: setting.min, max: setting.max, step: setting.step },
                        input:
                            setting.type === 'color'
                                ? {
                                      startAdornment: (
                                          <input
                                              type="color"
                                              value={/^#[0-9a-f]{6}$/i.test(asText(value)) ? asText(value) : '#000000'}
                                              disabled={disabled}
                                              onChange={e => onChange(e.target.value)}
                                              style={{ border: 0, padding: 0, width: 28, height: 24, marginRight: 8 }}
                                          />
                                      ),
                                  }
                                : undefined,
                    }}
                    onChange={e => onChange(e.target.value)}
                />
            );
        }
    }
}

/** A form vis-2 renders from a JSON-Config panel; the base class of the component types the values */
function FormDialog(props: {
    request: WebComponentFormDialog;
    resolve: (result: unknown) => void;
    socket: Connection;
    theme: IobTheme;
}): React.JSX.Element {
    const { request, resolve } = props;
    const items = request.form.items || {};
    // the values to start with: what the component hands over, else the defaults
    const [data, setData] = useState(() => {
        const values: Record<string, unknown> = {};
        for (const [name, setting] of Object.entries(items)) {
            if (!DECORATION_TYPES.includes(setting.type)) {
                values[name] = request.data?.[name] ?? setting.default;
            }
        }
        return values;
    });

    return (
        <Dialog
            open
            onClose={() => resolve(null)}
            maxWidth={false}
            slotProps={{ paper: { style: { ...paperStyle(request), width: paperStyle(request).width || 420 } } }}
        >
            <Title
                title={request.title}
                onClose={() => resolve(null)}
            />
            <form
                onSubmit={e => {
                    e.preventDefault();
                    resolve(data);
                }}
            >
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {Object.entries(items).map(([name, setting]) =>
                        evaluate(setting.hidden, data) ? null : (
                            <FormField
                                key={name}
                                name={name}
                                setting={setting}
                                value={data[name]}
                                disabled={evaluate(setting.disabled, data)}
                                onChange={value => setData({ ...data, [name]: value })}
                                socket={props.socket}
                                theme={props.theme}
                            />
                        ),
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        type="submit"
                    >
                        {request.ok ? text(request.ok) : I18n.t('Ok')}
                    </Button>
                    <Button
                        variant="contained"
                        color="grey"
                        onClick={() => resolve(null)}
                    >
                        {request.cancel ? text(request.cancel) : I18n.t('Cancel')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

/** All open dialogs of one widget, the last one on top */
export default function WebComponentDialogs(props: WebComponentDialogsProps): React.JSX.Element {
    return (
        <>
            {props.dialogs.map(dialog =>
                isFormDialog(dialog.request) ? (
                    <FormDialog
                        key={dialog.id}
                        request={dialog.request}
                        resolve={dialog.resolve}
                        socket={props.socket}
                        theme={props.theme}
                    />
                ) : (
                    <ElementDialog
                        key={dialog.id}
                        request={dialog.request}
                        resolve={dialog.resolve}
                    />
                ),
            )}
        </>
    );
}
