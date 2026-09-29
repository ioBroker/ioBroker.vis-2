import React from 'react';

import { Backspace as BackIcon, Check as OkIcon } from '@mui/icons-material';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, useTheme } from '@mui/material';

export interface ConfirmDialogProps {
    /** What is being asked; without it the widget sets ask their own general question */
    text?: string;
    /** The PIN that has to be typed; without one the question is answered with a button */
    pin?: string;
    t: (word: string, ...args: (string | number)[]) => string;
    /** Called with whether it may happen */
    onClose: (confirmed: boolean) => void;
}

/** The keys of the pad, in the order a telephone has them */
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** How long the last digit is left standing before the answer is given, in ms */
const LAST_DIGIT_MS = 140;

/**
 * The question before something is switched.
 *
 * A dashboard hangs where everyone walks past it, and not everything on it should happen because someone
 * brushed the screen: the heating, the gate, the pump. This asks first, and where a PIN is set it asks for
 * that instead - the same idea, one step stronger, and one that a child does not get past.
 *
 * The PIN is typed on a pad of its own rather than into a field. A field on a tablet means the keyboard of
 * the system slides up over half the screen, with letters on it, for four digits - and on a wall panel in
 * kiosk mode there may be no keyboard at all. The pad is always there, its keys are the size of a thumb, and
 * the dots above it say how far the PIN has got without showing it. A hardware keyboard still works: the
 * digits, backspace and enter do what they say.
 *
 * The PIN is kept in the project and is therefore no secret in the cryptographic sense. It is a lock on a
 * cupboard door, not a safe, and it is worth exactly that: it stops the wrong hand, not the wrong person.
 *
 * @param props - what to ask, which PIN answers it, and where the answer goes
 */
export default function ConfirmDialog(props: ConfirmDialogProps): React.JSX.Element {
    const theme = useTheme();
    const [typed, setTyped] = React.useState('');
    const [wrong, setWrong] = React.useState(false);
    const withPin = !!props.pin;
    const length = props.pin?.length || 4;

    // the answer of a full PIN is given a moment later, so the last dot is seen before the dialog goes
    const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    React.useEffect(
        () => () => {
            if (timer.current) {
                clearTimeout(timer.current);
            }
        },
        [],
    );

    /** Is this the PIN? A wrong one is cleared and said so, rather than left standing to be corrected */
    const answer = (attempt: string): void => {
        if (!withPin || attempt === props.pin) {
            props.onClose(true);
        } else {
            setTyped('');
            setWrong(true);
        }
    };

    const press = (digit: string): void => {
        if (timer.current) {
            return;
        }
        setWrong(false);
        const next = typed.length >= length ? digit : typed + digit;
        setTyped(next);
        if (next.length >= length) {
            timer.current = setTimeout(() => {
                timer.current = null;
                answer(next);
            }, LAST_DIGIT_MS);
        }
    };

    const back = (): void => {
        setWrong(false);
        setTyped(typed.slice(0, -1));
    };

    // a keyboard, where there is one, does what it says on it
    React.useEffect(() => {
        if (!withPin) {
            return;
        }
        const onKey = (event: KeyboardEvent): void => {
            if (event.key >= '0' && event.key <= '9') {
                press(event.key);
            } else if (event.key === 'Backspace') {
                back();
            } else if (event.key === 'Enter') {
                answer(typed);
            } else if (event.key === 'Escape') {
                props.onClose(false);
            } else {
                return;
            }
            event.preventDefault();
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    });

    /** One key of the pad; they are all the same size, whatever is on them */
    const key = (
        content: React.ReactNode,
        onClick: () => void,
        name: string,
        disabled?: boolean,
    ): React.JSX.Element => (
        <Button
            key={name}
            variant="outlined"
            color="grey"
            disabled={disabled}
            onClick={onClick}
            sx={{
                // a key of a pad is a target for a thumb, not for a mouse pointer
                height: 'min(16vh, 72px)',
                minWidth: 0,
                fontSize: 'min(4.5vh, 24px)',
                fontWeight: 500,
                borderRadius: 2,
                color: 'text.primary',
                borderColor: 'divider',
                '&:hover': { borderColor: 'text.secondary', backgroundColor: 'action.hover' },
            }}
        >
            {content}
        </Button>
    );

    const pad = (
        <>
            {/* how far the PIN has got: one dot per digit of it, filled as they are typed */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '12px',
                    height: 36,
                    mb: 1,
                    // a PIN that was not the PIN says so by shaking its head
                    animation: wrong ? 'vis-standard-shake 0.4s' : undefined,
                }}
            >
                {Array.from({ length }, (_unused, index) => (
                    <Box
                        key={index}
                        sx={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            border: `2px solid ${wrong ? theme.palette.error.main : theme.palette.text.secondary}`,
                            backgroundColor:
                                index < typed.length
                                    ? wrong
                                        ? theme.palette.error.main
                                        : theme.palette.primary.main
                                    : 'transparent',
                            transition: 'background-color 0.15s',
                        }}
                    />
                ))}
            </Box>
            <Box
                sx={{
                    color: wrong ? 'error.main' : 'text.secondary',
                    textAlign: 'center',
                    fontSize: 13,
                    height: 20,
                    mb: 1,
                }}
            >
                {wrong ? props.t('pin_wrong') : props.t('pin')}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {DIGITS.map(digit => key(digit, () => press(digit), digit))}
                {key(<BackIcon />, back, 'back', !typed)}
                {key('0', () => press('0'), '0')}
                {key(<OkIcon />, () => answer(typed), 'ok', !typed)}
            </Box>
        </>
    );

    return (
        <Dialog
            open
            maxWidth="xs"
            fullWidth
            onClose={() => props.onClose(false)}
        >
            <DialogTitle sx={{ textAlign: withPin ? 'center' : undefined }}>
                {props.text || props.t('confirm_question')}
            </DialogTitle>
            {withPin ? <DialogContent>{pad}</DialogContent> : null}
            <DialogActions>
                {withPin ? null : (
                    <Button
                        variant="contained"
                        onClick={() => answer('')}
                    >
                        {props.t('ok')}
                    </Button>
                )}
                <Button
                    variant="outlined"
                    color="grey"
                    fullWidth={withPin}
                    onClick={() => props.onClose(false)}
                >
                    {props.t('cancel')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
