import React from 'react';

import type { VisTheme } from '@iobroker/types-vis-2';

/** One of the things a device can be set to */
export interface Mode {
    /** What is written into the state */
    value: string | number | boolean;
    /** What it is called */
    label: string;
    /** The symbol of this mode, where one is known */
    icon?: React.ReactNode;
}

export interface ModeButtonsProps {
    modes: Mode[];
    /** Which one the device is in */
    current: string | number | boolean | undefined;
    /** The colour of the one it is in */
    accent: string;
    theme: VisTheme;
    onChange: (value: string | number | boolean) => void;
    disabled?: boolean;
}

/**
 * The modes of a device as a row of buttons: heating, cooling, off, whatever the object offers.
 *
 * What the modes are is not this component's business and not the widget's either - it is the object's, in
 * `common.states`. A thermostat that knows four of them gets four buttons, one that knows two gets two, and
 * neither the widget nor the user has to keep a list of what some manufacturer calls its comfort programme.
 *
 * @param props - the modes, which one is on, and where a press goes
 */
export default function ModeButtons(props: ModeButtonsProps): React.JSX.Element | null {
    if (!props.modes.length) {
        return null;
    }

    return (
        <div
            className="vis-mode-buttons"
            style={{ display: 'flex', gap: 6, width: '100%' }}
        >
            {props.modes.map(mode => {
                const on = `${mode.value}` === `${props.current}`;
                return (
                    <button
                        key={`${mode.value}`}
                        type="button"
                        disabled={props.disabled}
                        onClick={() => props.onChange(mode.value)}
                        style={{
                            flex: 1,
                            minWidth: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                            padding: '6px 4px',
                            borderRadius: 10,
                            cursor: props.disabled ? undefined : 'pointer',
                            // the one it is in carries the colour, the others only their outline
                            border: `1px solid ${on ? props.accent : props.theme.palette.divider}`,
                            background: on ? `${props.accent}22` : 'transparent',
                            color: on ? props.accent : props.theme.palette.text.secondary,
                            font: 'inherit',
                            fontSize: 11,
                            lineHeight: 1.2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {mode.icon ? <span style={{ display: 'flex', width: 16, height: 16 }}>{mode.icon}</span> : null}
                        <span
                            style={{
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {mode.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
