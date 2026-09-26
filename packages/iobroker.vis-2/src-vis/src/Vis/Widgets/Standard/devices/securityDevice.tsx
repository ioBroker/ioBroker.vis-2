import React from 'react';

import {
    GppBad as AlarmIcon,
    GppGood as ArmedIcon,
    Home as HomeIcon,
    Shield as DisarmedIcon,
} from '@mui/icons-material';

import ModeButtons, { type Mode } from '../Base/controls/ModeButtons';
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
    /** The state says the opposite of what it means */
    inverted?: boolean | 'true';
}

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

/**
 * The alarm system: armed, disarmed, or going off.
 *
 * Three states and nothing else is the honest shape of it. What arming means - everybody out, or
 * somebody asleep upstairs - is the system's own business, and where it says so in `common.states`
 * the card shows those as buttons; where it does not, the two buttons it was given do.
 *
 * This is the other device the question before an action was built for, and like the lock it asks on
 * both ways by default. Disarming a house from a tablet in the hall is exactly the move that should
 * cost a PIN.
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
        { name: 'inverted', type: 'checkbox', label: 'inverted' },
    ],
    tile: { columns: 6, rows: 3, minColumns: 3, minRows: 2 },
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
        const modeLabel = modes.find(one => `${one.value}` === asText(raw))?.label;

        const accent = alarm ? accents.red : !known ? accents.off : armed ? accents.blue : accents.green;
        const word = alarm ? t('security_alarm') : modeLabel || t(armed ? 'security_armed' : 'security_disarmed');

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

        const button = (
            label: string,
            icon: React.ReactNode,
            onClick: () => void,
            color: string,
        ): React.JSX.Element => (
            <button
                type="button"
                disabled={context.editMode}
                onClick={onClick}
                style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '8px 6px',
                    borderRadius: 10,
                    border: `1px solid ${color}`,
                    background: `${color}22`,
                    color,
                    font: 'inherit',
                    fontSize: 12,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    cursor: context.editMode ? undefined : 'pointer',
                }}
            >
                <span style={{ display: 'flex', width: 16, height: 16 }}>{icon}</span>
                {label}
            </button>
        );

        const buttons = [
            data.oidArmAway
                ? button(t('security_away'), <ArmedIcon />, press(data.oidArmAway, 'on'), accents.blue)
                : null,
            data.oidArmHome
                ? button(t('security_home'), <HomeIcon />, press(data.oidArmHome, 'on'), accents.yellow)
                : null,
            data.oidDisarm
                ? button(t('security_disarm'), <DisarmedIcon />, press(data.oidDisarm, 'off'), accents.green)
                : null,
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
            footer:
                context.layout !== 'default' ? null : modes.length && data.oid ? (
                    <ModeButtons
                        modes={modes}
                        current={asText(raw)}
                        accent={accent}
                        theme={theme}
                        disabled={context.editMode}
                        onChange={value =>
                            context.act(`${value}` === '0' ? 'off' : 'on', () => context.setValue(data.oid, value))
                        }
                    />
                ) : buttons.length ? (
                    <div style={{ display: 'flex', gap: 6, width: '100%' }}>{buttons}</div>
                ) : null,
        };
    },
});

export default securityDevice;
