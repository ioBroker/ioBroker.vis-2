import React from 'react';

import { KeyboardArrowUp, KeyboardArrowDown, StopOutlined } from '@mui/icons-material';

import type { VisTheme } from '@iobroker/types-vis-2';

export interface BlindButtonsProps {
    theme: VisTheme;
    disabled?: boolean;
    onUp: () => void;
    onStop?: () => void;
    onDown: () => void;
}

/**
 * Up, stop and down, stacked beside the window of a blind.
 *
 * Three square buttons in a column, as `ioBroker.aura` has them: a slider is for a position, these are for the
 * two ends, which is what a blind is asked for most of the time. Stop is left out when the device has no state
 * for it, and the column then holds two buttons.
 *
 * @param props - what to do, and in which theme to draw it
 */
export default function BlindButtons(props: BlindButtonsProps): React.JSX.Element {
    const { theme } = props;

    const button = (title: string, icon: React.ReactNode, onClick: () => void): React.JSX.Element => (
        <button
            type="button"
            title={title}
            disabled={props.disabled}
            onClick={e => {
                e.stopPropagation();
                onClick();
            }}
            style={{
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                borderRadius: 8,
                border: `1px solid ${theme.palette.divider}`,
                background: theme.palette.background.default,
                color: theme.palette.text.secondary,
                cursor: props.disabled ? 'default' : 'pointer',
                opacity: props.disabled ? 0.5 : 1,
                // the house interaction of these sets: no colour shift, the button gives way under the finger
                transition: 'opacity 0.15s, transform 0.1s',
            }}
            onPointerDown={e => {
                e.stopPropagation();
                e.currentTarget.style.transform = 'scale(0.94)';
            }}
            onPointerUp={e => (e.currentTarget.style.transform = '')}
            onPointerLeave={e => (e.currentTarget.style.transform = '')}
        >
            {icon}
        </button>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%' }}>
            {button('▲', <KeyboardArrowUp fontSize="small" />, props.onUp)}
            {props.onStop ? button('■', <StopOutlined fontSize="small" />, props.onStop) : null}
            {button('▼', <KeyboardArrowDown fontSize="small" />, props.onDown)}
        </div>
    );
}
