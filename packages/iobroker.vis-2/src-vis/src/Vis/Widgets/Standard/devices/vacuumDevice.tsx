import React from 'react';

import {
    BatteryChargingFull as ChargingIcon,
    BatteryStd as BatteryIcon,
    Home as HomeIcon,
    Pause as PauseIcon,
    PlayArrow as StartIcon,
    CleaningServices as VacuumIcon,
} from '@mui/icons-material';

import { Types } from '@iobroker/type-detector';

import ModeButtons, { type Mode } from '../Base/controls/ModeButtons';
import { asNumber, asText } from '../Base/controls/stateValue';
import { defineDeviceWidget, type DeviceContext, type StandardRxData } from '../Base/defineDeviceWidget';

interface VacuumRxData extends StandardRxData {
    /** What it is doing: cleaning, returning, charging - whatever the object calls it */
    oidStatus?: string;
    /** How full the battery is */
    oidBattery?: string;
    /** The button that stops it where it stands */
    oidPause?: string;
    /** The button that sends it back to its dock */
    oidHome?: string;
    /** How hard it works: quiet, normal, turbo */
    oidMode?: string;
    /** It is charging, which is why the battery is climbing rather than falling */
    oidCharging?: string;
}

/** A MUI icon fills the box it is given instead of sizing itself by the font */
const ICON = { width: '100%', height: '100%' } as const;

/** The words a state carries for its values, where it carries any */
function wordOf(context: DeviceContext<VacuumRxData>, attr: string, value: unknown): string {
    const states = context.commonOf(attr)?.states;
    const text = asText(value);
    if (states && !Array.isArray(states)) {
        const word = (states as Record<string, string>)[text];
        if (word) {
            return word;
        }
    }
    return text;
}

/** What the vacuum can be set to, out of what its object says */
function modesOf(context: DeviceContext<VacuumRxData>): Mode[] {
    const states = context.commonOf('oidMode')?.states;
    if (!states) {
        return [];
    }
    const pairs: [string, string][] = Array.isArray(states)
        ? states.map((label, index) => [`${index}`, `${label}`])
        : Object.entries(states).map(([value, label]) => [value, `${label}`]);

    return pairs.map(([value, label]) => ({ value, label }));
}

/**
 * The robot: what it is doing, how full its battery is, and the three buttons it is worth having.
 *
 * A vacuum is a device one gives two orders to - go, and come back - and otherwise only looks at.
 * What it says about itself it says in its own words: `cleaning`, `charging`, `returning to dock`
 * come out of `common.states` of its status, because no two manufacturers agree on them and a list
 * in the widget would be wrong for the third one.
 *
 * The map some robots serve is not drawn here. It is a picture behind an address, so the camera
 * widget shows it, and it does that better than a second implementation would.
 */
const vacuumDevice = defineDeviceWidget<VacuumRxData>({
    name: 'Vacuum',
    label: 'widget_vacuum',
    help: 'help_vacuum',
    picture: {
        glyph:
            '<circle cx="12" cy="12" r="8.5" stroke-width="2"/>' +
            '<circle cx="12" cy="12" r="3" stroke-width="2"/>' +
            '<path d="M12 3.5v3" stroke-width="2" stroke-linecap="round"/>',
        value: 'Reinigt',
        toggle: true,
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<circle cx="16" cy="16" r="12" stroke="currentColor" stroke-width="2.5"/>' +
        '<circle cx="16" cy="16" r="4" fill="currentColor"/>' +
        '<path d="M16 4v4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
    deviceTypes: [Types.vacuumCleaner],
    wizard: {
        states: {
            oid: 'POWER',
            oidStatus: 'STATE',
            oidBattery: 'BATTERY',
            oidPause: 'PAUSE',
            oidHome: 'HOME',
            oidMode: ['WORK_MODE', 'MODE'],
        },
    },
    fields: [
        { name: 'oid', type: 'id', label: 'oid_vacuum_power' },
        { name: 'oidStatus', type: 'id', label: 'oid_vacuum_status' },
        { name: 'oidBattery', type: 'id', label: 'oid_battery' },
        { name: 'oidCharging', type: 'id', label: 'oid_charging' },
        { name: 'oidPause', type: 'id', label: 'oid_pause' },
        { name: 'oidHome', type: 'id', label: 'oid_home' },
        { name: 'oidMode', type: 'id', label: 'oid_mode' },
    ],
    tile: { columns: 6, rows: 4, minColumns: 4, minRows: 2 },
    markerShape: 'icon',
    // three buttons and a row of modes do not fit on a coin
    popup: true,
    // a robot that starts at three in the morning is worth a question
    confirmable: true,
    render: context => {
        const { data, accents, theme, t } = context;

        const running = !!context.valueOf('oid');
        const battery = asNumber(context.valueOf('oidBattery'));
        const charging = data.oidCharging ? !!context.valueOf('oidCharging') : false;
        const status = data.oidStatus ? wordOf(context, 'oidStatus', context.valueOf('oidStatus')) : '';

        const low = battery !== null && battery <= 20 && !charging;
        const accent = low ? accents.red : running ? accents.green : accents.off;

        const modes = modesOf(context);
        const mode = context.valueOf('oidMode');

        /** Send it off, or stop it where it stands */
        const toggle = (): void =>
            context.act(running ? 'off' : 'on', () => {
                if (running && data.oidPause) {
                    context.setValue(data.oidPause, true);
                } else if (data.oid) {
                    context.setValue(data.oid, !running);
                }
            });

        /**
         * One of the orders the robot takes.
         *
         * @param icon - the symbol in front of the word; it is drawn to the box it is given, which a MUI icon
         * does not do by itself - it takes its size from the font and would stand over its neighbours
         * @param label - the word on it
         * @param onClick - what it does
         * @param color - the colour it is drawn in
         */
        const button = (
            icon: React.ReactNode,
            label: string,
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
                <span
                    style={{
                        display: 'flex',
                        width: 16,
                        height: 16,
                        flexShrink: 0,
                    }}
                >
                    {icon}
                </span>
                {label}
            </button>
        );

        return {
            accent,
            active: running,
            icon: <VacuumIcon style={{ width: '100%', height: '100%' }} />,
            // what it says about itself, and otherwise whether it is out
            value: status || t(running ? 'vacuum_running' : 'vacuum_idle'),
            valueColor: accent,
            stateText: status || t(running ? 'vacuum_running' : 'vacuum_idle'),
            // the battery beside the status, because that is the other thing one wants to know
            control:
                battery === null ? null : (
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 2,
                            fontSize: context.tokens.smallSize,
                            color: low ? accents.red : theme.palette.text.secondary,
                        }}
                    >
                        <span style={{ display: 'flex', width: 16, height: 16, flexShrink: 0 }}>
                            {charging ? <ChargingIcon style={ICON} /> : <BatteryIcon style={ICON} />}
                        </span>
                        {`${Math.round(battery)} %`}
                    </span>
                ),
            /*
             * The orders stand at the bottom edge, with the modes under them. The middle of a card is where a
             * device draws itself - the window of a blind, the curve of a reading - and a robot draws nothing:
             * putting its buttons there hung them under the name with the status far below, while every card
             * beside it reads name, value, control from top to bottom.
             */
            footer:
                context.layout === 'default' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                        <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                            {button(
                                running ? <PauseIcon style={ICON} /> : <StartIcon style={ICON} />,
                                t(running ? 'vacuum_pause' : 'vacuum_start'),
                                toggle,
                                running ? accents.yellow : accents.green,
                            )}
                            {data.oidHome
                                ? button(
                                      <HomeIcon style={ICON} />,
                                      t('vacuum_home'),
                                      () => context.act('off', () => context.setValue(data.oidHome as string, true)),
                                      accents.blue,
                                  )
                                : null}
                        </div>
                        {modes.length ? (
                            <ModeButtons
                                modes={modes}
                                current={mode as string | number | boolean | undefined}
                                accent={accent}
                                theme={theme}
                                disabled={context.editMode}
                                onChange={value => data.oidMode && context.setValue(data.oidMode, value)}
                            />
                        ) : null}
                    </div>
                ) : null,
        };
    },
});

export default vacuumDevice;
