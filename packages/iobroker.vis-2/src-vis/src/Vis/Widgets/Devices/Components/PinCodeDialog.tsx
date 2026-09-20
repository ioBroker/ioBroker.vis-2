import React, { useState } from 'react';
import { Button, Dialog, DialogContent, DialogTitle, TextField } from '@mui/material';
import Generic from '../Generic';
import { Backspace, Check } from '@mui/icons-material';

export default function PinCodeDialog(props: {
    pinCode: string;
    pinCodeReturnButton?: 'backspace' | 'submit';
    onClose: (result?: boolean) => void;
}): React.JSX.Element {
    const [pinCode, setPinCode] = useState('');
    const [invalidPin, setInvalidPin] = useState(false);

    return (
        <Dialog
            open={!0}
            onClose={() => props.onClose()}
        >
            <DialogTitle>{Generic.t('enter_pin')}</DialogTitle>
            <DialogContent>
                <div
                    style={{
                        padding: '10px 0px',
                    }}
                >
                    <TextField
                        variant="outlined"
                        fullWidth
                        type={invalidPin ? 'text' : 'password'}
                        slotProps={{
                            input: {
                                readOnly: true,
                                style: {
                                    textAlign: 'center',
                                    color: invalidPin ? '#ff3e3e' : 'inherit',
                                },
                            },
                        }}
                        value={invalidPin ? Generic.t('invalid_pin') : pinCode}
                    />
                </div>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gridGap: '10px',
                    }}
                >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'R', 0, props.pinCodeReturnButton].map(button => {
                        let buttonTitle: React.ReactNode = button;
                        if (button === 'backspace') {
                            buttonTitle = <Backspace />;
                        } else if (button === 'submit') {
                            buttonTitle = <Check />;
                        }
                        return (
                            <Button
                                variant="outlined"
                                key={button}
                                title={
                                    button === 'R'
                                        ? pinCode
                                            ? Generic.t('reset')
                                            : Generic.t('close')
                                        : button === props.pinCodeReturnButton
                                          ? 'enter'
                                          : ''
                                }
                                onClick={() => {
                                    if (button === 'submit') {
                                        if (pinCode === props.pinCode) {
                                            props.onClose(true);
                                        } else {
                                            setInvalidPin(true);
                                            setPinCode('');
                                            setTimeout(() => setInvalidPin(false), 500);
                                        }
                                    } else if (button === 'backspace') {
                                        setPinCode(pinCode.slice(0, -1));
                                    } else if (button === 'R') {
                                        if (!pinCode) {
                                            props.onClose();
                                        } else {
                                            setPinCode('');
                                        }
                                    } else {
                                        const pinInput = pinCode + button;
                                        setPinCode(pinInput);
                                        if (props.pinCodeReturnButton === 'backspace' && pinInput === pinCode) {
                                            props.onClose(true);
                                        }
                                    }
                                }}
                            >
                                {buttonTitle === 'R' ? (pinCode ? 'R' : 'x') : buttonTitle}
                            </Button>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
}
