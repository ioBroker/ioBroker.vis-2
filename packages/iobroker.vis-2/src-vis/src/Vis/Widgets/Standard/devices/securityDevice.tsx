import React from 'react';

import {
    Bedtime as NightIcon,
    GppBad as AlarmIcon,
    GppGood as ArmedIcon,
    Home as HomeIcon,
    Lock as InsideIcon,
    MoreTime as DelayIcon,
    Shield as DisarmedIcon,
} from '@mui/icons-material';

import { Utils } from '@iobroker/gui-components';

import { asText } from '../Base/controls/stateValue';
import { defineDeviceWidget, type DeviceContext, type StandardRxData } from '../Base/defineDeviceWidget';

interface SecurityRxData extends StandardRxData {
    /** Whether it is armed; a state with `common.states` becomes the row of modes */
    oidAlarm?: string;
    /** The button that arms it while somebody stays in the house */
    oidArmHome?: string;
    /** The button that arms it when everybody leaves */
    oidArmAway?: string;
    /** The button that disarms it */
    oidDisarm?: string;
    /** The button that arms it after a delay, so one can still leave the house */
    oidDelay?: string;
    /** The state says the opposite of what it means */
    inverted?: boolean | 'true';
    /** How many zones the system has */
    zones?: number | string;
    /** The numbered zone fields, `oidZone1` and `zoneName1` */
    [key: string]: any;
}

/** One thing the system can be set to */
interface Mode {
    value: string;
    label: string;
}

/**
 * What a mode looks like, out of the word the system uses for it.
 *
 * Every alarm system has its own words - `Unscharf`, `Sharp inside`, `Nachtruhe`, `disarmed` - and no list of
 * them would be right for the next system. What they do have in common is what the words mean, and that much
 * can be read off them: a mode that says `night` is the one for the night, whatever else it says. Where a word
 * says nothing recognisable the mode is still shown, only without a symbol of its own.
 *
 * The order is the order of the reading: `Innen-Scharf` says `scharf` as well as `innen`, and the narrower
 * word is the one that is meant.
 */
const MODE_LOOKS: { pattern: RegExp; icon: React.ReactNode; colour: 'green' | 'blue' | 'yellow' | 'night' }[] = [
    { pattern: /(off|aus|deaktiv|disarm|unscharf|disabled|standby|ruhe$)/i, icon: <DisarmedIcon />, colour: 'green' },
    { pattern: /(night|nacht|sleep|schlaf)/i, icon: <NightIcon />, colour: 'night' },
    { pattern: /(inside|innen|home|zuhause|stay|anwesend|partial|teil)/i, icon: <InsideIcon />, colour: 'yellow' },
    { pattern: /(away|abwesend|arm|scharf|extern|full|voll|on|ein)/i, icon: <ArmedIcon />, colour: 'blue' },
];

/** What the system can be set to, where it says so itself */
function modesOf(context: DeviceContext<SecurityRxData>): Mode[] {
    const states = context.commonOf('oid')?.states;
    if (!states) {
        return [];
    }
    const pairs: [string, string][] = Array.isArray(states)
        ? states.map((label, index) => [`${index}`, `${label}`])
        : Object.entries(states).map(([value, label]) => [value, `${label}`]);

    return pairs.map(([value, label]) => ({ value, label }));
}

/** One part of the house that is watched on its own */
interface Zone {
    attr: string;
    name: string;
    /** It is watching */
    on: boolean;
    /** What the state says about itself, in its own words where it has any */
    word: string;
    /** It can be switched from here */
    writable: boolean;
}

/**
 * The zones the widget was given states for.
 *
 * @param context - the widget, its states and its settings
 */
function zonesOf(context: DeviceContext<SecurityRxData>): Zone[] {
    const count = Math.max(0, Math.min(parseInt(`${context.data.zones || 0}`, 10) || 0, 8));
    const zones: Zone[] = [];

    for (let index = 1; index <= count; index++) {
        const attr = `oidZone${index}`;
        if (!context.data[attr]) {
            continue;
        }
        const raw = context.valueOf(attr);
        const common = context.commonOf(attr);
        const states = common?.states;
        const text = asText(raw);
        const on = raw === true || raw === 1 || text === '1' || text.toLowerCase() === 'true';
        // the word the state has for itself; `true` and `false` are not words anybody wants on a card
        const named = states
            ? `${(Array.isArray(states) ? states[Number(text)] : (states as Record<string, string>)[text]) ?? ''}`
            : '';

        zones.push({
            attr,
            name: context.data[`zoneName${index}`] || `${index}`,
            on,
            word: named || context.t(on ? 'on' : 'off'),
            writable: common?.write !== false,
        });
    }

    return zones;
}

/**
 * The alarm system: armed, disarmed, or going off.
 *
 * What arming means - everybody out, somebody asleep upstairs, only the ground floor - is the system's own
 * business, and where it says so in `common.states` the card shows those words as buttons with a symbol each:
 * the one for the night carries a moon whatever it is called. Where it says nothing, the states that were
 * given for arming and disarming do the job, and a system that is simply on or off is switched on its own
 * state.
 *
 * Beside that it shows what an alarm system is otherwise asked about: the button that arms it after a delay,
 * so one can still leave the house, and the zones - each with what it says about itself, and switchable where
 * the state allows it.
 *
 * This is the other device the question before an action was built for, and like the lock it asks on both
 * ways by default. Disarming a house from a tablet in the hall is exactly the move that should cost a PIN.
 */
const securityDevice = defineDeviceWidget<SecurityRxData>({
    name: 'Security',
    label: 'widget_security',
    help: 'help_security',
    picture: {
        glyph: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9.5C7.5 20 4 17 4 12V6z" stroke-width="2" stroke-linejoin="round"/>',
        value: 'Scharf',
        toggle: true,
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<path d="M16 3l11 4v9c0 7-5 11-11 13C10 27 5 23 5 16V7z" stroke="currentColor" stroke-width="2.5" ' +
        'stroke-linejoin="round"/>' +
        '<path d="M11 16l3.5 3.5L21 13" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" ' +
        'stroke-linejoin="round"/></svg>',
    deviceTypes: [],
    fields: [
        { name: 'oid', type: 'id', label: 'oid_armed' },
        { name: 'oidAlarm', type: 'id', label: 'oid_alarm' },
        { name: 'oidArmAway', type: 'id', label: 'oid_arm_away' },
        { name: 'oidArmHome', type: 'id', label: 'oid_arm_home' },
        { name: 'oidDisarm', type: 'id', label: 'oid_disarm' },
        { name: 'oidDelay', type: 'id', label: 'oid_delay', tooltip: 'oid_delay_tooltip' },
        { name: 'inverted', type: 'checkbox', label: 'inverted' },
        { name: 'zones', type: 'number', label: 'zones_count', min: 0, max: 8, default: 0 },
    ],
    groups: [
        {
            name: 'zones',
            label: 'group_zones',
            indexFrom: 1,
            indexTo: 'zones',
            fields: [
                { name: 'oidZone', type: 'id', label: 'oid_zone' },
                { name: 'zoneName', label: 'zone_name' },
            ],
        },
    ],
    tile: { columns: 6, rows: 4, minColumns: 3, minRows: 2 },
    markerShape: 'icon',
    popup: true,
    confirmable: true,
    // disarming a house from a tablet in the hall is exactly the move that should cost a PIN
    confirmDefault: 'both',
    render: context => {
        const { data, accents, theme, t } = context;

        const raw = context.valueOf('oid');
        const known = raw !== undefined && raw !== null;
        const truthy = raw === true || raw === 1 || raw === 'true' || raw === '1';
        const inverted = data.inverted === true || data.inverted === 'true';
        const armed = inverted ? !truthy : truthy;
        const alarm = data.oidAlarm ? !!context.valueOf('oidAlarm') : false;

        const modes = modesOf(context);
        const current = asText(raw);
        const modeLabel = modes.find(one => one.value === current)?.label;

        const accent = alarm ? accents.red : !known ? accents.off : armed ? accents.blue : accents.green;
        const word = alarm ? t('security_alarm') : modeLabel || t(armed ? 'security_armed' : 'security_disarmed');

        /** The colours the modes are told apart by */
        const colours = {
            green: accents.green,
            blue: accents.blue,
            yellow: accents.yellow,
            night: theme.palette.secondary.main,
        };

        /**
         * Press one of the buttons the system was given.
         *
         * @param oid - the state behind that button
         * @param kind - whether this arms or disarms, which decides whether it is asked about
         */
        const press = (oid: string | undefined, kind: 'on' | 'off') => (): void => {
            if (oid) {
                context.act(kind, () => context.setValue(oid, true));
            }
        };

        /** A button of the card: a symbol, a word under it, and a fill while it is the one that is on */
        const button = (
            label: string,
            icon: React.ReactNode,
            onClick: (() => void) | undefined,
            colour: string,
            options: { active?: boolean; wide?: boolean } = {},
        ): React.JSX.Element => {
            const ink = options.active ? (Utils.isUseBright(colour) ? '#FFFFFF' : '#000000') : colour;

            return (
                <button
                    // the buttons are handed over as a list, and a list of elements wants a key
                    key={label}
                    type="button"
                    disabled={context.editMode || !onClick}
                    onClick={onClick}
                    style={{
                        display: 'flex',
                        flexDirection: options.wide ? 'row' : 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: options.wide ? 6 : 3,
                        minWidth: 0,
                        padding: options.wide ? '8px 6px' : '8px 4px',
                        borderRadius: 10,
                        border: `1px solid ${options.active ? colour : theme.palette.divider}`,
                        background: options.active ? colour : 'transparent',
                        color: ink,
                        font: 'inherit',
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        cursor: context.editMode || !onClick ? undefined : 'pointer',
                    }}
                >
                    <span
                        style={{
                            display: 'flex',
                            width: options.wide ? 16 : 20,
                            height: options.wide ? 16 : 20,
                            flexShrink: 0,
                        }}
                    >
                        {icon}
                    </span>
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                </button>
            );
        };

        // an icon of the set sizes itself by its font size, which is not what a box of a few pixels wants
        const buttonIcon = { width: '100%', height: '100%' };
        const sized = (icon: React.ReactNode): React.ReactNode =>
            React.isValidElement(icon)
                ? React.cloneElement(icon as React.ReactElement<{ style?: React.CSSProperties }>, {
                      style: buttonIcon,
                  })
                : icon;

        /** The modes the system names itself, each with the symbol its word asks for */
        const modeButtons = modes.map(mode => {
            const look = MODE_LOOKS.find(one => one.pattern.test(mode.label) || one.pattern.test(mode.value));

            return button(
                mode.label,
                sized(look?.icon ?? <DisarmedIcon />),
                () =>
                    context.act(look?.colour === 'green' ? 'off' : 'on', () => context.setValue(data.oid, mode.value)),
                colours[look?.colour ?? 'blue'],
                { active: mode.value === current },
            );
        });

        const buttons = [
            data.oidArmAway
                ? button(t('security_away'), sized(<ArmedIcon />), press(data.oidArmAway, 'on'), accents.blue)
                : null,
            data.oidArmHome
                ? button(t('security_home'), sized(<HomeIcon />), press(data.oidArmHome, 'on'), accents.yellow)
                : null,
            data.oidDisarm
                ? button(t('security_disarm'), sized(<DisarmedIcon />), press(data.oidDisarm, 'off'), accents.green)
                : null,
        ].filter(one => one);

        /*
         * The system that says nothing about itself is still switched from here.
         *
         * A system with `common.states` gets the row of its own words, and one that was given the states of
         * its buttons gets those - but a plain switch that is simply on or off had nothing at all, and a
         * widget for an alarm system that can only be looked at is half a widget. It is written to the way
         * every other switch of the set is written to: the value the state actually carries, inverted where
         * the setting says the state means the opposite, and never without the question first.
         */
        const common = context.commonOf('oid');
        const numeric = common?.type === 'number';
        const switchable = !modes.length && !buttons.length && !!data.oid && common?.write !== false;

        /** Arm or disarm the state itself */
        const arm = (wanted: boolean) => (): void =>
            context.act(wanted ? 'on' : 'off', () => {
                const value = inverted ? !wanted : wanted;
                context.setValue(data.oid, numeric ? (value ? 1 : 0) : value);
            });

        const plainButtons = switchable
            ? [
                  button(t('security_arm'), sized(<ArmedIcon />), arm(true), accents.blue),
                  button(t('security_disarm'), sized(<DisarmedIcon />), arm(false), accents.green),
              ]
            : [];

        const zones = zonesOf(context);

        /** The parts of the house, each saying whether it is watching */
        const zoneTiles = zones.map(zone => (
            <button
                key={zone.attr}
                type="button"
                disabled={context.editMode || !zone.writable}
                onClick={
                    zone.writable
                        ? () => context.act(zone.on ? 'off' : 'on', () => context.setValue(data[zone.attr], !zone.on))
                        : undefined
                }
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    minWidth: 0,
                    padding: '6px 4px',
                    borderRadius: 10,
                    border: `1px solid ${zone.on ? accents.green : theme.palette.divider}`,
                    background: 'transparent',
                    font: 'inherit',
                    color: theme.palette.text.primary,
                    cursor: context.editMode || !zone.writable ? undefined : 'pointer',
                }}
            >
                <span
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        maxWidth: '100%',
                        fontSize: 12,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    <span
                        style={{
                            width: 8,
                            height: 8,
                            flexShrink: 0,
                            borderRadius: '50%',
                            background: zone.on ? accents.green : theme.palette.text.disabled,
                        }}
                    />
                    {zone.name}
                </span>
                <span style={{ fontSize: 11, color: theme.palette.text.secondary }}>{zone.word}</span>
            </button>
        ));

        /** Everything that is switched from this card, one block under the other */
        const controls = [
            modeButtons.length ? (
                <div
                    key="modes"
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(74px, 1fr))', gap: 6 }}
                >
                    {modeButtons}
                </div>
            ) : null,
            buttons.length || plainButtons.length ? (
                <div
                    key="buttons"
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(74px, 1fr))', gap: 6 }}
                >
                    {buttons.length ? buttons : plainButtons}
                </div>
            ) : null,
            data.oidDelay ? (
                <div
                    key="delay"
                    className="vis-security-delay"
                    style={{ display: 'grid' }}
                >
                    {button(
                        t('security_delay'),
                        sized(<DelayIcon />),
                        press(data.oidDelay, 'on'),
                        theme.palette.text.secondary,
                        { wide: true },
                    )}
                </div>
            ) : null,
            zoneTiles.length ? (
                <div
                    key="zones"
                    className="vis-security-zones"
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(84px, 1fr))', gap: 6 }}
                >
                    {zoneTiles}
                </div>
            ) : null,
        ].filter(one => one);

        return {
            accent,
            // an alarm that is going off fills the card and pulses; being armed does not
            active: alarm,
            icon: alarm ? (
                <AlarmIcon
                    style={{
                        width: '100%',
                        height: '100%',
                        animation: 'vis-standard-pulse 1.2s ease-in-out infinite',
                    }}
                />
            ) : armed ? (
                <ArmedIcon style={{ width: '100%', height: '100%' }} />
            ) : (
                <DisarmedIcon style={{ width: '100%', height: '100%' }} />
            ),
            value: known || alarm ? word : '--',
            valueColor: accent,
            stateText: known || alarm ? word : '--',
            // the card says how much room it has, so the blocks that matter least go first where it is short
            container: true,
            footer:
                context.layout !== 'default' || !controls.length ? null : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>{controls}</div>
                ),
        };
    },
});

export default securityDevice;
