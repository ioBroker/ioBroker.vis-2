import React, { useEffect, useState } from 'react';

import { Button, InputAdornment, MenuItem, Select, TextField } from '@mui/material';

import { I18n, SelectID, type Connection } from '@iobroker/gui-components';
import type { VisStateCondition, VisTheme } from '@iobroker/types-vis-2';

import commonStyles from '@/Utilities/styles';
import { conditionNeedsValue } from '@/Vis/visConditions';

import {
    getConditionValueKind,
    getOfferedConditions,
    parseConditionValue,
    type ConditionValueKind,
} from './conditionValue';

/**
 * The inputs of a condition on a state - the ID, how it is compared, and with what - as the attributes of a section
 * use them for its visibility and for its opening. The value is offered the way the state has it, see
 * conditionValue.ts.
 */

/** The objects asked for so far; the editor asks for the same few ones again and again while a section is edited */
const objectCache: Record<string, Promise<ioBroker.Object | null>> = {};

/** The object of a state, loaded once */
export function useStateObject(socket: Connection, oid: string | null | undefined): ioBroker.Object | null {
    const [object, setObject] = useState<ioBroker.Object | null>(null);
    useEffect(() => {
        let alive = true;
        setObject(null);
        const id = typeof oid === 'string' ? oid.trim() : '';
        if (id) {
            objectCache[id] ||= socket
                .getObject(id)
                .then(obj => obj || null)
                .catch(() => null);
            void objectCache[id].then(obj => alive && setObject(obj));
        }
        return () => {
            alive = false;
        };
    }, [oid]);
    return object;
}

/** The kind of value of the state, see getConditionValueKind() */
export function useConditionValueKind(socket: Connection, oid: string | null | undefined): ConditionValueKind {
    return getConditionValueKind(useStateObject(socket, oid));
}

/** The name of an object in the language of the editor */
function getObjectName(object: ioBroker.Object | null): string {
    const name = object?.common?.name;
    if (!name) {
        return '';
    }
    return typeof name === 'object' ? name[I18n.getLanguage()] || name.en || '' : name;
}

const CONDITION_LABELS: Record<VisStateCondition, string> = {
    '==': 'equal',
    '!=': 'not equal',
    '<': 'less',
    '<=': 'less or equal',
    '>': 'greater',
    '>=': 'greater or equal',
    consist: 'contains',
    'not consist': 'does not contain',
    exist: 'has a value',
    'not exist': 'has no value',
};

interface StateIdFieldProps {
    value: string | null | undefined;
    socket: Connection;
    theme: VisTheme;
    disabled: boolean;
    /** a new ID; `picked` when it was chosen in the dialog and not typed */
    onChange: (oid: string | null, picked: boolean) => void;
}

/** The ID of the state, typed or picked in the object browser, with the name of its object below */
export function StateIdField(props: StateIdFieldProps): React.JSX.Element {
    const [dialog, setDialog] = useState(false);
    const object = useStateObject(props.socket, props.value);

    return (
        <>
            <TextField
                variant="standard"
                fullWidth
                disabled={props.disabled}
                value={props.value || ''}
                onChange={e => props.onChange(e.target.value || null, false)}
                sx={{ '& .MuiInputBase-root': { ...commonStyles.clearPadding, ...commonStyles.fieldContent } }}
                slotProps={{
                    input: {
                        endAdornment: (
                            <Button
                                tabIndex={-1}
                                style={{ minWidth: 30 }}
                                disabled={props.disabled}
                                size="small"
                                onClick={() => setDialog(true)}
                            >
                                ...
                            </Button>
                        ),
                    },
                }}
            />
            {object ? (
                <div style={{ ...commonStyles.fieldContent, fontStyle: 'italic' }}>{getObjectName(object)}</div>
            ) : null}
            {dialog ? (
                <SelectID
                    imagePrefix="../"
                    theme={props.theme}
                    selected={props.value || ''}
                    socket={props.socket}
                    types={['state']}
                    onOk={selected => {
                        const oid = Array.isArray(selected) ? selected[0] : selected;
                        props.onChange(oid || null, true);
                    }}
                    onClose={() => setDialog(false)}
                />
            ) : null}
        </>
    );
}

interface ConditionSelectProps {
    oid: string | null | undefined;
    value: VisStateCondition | null | undefined;
    socket: Connection;
    disabled: boolean;
    onChange: (condition: VisStateCondition) => void;
}

/** How the value is compared: only the conditions that make sense for the state, e.g. = and ≠ for a boolean */
export function ConditionSelect(props: ConditionSelectProps): React.JSX.Element {
    const valueKind = useConditionValueKind(props.socket, props.oid);
    const conditions = getOfferedConditions(valueKind.kind, props.value);
    const value = props.value && conditions.includes(props.value) ? props.value : '==';

    return (
        <Select
            variant="standard"
            fullWidth
            disabled={props.disabled}
            value={value}
            onChange={e => props.onChange(e.target.value)}
            sx={{
                ...commonStyles.clearPadding,
                '& .MuiSelect-select': { ...commonStyles.clearPadding, ...commonStyles.fieldContent },
            }}
        >
            {conditions.map(condition => (
                <MenuItem
                    key={condition}
                    value={condition}
                >
                    {conditionNeedsValue(condition)
                        ? `${condition}  ${I18n.t(CONDITION_LABELS[condition])}`
                        : I18n.t(CONDITION_LABELS[condition])}
                </MenuItem>
            ))}
        </Select>
    );
}

interface ConditionValueFieldProps {
    oid: string | null | undefined;
    value: string | number | boolean | null | undefined;
    socket: Connection;
    disabled: boolean;
    onChange: (value: string | number | boolean | null) => void;
}

/** What the state is compared with, in the input that fits the state: a choice, a number or a text */
export function ConditionValueField(props: ConditionValueFieldProps): React.JSX.Element {
    const valueKind = useConditionValueKind(props.socket, props.oid);
    const selectSx = {
        ...commonStyles.clearPadding,
        '& .MuiSelect-select': { ...commonStyles.clearPadding, ...commonStyles.fieldContent },
    };

    if (valueKind.kind === 'boolean') {
        const value = props.value === true || props.value === 'true' || props.value === 1 || props.value === '1';
        return (
            <Select
                variant="standard"
                fullWidth
                disabled={props.disabled}
                value={props.value === null || props.value === undefined ? '' : value ? 'true' : 'false'}
                onChange={e => props.onChange(e.target.value === 'true')}
                sx={selectSx}
            >
                <MenuItem value="true">true</MenuItem>
                <MenuItem value="false">false</MenuItem>
            </Select>
        );
    }

    if (valueKind.kind === 'states' && valueKind.states) {
        const states = valueKind.states;
        // the stored value may be a string of the number the state has, or the other way round
        const index = states.findIndex(state => String(state.value) === String(props.value));
        return (
            <Select
                variant="standard"
                fullWidth
                disabled={props.disabled}
                value={index === -1 ? '' : index.toString()}
                onChange={e => props.onChange(states[parseInt(e.target.value, 10)]?.value ?? null)}
                sx={selectSx}
            >
                {states.map((state, i) => (
                    <MenuItem
                        key={i}
                        value={i.toString()}
                    >
                        {state.label === String(state.value) ? state.label : `${state.label} (${String(state.value)})`}
                    </MenuItem>
                ))}
            </Select>
        );
    }

    return (
        <TextField
            variant="standard"
            fullWidth
            disabled={props.disabled}
            value={props.value === null || props.value === undefined ? '' : String(props.value)}
            type={valueKind.kind === 'number' ? 'number' : 'text'}
            onChange={e => props.onChange(parseConditionValue(e.target.value, valueKind.kind))}
            sx={{ '& .MuiInputBase-root': { ...commonStyles.clearPadding, ...commonStyles.fieldContent } }}
            slotProps={{
                input: {
                    endAdornment: valueKind.unit ? (
                        <InputAdornment position="end">{valueKind.unit}</InputAdornment>
                    ) : undefined,
                },
                htmlInput: {
                    min: valueKind.min,
                    max: valueKind.max,
                    step: valueKind.step ?? 'any',
                },
            }}
        />
    );
}
