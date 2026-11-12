/**
 * The field of a `selectSendTo` or `autocompleteSendTo` setting: its options come from an instance of the adapter,
 * asked with `sendTo` - in the attributes panel of the editor and in the forms vis-2 renders for a component.
 *
 * Without options - no instance to ask yet, no answer, an error, nothing in the list - it is a text field with the
 * reason below it, so the value stays editable.
 */
import React, { useEffect, useRef, useState } from 'react';

import { Autocomplete, MenuItem, TextField } from '@mui/material';

import { I18n } from '@iobroker/gui-components';
import {
    getSendToRequest,
    getText,
    type WebComponentSendToRequest,
    type WebComponentSetting,
    type WebComponentSettingOption,
} from '@iobroker/web-components';

import {
    askSendToOptions,
    autocompleteValue,
    findSendToOption,
    mergeSendToOptions,
    SEND_TO_DEBOUNCE,
    toSendToText,
    type SendToAnswer,
    type SendToSocket,
} from './webComponentSendTo';

export interface WebComponentSendToFieldProps {
    /** The setting as the manifest describes it */
    setting: WebComponentSetting;
    /** The value as vis-2 holds it */
    value: unknown;
    /** The values of all settings in their types - what the patterns of `instance` and `jsonData` read */
    data: Record<string, unknown>;
    /** The adapter that brings the component: without `instance`, `<adapter>.0` is asked */
    adapter: string;
    socket: SendToSocket;
    /** The label in the field; the attributes panel shows its own */
    label?: string;
    /** A help text below the field, where no reason has to stand */
    help?: string;
    disabled?: boolean;
    /** The value is stored as text */
    onChange: (value: string) => void;
}

/**
 * The options of the setting, asked again whenever the request changes - instance, command, message or a setting
 * in `alsoDependsOn`. A change waits {@link SEND_TO_DEBOUNCE} ms, so typing into a setting asks once.
 *
 * @param setting the setting
 * @param data the values of all settings
 * @param adapter the adapter of the component
 * @param socket the socket that asks
 */
function useSendToOptions(
    setting: WebComponentSetting,
    data: Record<string, unknown>,
    adapter: string,
    socket: SendToSocket,
): { request: WebComponentSendToRequest | null; answer: SendToAnswer | null } {
    const request = getSendToRequest(setting, data, adapter);
    const key = request?.key ?? null;
    const [answer, setAnswer] = useState<SendToAnswer | null>(null);
    // the effect runs per key only; the request and the socket of the last render are the ones asked
    const latest = useRef({ request, socket });
    latest.current = { request, socket };
    const asked = useRef(false);

    useEffect(() => {
        const current = latest.current.request;
        if (!current) {
            return undefined;
        }
        let active = true;
        // the first request goes at once; a changed one waits until the typing is over
        const timer = setTimeout(
            () => {
                asked.current = true;
                const { socket: asking } = latest.current;
                void askSendToOptions(current, (instance, command, message) =>
                    asking.sendTo(instance, command, message),
                ).then(result => active && setAnswer(result));
            },
            asked.current ? SEND_TO_DEBOUNCE : 0,
        );
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [key]);

    return { request, answer: answer && answer.key === key ? answer : null };
}

/** Why the field is a text field: the instance it would ask, filled into the text */
function getReason(
    setting: WebComponentSetting,
    request: WebComponentSendToRequest | null,
    answer: SendToAnswer | null,
): string {
    if (!request) {
        return I18n.t(setting.instance?.includes('${') ? 'wc_send_to_no_instance' : 'wc_send_to_cannot_ask');
    }
    if (!answer) {
        return I18n.t('wc_send_to_asking', request.instance);
    }
    if (!answer.options) {
        return I18n.t('wc_send_to_no_answer', request.instance);
    }
    return I18n.t('wc_send_to_no_options', request.instance);
}

export default function WebComponentSendToField(props: WebComponentSendToFieldProps): React.JSX.Element {
    const { setting, value, label, help, disabled, onChange } = props;
    const lang = I18n.getLanguage();
    const { request, answer } = useSendToOptions(setting, props.data, props.adapter, props.socket);
    // what is typed into the autocomplete, while it is typed; else the field shows the label of the value
    const [draft, setDraft] = useState<string | null>(null);

    const auto = setting.type === 'autocompleteSendTo';
    const answered = answer?.options || [];
    const options: WebComponentSettingOption[] = auto ? mergeSendToOptions(answered, setting.options) : answered;
    const current = toSendToText(value);
    const maxLength = auto && setting.maxLength && setting.maxLength > 0 ? setting.maxLength : undefined;
    const optionLabel = (option: WebComponentSettingOption): string => getText(option.label, lang);

    // nothing to choose from: a text field and why
    if (!answer?.options || !options.length) {
        return (
            <TextField
                variant="standard"
                fullWidth
                label={label}
                disabled={disabled}
                value={current}
                helperText={getReason(setting, request, answer)}
                slotProps={{ htmlInput: { maxLength } }}
                onChange={e => onChange(e.target.value)}
            />
        );
    }

    const option = findSendToOption(options, current);
    // a value the list does not have; an autocomplete with `freeSolo` takes any
    const unknown = !!current && !option && !(auto && setting.freeSolo);
    const helperText = unknown ? I18n.t('wc_send_to_not_in_list') : help;

    if (!auto) {
        return (
            <TextField
                select
                variant="standard"
                fullWidth
                label={label}
                disabled={disabled}
                value={current}
                error={unknown}
                helperText={helperText}
                onChange={e => onChange(e.target.value)}
            >
                {current ? null : <MenuItem value="">-</MenuItem>}
                {unknown ? <MenuItem value={current}>{current}</MenuItem> : null}
                {options.map(one => (
                    <MenuItem
                        key={String(one.value)}
                        value={String(one.value)}
                    >
                        {optionLabel(one)}
                    </MenuItem>
                ))}
            </TextField>
        );
    }

    return (
        <Autocomplete<WebComponentSettingOption, false, false, true>
            freeSolo
            fullWidth
            size="small"
            disabled={disabled}
            options={options}
            value={option || current || null}
            inputValue={draft ?? (option ? optionLabel(option) : current)}
            getOptionLabel={one => (typeof one === 'string' ? one : optionLabel(one))}
            isOptionEqualToValue={(one, selected) =>
                typeof selected !== 'string' && String(one.value) === String(selected.value)
            }
            onChange={(_e, selected) => {
                // an option picked, Enter pressed or the field cleared
                setDraft(null);
                if (selected === null) {
                    onChange('');
                } else {
                    onChange(
                        typeof selected === 'string'
                            ? autocompleteValue(selected, options, lang)
                            : String(selected.value),
                    );
                }
            }}
            onInputChange={(_e, text, reason) => {
                // only what is typed: a reset comes when the value changed, and must not replace the typed text
                if (reason === 'input') {
                    setDraft(text);
                    onChange(autocompleteValue(text, options, lang));
                }
            }}
            onBlur={() => setDraft(null)}
            renderOption={(optionProps, one) => {
                const { key, ...rest } = optionProps as React.HTMLAttributes<HTMLLIElement> & { key: string };
                const text = optionLabel(one);
                return (
                    <li
                        key={key}
                        {...rest}
                    >
                        {text}
                        {text !== String(one.value) ? (
                            <span style={{ opacity: 0.6, marginLeft: 8 }}>{String(one.value)}</span>
                        ) : null}
                    </li>
                );
            }}
            renderInput={params => (
                <TextField
                    {...params}
                    variant="standard"
                    label={label}
                    error={unknown}
                    helperText={helperText}
                    slotProps={{
                        ...params.slotProps,
                        htmlInput: { ...params.slotProps.htmlInput, maxLength },
                    }}
                />
            )}
        />
    );
}
