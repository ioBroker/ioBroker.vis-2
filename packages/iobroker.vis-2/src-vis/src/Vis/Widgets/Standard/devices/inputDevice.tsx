import React from 'react';

import { Check as CheckIcon, Edit as InputIcon } from '@mui/icons-material';

import StateInput from '../Base/controls/StateInput';
import { asNumber, asText, statesOf, typedValue } from '../Base/controls/stateValue';
import { defineDeviceWidget, type DeviceContext, type StandardRxData } from '../Base/defineDeviceWidget';
import { limitsOf } from '../Base/limits';

/** How the value is given: typed, chosen, or ticked */
type InputKind = 'auto' | 'text' | 'number' | 'select' | 'checkbox';

interface InputRxData extends StandardRxData {
    kind?: InputKind;
    unit?: string;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    /** A minus and a plus beside a number, instead of typing it */
    buttons?: boolean | 'true';
    /** The choices, where the object names none: `0:Aus;1:An` or `Aus;An` */
    options?: string;
    /** What the tick means while it is set, and while it is not */
    textOn?: string;
    textOff?: string;
}

/**
 * How this state is given a value, out of what its object says and what the widget was told.
 *
 * The same question the list asks of every row, and the same answer: something that is true or false is
 * ticked, something that names its values is chosen from, a number is typed as a number, everything else as
 * text. Choices typed into the widget count as naming them - that is what typing them in was for. A state
 * that may not be written to is shown and not offered, see {@link inputDevice}.
 *
 * @param common - what the object says about the state, or nothing while it is still being read
 * @param choices - the values this state may take, from the object or from the widget
 */
function kindOf(
    common: ioBroker.StateCommon | null | undefined,
    choices: { value: string }[],
): Exclude<InputKind, 'auto'> {
    if (common?.type === 'boolean') {
        return 'checkbox';
    }
    if (choices.length) {
        return 'select';
    }
    if (common?.type === 'number') {
        return 'number';
    }

    return 'text';
}

/**
 * The choices of this widget: the ones typed into it, or the ones the object names.
 *
 * `0:Aus;1:An` gives a value and a word for it; a plain `Aus;An` is a list of values that are their own
 * words, which is what a string state usually wants.
 *
 * @param context - the widget and its settings
 */
function choicesOf(context: DeviceContext<InputRxData>): { value: string; label: string }[] {
    const own = (context.data.options || '').trim();
    if (!own) {
        return statesOf(context.commonOf('oid'));
    }

    return own
        .split(';')
        .map(one => one.trim())
        .filter(one => one)
        .map(one => {
            const at = one.indexOf(':');
            return at === -1
                ? { value: one, label: one }
                : { value: one.slice(0, at).trim(), label: one.slice(at + 1).trim() };
        });
}

/**
 * A state written by hand: a field, a dropdown, a tick.
 *
 * The other widgets of these sets each show one kind of device. This one shows none: it is the plain control
 * for a plain state, for everything a house has that the type detector never hears about - a script variable,
 * a mode somebody invented, a setpoint an adapter offers and nothing else reads. Without it a page needs the
 * old `Basic` set for a text field, which looks like a different program.
 *
 * What the control is comes out of the object and is overruled where that answer is wrong. A state that
 * cannot be written to shows its value and offers nothing, because a field that refuses what is typed into
 * it is worse than no field.
 */
const inputDevice = defineDeviceWidget<InputRxData>({
    name: 'Input',
    label: 'widget_input',
    help: 'help_input',
    picture: {
        glyph:
            '<rect x="3" y="7" width="18" height="10" rx="2" stroke-width="2"/>' +
            '<path d="M7 10v4" stroke-width="2" stroke-linecap="round"/>',
        value: '21,5',
        label: 'Soll',
        field: true,
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<rect x="3" y="9" width="26" height="14" rx="3" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M9 13v6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
    deviceTypes: [],
    fields: [
        { name: 'oid', type: 'id', label: 'oid' },
        {
            name: 'kind',
            type: 'select',
            label: 'input_kind',
            default: 'auto',
            options: [
                { value: 'auto', label: 'row_kind_auto' },
                { value: 'text', label: 'input_text' },
                { value: 'number', label: 'input_number' },
                { value: 'select', label: 'row_kind_select' },
                { value: 'checkbox', label: 'input_checkbox' },
            ],
        },
        { name: 'unit', label: 'unit', hidden: "data.kind === 'checkbox' || data.kind === 'select'" },
        { name: 'min', type: 'number', label: 'min', hidden: "data.kind !== 'number' && data.kind !== 'auto'" },
        { name: 'max', type: 'number', label: 'max', hidden: "data.kind !== 'number' && data.kind !== 'auto'" },
        { name: 'step', type: 'number', label: 'step', hidden: "data.kind !== 'number' && data.kind !== 'auto'" },
        {
            name: 'buttons',
            type: 'checkbox',
            label: 'input_buttons',
            hidden: "data.kind !== 'number' && data.kind !== 'auto'",
        },
        {
            name: 'options',
            label: 'input_options',
            tooltip: 'input_options_tooltip',
            hidden: "data.kind !== 'select' && data.kind !== 'auto'",
        },
        { name: 'textOn', label: 'text_on', hidden: "data.kind !== 'checkbox' && data.kind !== 'auto'" },
        { name: 'textOff', label: 'text_off', hidden: "data.kind !== 'checkbox' && data.kind !== 'auto'" },
    ],
    tile: { columns: 4, rows: 2, minColumns: 2, minRows: 2 },
    markerShape: 'value',
    // a field and a dropdown want a keyboard, which a coin on a plan has no room for
    popup: true,
    confirmable: true,
    render: context => {
        const { data, accents, theme, tokens, t } = context;

        const common = context.commonOf('oid');
        const writable = !data.oid || !common || common.write !== false;
        const choices = choicesOf(context);
        const kind = !data.kind || data.kind === 'auto' ? kindOf(common, choices) : data.kind;

        const raw = context.valueOf('oid');
        const text = asText(raw);
        const accent = accents.blue;
        const unit = data.unit || common?.unit || '';

        /** Write a value, through the question the widget may have been given */
        const write = (value: string | number | boolean): void =>
            context.act(value === false || value === 0 || value === '' ? 'off' : 'on', () => {
                if (data.oid) {
                    context.setValue(data.oid, value);
                }
            });

        const named = choices.find(one => one.value === text);
        const on = raw === true || raw === 1 || text === '1' || text === 'true';
        const word = kind === 'checkbox' ? (on ? data.textOn : data.textOff) || t(on ? 'on' : 'off') : named?.label;

        /*
         * What is read rather than written.
         *
         * `common.write === false` means the adapter will not take anything, so the widget says what the state
         * holds and offers nothing - an input field that silently drops what is typed into it teaches the user
         * that the page is broken.
         */
        if (!writable) {
            const number = asNumber(raw);
            // the system writes a number with a comma, and a card that is only read is still a card
            const written = number === null ? text || '--' : `${number}`.replace('.', context.isFloatComma ? ',' : '.');
            return {
                accent: accents.off,
                icon: <InputIcon style={{ width: '100%', height: '100%' }} />,
                value: number === null ? word || written : `${written}${unit ? ` ${unit}` : ''}`,
                valueColor: theme.palette.text.secondary,
                stateText: word || text || '--',
            };
        }

        const result = {
            accent,
            // the number field asks how much room its card has before it draws its two buttons
            container: kind === 'number',
            active: kind === 'checkbox' && on,
            icon: <InputIcon style={{ width: '100%', height: '100%' }} />,
            stateText: word || text || '--',
            marker: { text: (word || text || '--').slice(0, 6) },
        };

        if (kind === 'checkbox') {
            return {
                ...result,
                value: word,
                valueColor: on ? accent : theme.palette.text.secondary,
                control: (
                    <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        disabled={context.editMode || !data.oid}
                        onClick={() => write(!on)}
                        style={{
                            width: 26,
                            height: 26,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 6,
                            border: `2px solid ${on ? accent : theme.palette.divider}`,
                            background: on ? accent : 'transparent',
                            color: '#fff',
                            padding: 0,
                            cursor: context.editMode ? undefined : 'pointer',
                            transition: 'background 0.2s, border-color 0.2s',
                        }}
                    >
                        {on ? <CheckIcon style={{ width: '100%', height: '100%' }} /> : null}
                    </button>
                ),
            };
        }

        if (kind === 'select') {
            return {
                ...result,
                footer: (
                    <select
                        value={text}
                        disabled={context.editMode || !data.oid}
                        onChange={e => write(typedValue(e.target.value, common))}
                        style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: 8,
                            border: `1px solid ${theme.palette.divider}`,
                            background: theme.palette.background.paper,
                            color: theme.palette.text.primary,
                            font: 'inherit',
                            fontSize: 15,
                            fontWeight: 700,
                            cursor: context.editMode ? undefined : 'pointer',
                        }}
                    >
                        {/* what the state carries now, even where nobody listed it */}
                        {named || !text ? null : <option value={text}>{text}</option>}
                        {choices.map(one => (
                            <option
                                key={one.value}
                                value={one.value}
                            >
                                {one.label}
                            </option>
                        ))}
                    </select>
                ),
            };
        }

        const limits = kind === 'number' ? limitsOf(context, 'oid', { min: NaN, max: NaN }) : null;

        return {
            ...result,
            footer: (
                <StateInput
                    value={text}
                    numeric={kind === 'number'}
                    unit={unit}
                    min={limits && isFinite(limits.min) ? limits.min : undefined}
                    max={limits && isFinite(limits.max) ? limits.max : undefined}
                    step={limits?.step || (asNumber(data.step) ?? undefined)}
                    withButtons={kind === 'number' && (data.buttons === true || data.buttons === 'true')}
                    disabled={context.editMode || !data.oid}
                    accent={accent}
                    theme={theme}
                    onChange={value => write(kind === 'number' ? (asNumber(value) ?? 0) : value)}
                />
            ),
            // the field is the point of this card, so the value does not say the same thing above it
            value: undefined,
            tokens,
        };
    },
});

export default inputDevice;
