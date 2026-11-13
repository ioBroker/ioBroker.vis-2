import React from 'react';

import { Dialog, DialogContent, IconButton, MenuItem, TextField } from '@mui/material';

import { Close as CloseIcon, PlayArrow as ButtonIcon } from '@mui/icons-material';

import { I18n } from '@iobroker/gui-components';
import type { RxWidgetInfoAttributesField } from '@iobroker/types-vis-2';

import { getSectionTargets } from '@/Vis/visSectionJump';

import { Types } from '../Base/deviceTypes';
import { STANDARD_I18N_PREFIX } from '../Base/prefix';

import { asNumber } from '../Base/controls/stateValue';
import { defineDeviceWidget, type DeviceContext, type StandardRxData } from '../Base/defineDeviceWidget';

/** What pressing the button does */
type ButtonAction = 'value' | 'navigate' | 'dialog' | 'section';

interface ButtonRxData extends StandardRxData {
    /** Write a value, go to a page, or show a page over this one */
    action?: ButtonAction;
    /** The page that is gone to or shown */
    view?: string;
    /** The section of this page that is scrolled to */
    section?: string;
    /** How large the page is shown, as a share of the window */
    dialogSize?: 'small' | 'medium' | 'large' | 'full';
    /** What is written when it is pressed; `true` where nothing is said */
    value?: string;
    /** What is written a moment later, for a state that has to be let go again */
    releaseValue?: string;
    /** How long the first value stays before the second is written, in milliseconds */
    releaseAfter?: number | string;
    /** The word on the button */
    text?: string;
    /** The colour of the button */
    color?: string;
}

/** What a value that came out of a field means to a state */
function asValue(value: string | undefined, fallback: boolean): string | number | boolean {
    if (value === undefined || value === '') {
        return fallback;
    }
    if (value === 'true' || value === 'false') {
        return value === 'true';
    }
    const number = asNumber(value);
    return number === null ? value : number;
}

/**
 * The field that picks a section of the page the button stands on.
 *
 * A section is known to the project by an id nobody has seen, so the field offers the sections by their titles.
 * One that is gone since - deleted, or its title taken away - still stands in the list under its id, so the
 * button does not lose its setting without a word.
 */
const sectionField: Extract<RxWidgetInfoAttributesField, { type: 'custom' }>['component'] = (
    field,
    data,
    onDataChange,
    props,
) => {
    const targets = getSectionTargets(props.context.views, props.selectedView);
    const value = typeof data.section === 'string' ? data.section : '';
    if (value && !targets.find(target => target.id === value)) {
        targets.push({ id: value, label: value });
    }
    return (
        <TextField
            select
            fullWidth
            size="small"
            variant="standard"
            label={I18n.t(`${STANDARD_I18N_PREFIX}button_section`)}
            value={value}
            disabled={props.disabled}
            helperText={targets.length ? undefined : I18n.t(`${STANDARD_I18N_PREFIX}button_section_none`)}
            onChange={e => onDataChange({ ...data, section: e.target.value })}
        >
            {targets.map(target => (
                <MenuItem
                    key={target.id}
                    value={target.id}
                >
                    {target.label}
                </MenuItem>
            ))}
        </TextField>
    );
};

/** How long the button stays lit after it was pressed, in milliseconds */
const FLASH_MS = 400;

/**
 * The button on the card, and what it shows of a press.
 *
 * A button has no state to show afterwards, so before this a press left it exactly as it was and nobody could
 * tell whether it had been hit. Now it fills with its colour while the finger is on it, gives a little under
 * it, and stays lit a moment after it was let go - long enough to be seen also after a short tap, which is
 * over before a frame with `:active` would have been painted. It is a component of its own for that state.
 *
 * @param props - the colour, the word and what a press does
 * @param props.accent - the colour of the button
 * @param props.word - the word on it
 * @param props.fontSize - how large the word is
 * @param props.disabled - in the editor, or with nothing to do
 * @param props.onPress - what a press does
 */
function PressButton(props: {
    accent: string;
    word: string;
    fontSize: number;
    disabled: boolean;
    onPress: () => void;
}): React.JSX.Element {
    const [held, setHeld] = React.useState(false);
    const [flash, setFlash] = React.useState(false);
    const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    React.useEffect(
        () => () => {
            if (timer.current) {
                clearTimeout(timer.current);
            }
        },
        [],
    );

    const { accent } = props;
    const lit = !props.disabled && (held || flash);
    const letGo = (): void => setHeld(false);

    return (
        <button
            type="button"
            disabled={props.disabled}
            onPointerDown={() => setHeld(true)}
            onPointerUp={letGo}
            onPointerLeave={letGo}
            onPointerCancel={letGo}
            onClick={() => {
                setFlash(true);
                if (timer.current) {
                    clearTimeout(timer.current);
                }
                timer.current = setTimeout(() => setFlash(false), FLASH_MS);
                props.onPress();
            }}
            style={{
                width: '100%',
                height: '100%',
                minHeight: 36,
                borderRadius: 10,
                border: `1px solid ${accent}`,
                background: lit ? accent : `${accent}22`,
                color: lit ? '#fff' : accent,
                boxShadow: lit ? `0 0 10px ${accent}88` : 'none',
                transform: held && !props.disabled ? 'scale(0.96)' : undefined,
                // in quickly, out slowly: the press is felt at once, and the light fades rather than blinks
                transition: lit
                    ? 'background 0.05s, color 0.05s, box-shadow 0.05s, transform 0.08s'
                    : 'background 0.35s, color 0.35s, box-shadow 0.35s, transform 0.08s',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                font: 'inherit',
                fontSize: props.fontSize,
                fontWeight: 600,
                cursor: props.disabled ? undefined : 'pointer',
            }}
        >
            {props.word}
        </button>
    );
}

/** How wide the dialog is, by what it was set to */
const DIALOG_WIDTH: Record<string, string> = {
    small: 'min(420px, 96vw)',
    medium: 'min(760px, 96vw)',
    large: 'min(1100px, 96vw)',
    full: '100vw',
};

/** How tall it is */
const DIALOG_HEIGHT: Record<string, string> = {
    small: 'min(420px, 90vh)',
    medium: 'min(620px, 90vh)',
    large: 'min(860px, 92vh)',
    full: '100vh',
};

/**
 * A page of the project, shown over the one it was opened from.
 *
 * The dialog is a component of its own because it has a state the widget has not: whether it is open. The
 * page inside it is drawn by the runtime, so everything on it works - it is the same page, not a picture of
 * one; `context.getView` is what hands it over.
 *
 * @param props - the widget, its settings and the button that opens it
 * @param props.context - the widget, its settings and what it may draw
 * @param props.button - the button itself, which is handed what to do when it is pressed
 */
function ViewDialogButton(props: {
    context: DeviceContext<ButtonRxData>;
    button: (onClick: () => void) => React.JSX.Element;
}): React.JSX.Element {
    const [open, setOpen] = React.useState(false);
    const { context } = props;
    const size = context.data.dialogSize || 'medium';
    const full = size === 'full';

    return (
        <>
            {props.button(() => !context.editMode && setOpen(true))}
            {open && context.data.view ? (
                <Dialog
                    open
                    fullScreen={full}
                    maxWidth={false}
                    onClose={() => setOpen(false)}
                    slotProps={{
                        paper: {
                            sx: {
                                width: DIALOG_WIDTH[size],
                                height: DIALOG_HEIGHT[size],
                                maxWidth: 'none',
                                margin: full ? 0 : undefined,
                            },
                        },
                    }}
                >
                    <IconButton
                        onClick={() => setOpen(false)}
                        size="small"
                        // over the page, which fills the dialog and brings no close button of its own
                        sx={{ position: 'absolute', right: 6, top: 6, zIndex: 2 }}
                    >
                        <CloseIcon />
                    </IconButton>
                    <DialogContent sx={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                        {context.getView(context.data.view)}
                    </DialogContent>
                </Dialog>
            ) : null}
        </>
    );
}

/**
 * The button: something happens when it is pressed, and nothing is shown afterwards.
 *
 * A scene, a script, a doorbell, a gate. It is the one device that has no state to speak of - a button
 * does not remember having been pressed - so the card shows a button and nothing else.
 *
 * Where a device wants to be let go again, `releaseValue` is written a moment later. That is what a
 * relay wired as a pulse needs, and doing it in the widget saves a script that exists only for that.
 *
 * Like every device that switches, it can ask first: a button that opens a gate is worth a question.
 */
const buttonDevice = defineDeviceWidget<ButtonRxData>({
    name: 'Button',
    label: 'widget_button',
    help: 'help_button',
    picture: {
        glyph:
            '<circle cx="12" cy="12" r="8.5" stroke-width="2"/>' +
            '<circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"/>',
        value: 'Start',
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<rect x="4" y="10" width="24" height="13" rx="6.5" stroke="currentColor" stroke-width="2.5"/>' +
        '<circle cx="16" cy="16.5" r="3" fill="currentColor"/></svg>',
    deviceTypes: [Types.button],
    wizard: { states: { oid: 'SET' } },
    fields: [
        {
            name: 'action',
            type: 'select',
            label: 'button_action',
            default: 'value',
            options: [
                { value: 'value', label: 'button_action_value' },
                { value: 'navigate', label: 'button_action_navigate' },
                { value: 'dialog', label: 'button_action_dialog' },
                { value: 'section', label: 'button_action_section' },
            ],
        },
        { name: 'oid', type: 'id', label: 'oid', hidden: "!!data.action && data.action !== 'value'" },
        {
            name: 'view',
            type: 'views',
            label: 'button_view',
            hidden: "data.action !== 'navigate' && data.action !== 'dialog'",
        },
        {
            name: 'section',
            type: 'custom',
            label: 'button_section',
            component: sectionField,
            hidden: "data.action !== 'section'",
        },
        {
            name: 'dialogSize',
            type: 'select',
            label: 'button_dialog_size',
            default: 'medium',
            options: [
                { value: 'small', label: 'dialog_small' },
                { value: 'medium', label: 'dialog_medium' },
                { value: 'large', label: 'dialog_large' },
                { value: 'full', label: 'dialog_full' },
            ],
            hidden: "data.action !== 'dialog'",
        },
        { name: 'text', label: 'button_text' },
        {
            name: 'value',
            label: 'button_value',
            tooltip: 'button_value_tooltip',
            hidden: "!!data.action && data.action !== 'value'",
        },
        {
            name: 'releaseValue',
            label: 'button_release',
            tooltip: 'button_release_tooltip',
            hidden: "!!data.action && data.action !== 'value'",
        },
        { name: 'releaseAfter', type: 'number', label: 'button_release_after', hidden: '!data.releaseValue' },
        { name: 'color', type: 'color', label: 'button_color' },
    ],
    tile: { columns: 6, rows: 2, minColumns: 2 },
    markerShape: 'icon',
    /*
     * A marker on a plan does its work on a click - its own `onClick` wins over this one.
     * Only the button that shows a page over the plan has none, because a page is not something a coin can
     * hold; that one opens its card, and the button in the card then opens the page.
     */
    popup: true,
    confirmable: true,
    render: context => {
        const { data, accents, t } = context;
        const accent = data.color || accents.blue;
        const action = data.action || 'value';
        const target = action === 'section' ? context.sectionTargets().find(one => one.id === data.section) : undefined;
        const word =
            data.text ||
            (action === 'section'
                ? target?.label || t('button_press')
                : action === 'value'
                  ? t('button_press')
                  : data.view || t('button_press'));

        const press = (): void =>
            context.act('on', () => {
                if (!data.oid) {
                    return;
                }
                context.setValue(data.oid, asValue(data.value, true));
                if (data.releaseValue !== undefined && data.releaseValue !== '') {
                    // a relay wired as a pulse has to be let go again, and this saves a script for it
                    setTimeout(
                        () => context.setValue(data.oid, asValue(data.releaseValue, false)),
                        asNumber(data.releaseAfter) ?? 300,
                    );
                }
            });

        /** The button itself, whatever it ends up doing */
        const button = (onClick: () => void): React.JSX.Element => (
            <PressButton
                accent={accent}
                word={word}
                fontSize={context.tokens.smallSize + 1}
                disabled={
                    context.editMode ||
                    (action === 'value' ? !data.oid : action === 'section' ? !data.section : !data.view)
                }
                onPress={onClick}
            />
        );

        const act =
            action === 'navigate'
                ? () => data.view && context.navigate(data.view)
                : action === 'section'
                  ? () => data.section && context.scrollToSection(data.section)
                  : press;

        return {
            accent,
            active: false,
            icon: <ButtonIcon style={{ width: '100%', height: '100%' }} />,
            // a marker on a plan is the button itself: one press and it has done its work. A page over the
            // plan is not something a coin can hold, so that one opens the card instead.
            // The card of a section with the button in its body leaves the click to the button: the press
            // came up to the card as well, and the value was written twice.
            onClick:
                context.editMode || action === 'dialog' || (context.set !== 'absolute' && context.layout === 'default')
                    ? undefined
                    : act,
            stateText: word,
            body:
                context.layout === 'default' ? (
                    action === 'dialog' ? (
                        <ViewDialogButton
                            context={context}
                            button={button}
                        />
                    ) : (
                        button(act)
                    )
                ) : null,
            value: context.layout === 'default' ? undefined : word,
            valueColor: accent,
        };
    },
});

export default buttonDevice;
