import React from 'react';

import { Close as CloseIcon } from '@mui/icons-material';
import { Dialog, IconButton } from '@mui/material';

export interface CardDialogProps {
    /** How wide the card is drawn, in px */
    width: number;
    /** How high it is drawn: a number of pixels, or `auto` for a card that only needs its rows */
    height: number | string;
    /** The card itself, as the device draws it in a section */
    children: React.ReactNode;
    onClose: () => void;
}

/**
 * The card of a device behind a click on its marker.
 *
 * A marker on a floor plan is the size of a coin - it says what a device is doing and has no room to be
 * operated. A blind cannot be pulled there, and a thermostat cannot be turned; so the click opens the very
 * card this device shows in a section, with its slider, its buttons and everything else, over the plan.
 *
 * @param props - how large the card is drawn, and the card
 */
export default function CardDialog(props: CardDialogProps): React.JSX.Element {
    return (
        <Dialog
            open
            onClose={props.onClose}
            slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'visible' } } }}
        >
            <IconButton
                size="small"
                onClick={props.onClose}
                sx={{ position: 'absolute', right: 4, top: 4, zIndex: 1 }}
            >
                <CloseIcon fontSize="small" />
            </IconButton>
            <div
                style={{
                    width: props.width,
                    height: props.height,
                    maxWidth: '90vw',
                    maxHeight: '80vh',
                    padding: 12,
                    boxSizing: 'content-box',
                }}
            >
                {props.children}
            </div>
        </Dialog>
    );
}
