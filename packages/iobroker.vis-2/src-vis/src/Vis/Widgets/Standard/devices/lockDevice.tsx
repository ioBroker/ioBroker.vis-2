import React from 'react';

import { Lock as LockedIcon, LockOpen as UnlockedIcon, MeetingRoom as DoorOpenIcon } from '@mui/icons-material';

import { Types } from '@iobroker/type-detector';

import SlideToggle from '../Base/controls/SlideToggle';
import { defineDeviceWidget, type StandardRxData } from '../Base/defineDeviceWidget';

interface LockRxData extends StandardRxData {
    /** What the lock reports, when that is not the state it is set by */
    oidActual?: string;
    /** The button that buzzes the door open without unlocking it */
    oidOpen?: string;
    /** The state says the opposite of what it means */
    inverted?: boolean | 'true';
}

/**
 * The lock: locked or not, and the button that lets someone in.
 *
 * Three states, as the detector finds them on a lock: the one it is set by, the one it reports - a motor lock
 * takes a few seconds and says so - and the door opener, which buzzes the door without touching the bolt.
 *
 * This is the device the question before an action was built for. A lock is asked about on both ways by
 * default: a dashboard hangs where everyone walks past it, and the front door is not something to open
 * because a sleeve brushed the screen. Set it to `Never` if the tablet is somewhere nobody else goes.
 */
const lockDevice = defineDeviceWidget<LockRxData>({
    name: 'Lock',
    label: 'widget_lock',
    help: 'help_lock',
    picture: {
        glyph:
            '<rect x="4" y="10.5" width="16" height="10.5" rx="2" stroke-width="2"/>' +
            '<path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" stroke-width="2"/>',
        value: 'Zu',
        toggle: true,
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<rect x="7" y="14" width="18" height="13" rx="2" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M11 14V9a5 5 0 0 1 10 0v5" stroke="currentColor" stroke-width="2.5"/>' +
        '<circle cx="16" cy="20" r="2" fill="currentColor"/></svg>',
    deviceTypes: [Types.lock],
    fields: [
        { name: 'oid', type: 'id', label: 'oid_lock' },
        { name: 'oidActual', type: 'id', label: 'oid_actual' },
        { name: 'oidOpen', type: 'id', label: 'oid_open_door' },
        { name: 'inverted', type: 'checkbox', label: 'inverted', tooltip: 'lock_inverted_tooltip' },
    ],
    tile: { columns: 6, rows: 2, minColumns: 3 },
    markerShape: 'icon',
    confirmable: true,
    // a front door is asked about unless it is said otherwise
    confirmDefault: 'both',
    render: context => {
        const { data, accents, theme, t } = context;
        const raw = data.oidActual ? context.valueOf('oidActual') : context.valueOf('oid');
        const known = raw !== undefined && raw !== null;
        const truthy = raw === true || raw === 1 || raw === 'true' || raw === '1';
        const inverted = data.inverted === true || data.inverted === 'true';
        // in ioBroker a lock that is `true` is an open one: the state says whether it lets anyone through
        const unlocked = inverted ? !truthy : truthy;

        const accent = !known ? accents.off : unlocked ? accents.red : accents.green;
        const word = !known ? '--' : t(unlocked ? 'unlocked' : 'locked');

        return {
            accent,
            // a door that is not locked is worth seeing from across the room
            active: known && unlocked,
            icon: unlocked ? (
                <UnlockedIcon style={{ width: '100%', height: '100%' }} />
            ) : (
                <LockedIcon style={{ width: '100%', height: '100%' }} />
            ),
            value: word,
            valueColor: accent,
            stateText: word,
            control: (
                <SlideToggle
                    on={unlocked}
                    disabled={!data.oid}
                    color={accents.red}
                    offColor={theme.palette.divider}
                    onChange={() =>
                        context.act(unlocked ? 'off' : 'on', () =>
                            data.oid ? context.setValue(data.oid, !unlocked) : undefined,
                        )
                    }
                />
            ),
            // the door opener is a press, not a state: it belongs on a button of its own
            footer: data.oidOpen ? (
                <button
                    type="button"
                    disabled={context.editMode}
                    onClick={() => context.act('on', () => context.setValue(data.oidOpen as string, true))}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: `1px solid ${accents.yellow}`,
                        background: `${accents.yellow}22`,
                        color: accents.yellow,
                        font: 'inherit',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: context.editMode ? undefined : 'pointer',
                    }}
                >
                    <span style={{ display: 'flex', width: 18, height: 18 }}>
                        <DoorOpenIcon style={{ width: '100%', height: '100%' }} />
                    </span>
                    {t('open_door')}
                </button>
            ) : null,
        };
    },
});

export default lockDevice;
