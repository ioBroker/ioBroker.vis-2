import React from 'react';

import { Autocomplete, TextField, Typography } from '@mui/material';

import { I18n, type Connection } from '@iobroker/gui-components';

import { tableCell, tableColumns, tableRows } from './tableRows';

export interface ColumnKeyFieldProps {
    /** The key that is set at the moment */
    value: string;
    /** The state the table reads its rows from; without it there is nothing to offer */
    oid: string | undefined;
    socket: Connection;
    label: string;
    onChange: (value: string) => void;
}

/** A key the data has, with the first value found under it - `temp` alone says less than `temp · 21,4` */
interface Suggestion {
    key: string;
    sample: string;
}

/**
 * The key of a column, offered out of what the state actually holds.
 *
 * Typing `linie` by hand means reading the JSON somewhere else first and getting the spelling right at the
 * second attempt. The state is right there, so it is read once and its keys are offered - with the first
 * value found under each, because `temp` alone says less than `temp · 21,4` when the data has `temp` and
 * `temp_soll`.
 *
 * It stays a text field underneath (`freeSolo`): a key that is not in the data yet - because the adapter has
 * not filled the state since the last restart - must still be typeable.
 *
 * @param props - the key, the state to read, and what to do with the result
 */
export default function ColumnKeyField(props: ColumnKeyFieldProps): React.JSX.Element {
    const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
    const { oid, socket } = props;

    React.useEffect(() => {
        let dropped = false;
        if (!oid) {
            setSuggestions([]);
            return undefined;
        }

        void socket
            .getState(oid)
            .then(state => {
                if (dropped) {
                    return;
                }
                const rows = tableRows(state?.val);
                setSuggestions(
                    tableColumns(rows).map(key => ({
                        key,
                        // the first row that has anything under this key; a row may leave it out
                        sample: tableCell(
                            rows.find(row => row[key] !== undefined && row[key] !== null)?.[key],
                            true,
                        ).slice(0, 24),
                    })),
                );
            })
            .catch(() => !dropped && setSuggestions([]));

        return () => {
            dropped = true;
        };
    }, [oid, socket]);

    return (
        <Autocomplete
            freeSolo
            fullWidth
            size="small"
            options={suggestions}
            getOptionLabel={option => (typeof option === 'string' ? option : option.key)}
            filterOptions={(options, state) => {
                const written = state.inputValue.trim().toLowerCase();
                return written ? options.filter(one => one.key.toLowerCase().includes(written)) : options;
            }}
            // the list opens on a click as well, so the keys can be browsed without typing anything
            value={props.value || ''}
            onInputChange={(_e, written) => props.onChange(written)}
            renderOption={(optionProps, option) => (
                <li {...optionProps}>
                    <span style={{ fontWeight: 600 }}>{option.key}</span>
                    {option.sample ? (
                        <Typography
                            component="span"
                            variant="body2"
                            sx={{ opacity: 0.6, marginLeft: 1 }}
                        >
                            · {option.sample}
                        </Typography>
                    ) : null}
                </li>
            )}
            renderInput={params => (
                <TextField
                    {...params}
                    variant="standard"
                    label={props.label}
                    placeholder={
                        oid
                            ? suggestions.length
                                ? undefined
                                : I18n.t('the state holds no rows at the moment')
                            : I18n.t('pick the state first')
                    }
                />
            )}
        />
    );
}
