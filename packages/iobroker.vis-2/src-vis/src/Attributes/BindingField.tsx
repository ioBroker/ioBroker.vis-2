import React, { useRef, useState } from 'react';

import { Button, IconButton, TextField } from '@mui/material';
import { Clear as ClearIcon } from '@mui/icons-material';

import { SelectID, type Connection } from '@iobroker/gui-components';
import type { VisTheme } from '@iobroker/types-vis-2';

import commonStyles from '@/Utilities/styles';

interface BindingFieldProps {
    value: string | number | boolean | null | undefined;
    disabled: boolean;
    socket: Connection;
    theme: VisTheme;
    onChange: (value: string | null) => void;
}

/**
 * An attribute that is edited as a binding: the text with the bindings in it, like `{javascript.0.temp}°C`, and a
 * button that puts the ID of a state in at the place of the cursor. What it says at this moment is seen in the view
 * itself, which evaluates the bindings of a section as it renders it, see visSections.ts.
 */
export default function BindingField(props: BindingFieldProps): React.JSX.Element {
    const [dialog, setDialog] = useState(false);
    const input = useRef<HTMLInputElement>(null);
    const value = props.value === null || props.value === undefined ? '' : String(props.value);

    /** Puts the ID where the cursor was, so that it can be written into a text - and not only alone */
    const insertId = (id: string): void => {
        const at = input.current?.selectionStart ?? value.length;
        props.onChange(`${value.substring(0, at)}{${id}}${value.substring(at)}`);
    };

    return (
        <>
            <TextField
                variant="standard"
                fullWidth
                disabled={props.disabled}
                value={value}
                inputRef={input}
                onChange={e => props.onChange(e.target.value || null)}
                sx={{ '& .MuiInputBase-root': { ...commonStyles.clearPadding, ...commonStyles.fieldContent } }}
                slotProps={{
                    input: {
                        endAdornment: (
                            <>
                                <Button
                                    tabIndex={-1}
                                    style={{ minWidth: 30 }}
                                    disabled={props.disabled}
                                    size="small"
                                    onClick={() => setDialog(true)}
                                >
                                    ...
                                </Button>
                                {value ? (
                                    <IconButton
                                        size="small"
                                        disabled={props.disabled}
                                        onClick={() => props.onChange(null)}
                                    >
                                        <ClearIcon />
                                    </IconButton>
                                ) : null}
                            </>
                        ),
                    },
                }}
            />
            {dialog ? (
                <SelectID
                    imagePrefix="../"
                    theme={props.theme}
                    socket={props.socket}
                    types={['state']}
                    onOk={selected => {
                        const id = Array.isArray(selected) ? selected[0] : selected;
                        if (id) {
                            insertId(id);
                        }
                    }}
                    onClose={() => setDialog(false)}
                />
            ) : null}
        </>
    );
}
