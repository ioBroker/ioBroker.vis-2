import React from 'react';

import { Slider } from '@mui/material';

export interface FatSliderProps {
    value: number;
    min: number;
    max: number;
    step?: number;
    disabled?: boolean;
    /** The colour of the part that is filled and of the knob */
    color: string;
    /** Called while the knob is dragged, so the widget can follow along */
    onChange?: (value: number) => void;
    /** Called once, when the knob is let go */
    onChangeCommitted: (value: number) => void;
}

/**
 * The slider of these widget sets: a rail you can hit and a knob you can grab.
 *
 * MUI's small slider is four pixels of rail and a twelve pixel knob - fine beside a menu, too little on a wall
 * tablet, where the thing is operated with a thumb. This one is a ten pixel rail with a twenty pixel knob, and
 * the filled part carries the colour of the device, so the slider says the same thing as the rest of the card.
 *
 * @param props - where it stands, what it may be, and what to do when it is moved
 */
export default function FatSlider(props: FatSliderProps): React.JSX.Element {
    return (
        <Slider
            value={props.value}
            min={props.min}
            max={props.max}
            step={props.step}
            disabled={props.disabled}
            onChange={(_e, value) => props.onChange?.(value)}
            onChangeCommitted={(_e, value) => props.onChangeCommitted(value)}
            sx={{
                width: '100%',
                height: 10,
                padding: '13px 0',
                color: props.color,
                '& .MuiSlider-rail': {
                    height: 10,
                    borderRadius: 5,
                    opacity: 0.35,
                    backgroundColor: 'text.disabled',
                },
                '& .MuiSlider-track': {
                    height: 10,
                    border: 'none',
                    borderRadius: 5,
                },
                '& .MuiSlider-thumb': {
                    width: 20,
                    height: 20,
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.4)',
                    '&::before': { boxShadow: 'none' },
                    // the halo of MUI sits under the finger on a touch screen and hides the knob
                    '&:hover, &.Mui-focusVisible': { boxShadow: '0 0 0 8px rgba(0, 0, 0, 0.08)' },
                    '&.Mui-active': { boxShadow: '0 0 0 12px rgba(0, 0, 0, 0.12)' },
                },
            }}
        />
    );
}
