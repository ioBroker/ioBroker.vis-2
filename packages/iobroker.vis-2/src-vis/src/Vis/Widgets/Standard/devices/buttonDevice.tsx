import React from 'react';

import { Dialog, DialogContent, IconButton } from '@mui/material';

import { Close as CloseIcon, PlayArrow as ButtonIcon } from '@mui/icons-material';

import { Types } from '@iobroker/type-detector';

import { asNumber } from '../Base/controls/stateValue';
import { defineDeviceWidget, type DeviceContext, type StandardRxData } from '../Base/defineDeviceWidget';

/** What pressing the button does */
type ButtonAction = 'value' | 'navigate' | 'dialog';

interface ButtonRxData extends StandardRxData {
    /** Write a value, go to a page, or show a page over this one */
    action?: ButtonAction;
    /** The page that is gone to or shown */
    view?: string;
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
            ],
        },
        { name: 'oid', type: 'id', label: 'oid', hidden: "data.action === 'navigate' || data.action === 'dialog'" },
        {
            name: 'view',
            type: 'views',
            label: 'button_view',
            hidden: "data.action !== 'navigate' && data.action !== 'dialog'",
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
            hidden: "data.action === 'navigate' || data.action === 'dialog'",
        },
        {
            name: 'releaseValue',
            label: 'button_release',
            tooltip: 'button_release_tooltip',
            hidden: "data.action === 'navigate' || data.action === 'dialog'",
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
        const word = data.text || (action === 'value' ? t('button_press') : data.view || t('button_press'));

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
            <button
                type="button"
                disabled={context.editMode || (action === 'value' ? !data.oid : !data.view)}
                onClick={onClick}
                style={{
                    width: '100%',
                    height: '100%',
                    minHeight: 36,
                    borderRadius: 10,
                    border: `1px solid ${accent}`,
                    background: `${accent}22`,
                    color: accent,
                    font: 'inherit',
                    fontSize: context.tokens.smallSize + 1,
                    fontWeight: 600,
                    cursor: context.editMode ? undefined : 'pointer',
                }}
            >
                {word}
            </button>
        );

        const act = action === 'navigate' ? () => data.view && context.navigate(data.view) : press;

        return {
            accent,
            active: false,
            icon: <ButtonIcon style={{ width: '100%', height: '100%' }} />,
            // a marker on a plan is the button itself: one press and it has done its work. A page over the
            // plan is not something a coin can hold, so that one opens the card instead.
            onClick: context.editMode || action === 'dialog' ? undefined : act,
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
