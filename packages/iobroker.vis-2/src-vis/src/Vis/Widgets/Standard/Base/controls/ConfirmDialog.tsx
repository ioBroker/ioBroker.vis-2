import React from 'react';

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';

export interface ConfirmDialogProps {
    /** What is being asked; without it the widget sets ask their own general question */
    text?: string;
    /** The PIN that has to be typed; without one the question is answered with a button */
    pin?: string;
    t: (word: string, ...args: (string | number)[]) => string;
    /** Called with whether it may happen */
    onClose: (confirmed: boolean) => void;
}

/**
 * The question before something is switched.
 *
 * A dashboard hangs where everyone walks past it, and not everything on it should happen because someone
 * brushed the screen: the heating, the gate, the pump. This asks first, and where a PIN is set it asks for
 * that instead - the same idea, one step stronger, and one that a child does not get past.
 *
 * The PIN is kept in the project and is therefore no secret in the cryptographic sense. It is a lock on a
 * cupboard door, not a safe, and it is worth exactly that: it stops the wrong hand, not the wrong person.
 *
 * @param props - what to ask, which PIN answers it, and where the answer goes
 */
export default function ConfirmDialog(props: ConfirmDialogProps): React.JSX.Element {
    const [typed, setTyped] = React.useState('');
    const [wrong, setWrong] = React.useState(false);
    const withPin = !!props.pin;

    const confirm = (): void => {
        if (!withPin) {
            props.onClose(true);
            return;
        }
        if (typed === props.pin) {
            props.onClose(true);
        } else {
            setTyped('');
            setWrong(true);
        }
    };

    return (
        <Dialog
            open
            maxWidth="xs"
            fullWidth
            onClose={() => props.onClose(false)}
        >
            <DialogTitle>{props.text || props.t('confirm_question')}</DialogTitle>
            {withPin ? (
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        variant="standard"
                        type="password"
                        // a PIN is digits, and a phone should offer the keypad for it
                        slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off' } }}
                        label={props.t('pin')}
                        value={typed}
                        error={wrong}
                        helperText={wrong ? props.t('pin_wrong') : ' '}
                        onChange={event => {
                            setTyped(event.target.value);
                            setWrong(false);
                        }}
                        onKeyUp={event => {
                            if (event.key === 'Enter') {
                                confirm();
                            }
                        }}
                    />
                </DialogContent>
            ) : null}
            <DialogActions>
                <Button
                    variant="contained"
                    disabled={withPin && !typed}
                    onClick={confirm}
                >
                    {props.t('ok')}
                </Button>
                <Button
                    variant="outlined"
                    color="grey"
                    onClick={() => props.onClose(false)}
                >
                    {props.t('cancel')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
