import React from 'react';

import type { VisTheme } from '@iobroker/types-vis-2';

export interface StateInputProps {
    /** What the state holds, as text */
    value: string;
    /** Whether a number or anything else is typed here */
    numeric?: boolean;
    /** Written small behind the field */
    unit?: string;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    /** A minus and a plus beside the field, for a value that is nudged rather than typed */
    withButtons?: boolean;
    /** The colour of the buttons and of the line under the field while it is being typed in */
    accent: string;
    theme: VisTheme;
    /** Called when what was typed is meant: on Enter, or when the field is left */
    onChange: (value: string) => void;
}

/** A number the field can work with, or null */
function numberOf(value: string): number | null {
    const parsed = parseFloat(value.replace(',', '.'));
    return isFinite(parsed) ? parsed : null;
}

/**
 * A field that writes what is typed into it into a state.
 *
 * The hard part of such a field is not the writing, it is the not-writing: a state changes while somebody is
 * typing into it - the adapter echoes the old value, a script corrects it, the device reports back - and a
 * field that simply shows the state loses what was half typed. So what is typed is kept here while the field
 * has the cursor, and the state is only allowed to take over again once it is let go. Nothing is written per
 * keystroke either: `6` on the way to `60` would send the heating to six degrees.
 *
 * @param props - what the state holds, what may be typed, and what to do with it
 */
export default function StateInput(props: StateInputProps): React.JSX.Element {
    const [draft, setDraft] = React.useState<string | null>(null);
    const shown = draft ?? props.value;

    /** Write what is in the field, where it is something else than what the state holds */
    const commit = (): void => {
        if (draft !== null && draft !== props.value) {
            props.onChange(draft);
        }
        setDraft(null);
    };

    /** One step up or down, within the limits the state has */
    const nudge = (direction: 1 | -1): void => {
        const step = props.step || 1;
        const now = numberOf(shown) ?? props.min ?? 0;
        let next = now + direction * step;
        if (props.min !== undefined) {
            next = Math.max(props.min, next);
        }
        if (props.max !== undefined) {
            next = Math.min(props.max, next);
        }
        // as many places as the step has, so 0.1 + 0.2 does not become 0.30000000000000004
        const places = `${step}`.split('.')[1]?.length || 0;
        setDraft(null);
        props.onChange(next.toFixed(places));
    };

    const button = (label: string, direction: 1 | -1): React.JSX.Element => (
        <button
            type="button"
            className="vis-input-step"
            disabled={props.disabled}
            onClick={() => nudge(direction)}
            style={{
                width: 28,
                height: 28,
                flexShrink: 0,
                borderRadius: 8,
                border: `1px solid ${props.accent}`,
                background: `${props.accent}22`,
                color: props.accent,
                font: 'inherit',
                fontSize: 18,
                lineHeight: 1,
                cursor: props.disabled ? undefined : 'pointer',
            }}
        >
            {label}
        </button>
    );

    /*
     * Minus, field, unit and plus want about a hundred and fifty pixels.
     *
     * A card four cells wide has ninety, and the plus then stood outside the card, over its neighbour. On
     * such a card the two buttons are left out and the field is typed into - see `.vis-input-step` in
     * `Vis/css/vis.css`, a container query, so the browser decides at every width and nothing measures
     * itself. Hiding them rather than stacking them: a field with two buttons under it reads as three
     * controls, and the number can still be typed.
     */
    return (
        <div
            className="vis-input-row"
            style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}
        >
            {props.withButtons ? button('−', -1) : null}
            <input
                className="vis-input-field"
                type={props.numeric ? 'number' : 'text'}
                value={shown}
                disabled={props.disabled}
                min={props.min}
                max={props.max}
                step={props.step}
                onChange={e => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={e => {
                    if (e.key === 'Enter') {
                        commit();
                        (e.target as HTMLInputElement).blur();
                    } else if (e.key === 'Escape') {
                        // what the state holds is the way back out of a half-typed value
                        setDraft(null);
                        (e.target as HTMLInputElement).blur();
                    }
                    e.stopPropagation();
                }}
                style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '6px 8px',
                    borderRadius: 8,
                    border: `1px solid ${draft === null ? props.theme.palette.divider : props.accent}`,
                    background: 'transparent',
                    color: props.theme.palette.text.primary,
                    font: 'inherit',
                    fontSize: 15,
                    fontWeight: 700,
                    textAlign: props.withButtons ? 'center' : 'left',
                }}
            />
            {props.unit ? (
                <span style={{ flexShrink: 0, fontSize: 13, color: props.theme.palette.text.secondary }}>
                    {props.unit}
                </span>
            ) : null}
            {props.withButtons ? button('+', 1) : null}
        </div>
    );
}
