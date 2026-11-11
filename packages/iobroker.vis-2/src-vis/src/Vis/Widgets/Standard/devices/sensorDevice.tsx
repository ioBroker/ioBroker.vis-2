import React from 'react';

import {
    DirectionsRun as MotionIcon,
    DoorFront as DoorIcon,
    LocalFireDepartment as SmokeIcon,
    Person as PersonIcon,
    Sensors as GenericIcon,
    Water as WaterIcon,
    WbSunny as BrightIcon,
    Window as WindowIcon,
} from '@mui/icons-material';

import { Types } from '../Base/deviceTypes';

import { IconBell, Icon } from '@iobroker/gui-components';

import { defineDeviceWidget, type StandardRxData } from '../Base/defineDeviceWidget';
import { initialsOf } from '../Base/controls/countStates';

/** What kind of thing the sensor watches, which decides its symbol and its two words */
type SensorKind = 'contact' | 'window' | 'door' | 'motion' | 'smoke' | 'water' | 'light' | 'person' | 'generic';

/**
 * The bell of an alarm. It stands there only for as long as the alarm does, and a bell rings on a change and not
 * when it appears, so it gives itself that change.
 */
function AlarmBell(): React.JSX.Element {
    const [ring, setRing] = React.useState(false);

    React.useEffect(() => setRing(true), []);

    return (
        <IconBell
            ring={ring}
            style={{ width: '100%', height: '100%' }}
        />
    );
}

interface SensorRxData extends StandardRxData {
    kind?: SensorKind;
    /** The state says the opposite of what it means */
    inverted?: boolean | 'true';
    /** What it is called while it is true; without it the word of its kind */
    textOn?: string;
    /** What it is called while it is false */
    textOff?: string;
    /** The picture it is drawn with while it is true; without it the symbol of its kind */
    iconOn?: string;
    /** The picture while it is false */
    iconOff?: string;
    /** The colour it is drawn in while it is true */
    colorOn?: string;
    /** The colour while it is false */
    colorOff?: string;
    /** This is something to be alarmed about, not something to know */
    alarm?: boolean | 'true';
    /**
     * The photo of the person, for the kind `person`.
     *
     * The name has `icon` in it for a reason: an image of the project is stored as `_PRJ_NAME/...`, and the
     * base widget turns that into a path only for an attribute whose name says it is a picture.
     */
    iconPhoto?: string;
}

interface PersonPictureProps {
    photo?: string;
    name?: string;
    /** At home: in colour */
    present: boolean;
    /** The colour of the ring */
    ring: string;
    /** How wide the ring is, in px */
    ringWidth: number;
    /** What the circle is filled with behind initials */
    background: string;
}

/**
 * A person in a circle: the photo, in colour while they are at home and grey while they are away.
 *
 * Grey rather than gone: a row of faces is read at a glance as who is there, and that only works while
 * everyone keeps their place. Without a photo the initials of the name stand in the circle, and without a
 * name the outline of a person. A photo that cannot be loaded is treated as none, not as a broken image.
 *
 * @param props - what to draw
 */
function PersonPicture(props: PersonPictureProps): React.JSX.Element {
    const [failed, setFailed] = React.useState(false);

    React.useEffect(() => setFailed(false), [props.photo]);

    const initials = initialsOf(props.name);
    let inside: React.ReactNode;
    if (props.photo && !failed) {
        inside = (
            <img
                src={props.photo}
                alt={props.name || ''}
                draggable={false}
                onError={() => setFailed(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
        );
    } else if (initials) {
        inside = <span style={{ fontSize: '42cqmin', fontWeight: 600, lineHeight: 1 }}>{initials}</span>;
    } else {
        inside = <PersonIcon style={{ width: '72%', height: '72%' }} />;
    }

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                borderRadius: '50%',
                overflow: 'hidden',
                border: props.ringWidth ? `${props.ringWidth}px solid ${props.ring}` : undefined,
                background: props.background,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                // the initials are sized by the circle they stand in
                containerType: 'size',
                filter: props.present ? undefined : 'grayscale(1)',
                opacity: props.present ? 1 : 0.55,
                transition: 'filter 0.4s, opacity 0.4s, border-color 0.4s',
            }}
        >
            {inside}
        </div>
    );
}

/**
 * The big circle of a person: as large as the card leaves room for, and always a circle.
 *
 * @param props - what to draw
 * @param props.children - the circle
 */
function LargestCircle(props: { children: React.ReactNode }): React.JSX.Element {
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    containerType: 'size',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <div style={{ width: 'min(100cqw, 100cqh)', height: 'min(100cqw, 100cqh)' }}>{props.children}</div>
            </div>
        </div>
    );
}

/** The two words of each kind, as they stand in the i18n of these sets */
const WORDS: Record<SensorKind, { on: string; off: string }> = {
    contact: { on: 'open', off: 'closed' },
    window: { on: 'open', off: 'closed' },
    door: { on: 'open', off: 'closed' },
    motion: { on: 'motion', off: 'no_motion' },
    smoke: { on: 'smoke', off: 'sensor_quiet' },
    water: { on: 'water', off: 'sensor_dry' },
    light: { on: 'bright', off: 'dark' },
    person: { on: 'person_home', off: 'person_away' },
    generic: { on: 'on', off: 'off' },
};

/** The symbol of each kind */
const ICONS: Record<SensorKind, React.ReactNode> = {
    contact: <WindowIcon style={{ width: '100%', height: '100%' }} />,
    window: <WindowIcon style={{ width: '100%', height: '100%' }} />,
    door: <DoorIcon style={{ width: '100%', height: '100%' }} />,
    motion: <MotionIcon style={{ width: '100%', height: '100%' }} />,
    smoke: <SmokeIcon style={{ width: '100%', height: '100%' }} />,
    water: <WaterIcon style={{ width: '100%', height: '100%' }} />,
    light: <BrightIcon style={{ width: '100%', height: '100%' }} />,
    person: <PersonIcon style={{ width: '100%', height: '100%' }} />,
    generic: <GenericIcon style={{ width: '100%', height: '100%' }} />,
};

/**
 * The sensor: a state that is only ever one of two things, and a card that says which.
 *
 * A window, a door, a motion detector, a smoke alarm, a water sensor - the same widget for all of them, and
 * what it is called is the only difference between them. `alarm` is what turns one into the other: a window
 * that is open is worth knowing, a smoke detector that has gone off is worth a red card that pulses, and
 * whether a given device is the one or the other is the user's judgement, not the widget's. A contact on a
 * garden gate at night is an alarm; the same contact on the kitchen window in July is not.
 *
 * Where the state is logged, a click opens its history - drawn as a step curve, which is how a thing that
 * jumps between two values actually behaves.
 *
 * The kind `person` is the presence of somebody: their photo in a big circle, grey while they are away. The
 * card shows it as its body; a row and a coloured card, which have no body, show it in place of the icon, and
 * a marker is the face itself.
 */
const sensorDevice = defineDeviceWidget<SensorRxData>({
    name: 'Sensor',
    label: 'widget_sensor',
    help: 'help_sensor',
    picture: {
        glyph:
            '<path d="M12 3v5M12 16v5M3 12h5M16 12h5" stroke-width="2" stroke-linecap="round"/>' +
            '<circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"/>',
        value: 'Offen',
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<rect x="5" y="5" width="22" height="22" rx="3" stroke="currentColor" stroke-width="2"/>' +
        '<circle cx="16" cy="16" r="4" fill="currentColor"/></svg>',
    deviceTypes: [
        Types.window,
        Types.windowTilt,
        Types.door,
        Types.motion,
        Types.fireAlarm,
        Types.floodAlarm,
        Types.coAlarm,
        Types.contact,
        Types.buttonSensor,
    ],
    wizard: {
        // a window and a door are shown by the window widget, which draws them; the rest is a sensor
        types: [Types.motion, Types.fireAlarm, Types.floodAlarm, Types.coAlarm, Types.contact, Types.buttonSensor],
        states: { oid: ['ACTUAL', 'PRESS'] },
        data: {
            [Types.motion]: { kind: 'motion' },
            [Types.fireAlarm]: { kind: 'smoke', alarm: true },
            [Types.coAlarm]: { kind: 'smoke', alarm: true },
            [Types.floodAlarm]: { kind: 'water', alarm: true },
            [Types.contact]: { kind: 'contact' },
            [Types.buttonSensor]: { kind: 'generic' },
        },
    },
    fields: [
        { name: 'oid', type: 'id', label: 'oid' },
        {
            name: 'kind',
            type: 'select',
            label: 'sensor_kind',
            default: 'contact',
            options: [
                { value: 'contact', label: 'sensor_contact' },
                { value: 'window', label: 'sensor_window' },
                { value: 'door', label: 'sensor_door' },
                { value: 'motion', label: 'sensor_motion' },
                { value: 'smoke', label: 'sensor_smoke' },
                { value: 'water', label: 'sensor_water' },
                { value: 'light', label: 'sensor_light' },
                { value: 'person', label: 'sensor_person' },
                { value: 'generic', label: 'sensor_generic' },
            ],
        },
        {
            name: 'iconPhoto',
            type: 'image',
            label: 'person_photo',
            tooltip: 'person_photo_tooltip',
            hidden: 'data.kind !== "person"',
        },
        { name: 'alarm', type: 'checkbox', label: 'sensor_alarm', tooltip: 'sensor_alarm_tooltip' },
        { name: 'inverted', type: 'checkbox', label: 'inverted' },
        { name: 'textOn', label: 'text_on' },
        { name: 'textOff', label: 'text_off' },
        { name: 'iconOn', type: 'icon-image', label: 'icon_on', tooltip: 'sensor_own_look_tooltip' },
        { name: 'iconOff', type: 'icon-image', label: 'icon_off' },
        { name: 'colorOn', type: 'color', label: 'color_on' },
        { name: 'colorOff', type: 'color', label: 'color_off' },
    ],
    tile: { columns: 6, rows: 2, minColumns: 3 },
    markerShape: 'icon',
    render: context => {
        const { data, accents, t, theme } = context;
        const kind: SensorKind = data.kind || 'contact';
        const raw = context.valueOf('oid');
        const known = raw !== undefined && raw !== null;

        // a state that says `false`, `0` or nothing at all is the quiet one
        const truthy = raw === true || raw === 1 || raw === 'true' || raw === '1' || raw === 'on';
        const inverted = data.inverted === true || data.inverted === 'true';
        const active = known && (inverted ? !truthy : truthy);
        const alarming = (data.alarm === true || data.alarm === 'true') && active;

        const word = active ? data.textOn || t(WORDS[kind].on) : data.textOff || t(WORDS[kind].off);

        // what the widget was told to use for this state, and otherwise the colours of the set
        const ownColour = active ? data.colorOn : data.colorOff;
        const person = kind === 'person';
        // somebody at home is good news, not a warning
        const activeColour = person ? accents.green : accents.yellow;
        const accent =
            ownColour || (!known ? accents.off : alarming ? accents.red : active ? activeColour : accents.off);
        const ownIcon = active ? data.iconOn : data.iconOff;
        const chart = { attrs: ['oid'] };

        if (person) {
            const picture = (ringWidth: number): React.JSX.Element => (
                <PersonPicture
                    photo={data.iconPhoto}
                    name={data.widgetTitle}
                    present={active}
                    ring={accent}
                    ringWidth={ringWidth}
                    background={theme.palette.action.selected}
                />
            );
            const value = known ? word : '--';
            // the card has room for the big circle; a row and a coloured card have only the place of the icon
            const big = context.layout === 'default';

            return {
                accent,
                active: alarming,
                icon: big ? null : picture(2),
                // the photo is the more exact answer than any icon chosen for the widget
                ownIcon: true,
                body: big ? <LargestCircle>{picture(3)}</LargestCircle> : undefined,
                face: picture(0),
                value,
                valueColor: accent,
                stateText: value,
                chart,
            };
        }

        return {
            accent,
            // an alarm fills its card and its marker; an open window colours the ring and leaves it at that
            active: alarming,
            icon: ownIcon ? (
                <Icon
                    src={ownIcon}
                    style={{ width: '100%', height: '100%' }}
                />
            ) : alarming ? (
                <AlarmBell />
            ) : (
                ICONS[kind]
            ),
            // a picture that was chosen for this state is not replaced by the general icon of the widget
            ownIcon: !!ownIcon,
            value: known ? word : '--',
            valueColor: accent,
            stateText: known ? word : '--',
            // a state that jumps between two values is worth looking at over time: when did the window open
            chart,
        };
    },
});

export default sensorDevice;
