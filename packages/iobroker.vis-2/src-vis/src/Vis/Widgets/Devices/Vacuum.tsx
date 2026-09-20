import React, { type CSSProperties } from 'react';

import {
    Button,
    Card,
    CardContent,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Menu,
    MenuItem,
    Tooltip,
} from '@mui/material';

import { BatteryChargingFull, BatteryFull, Close, Home, Pause, PlayArrow } from '@mui/icons-material';

import { Icon, type Connection } from '@iobroker/gui-components';
import type {
    RxRenderWidgetProps,
    RxWidgetInfo,
    RxWidgetInfoAttributesField,
    VisWidgetCommand,
    WidgetData,
    VisRxWidgetState,
    VisRxWidgetProps,
} from '@iobroker/types-vis-2';

import Generic from './Generic';
import VacuumCleanerIcon from './Components/VacuumIcon';

export function FanIcon(props: { style?: React.CSSProperties; height?: number; width?: number }): React.JSX.Element {
    return (
        <svg
            viewBox="0 0 512 512"
            width={props.width || 20}
            height={props.height || props.width || 20}
            xmlns="http://www.w3.org/2000/svg"
            style={props.style}
        >
            <path
                fill="currentColor"
                d="M352.57 128c-28.09 0-54.09 4.52-77.06 12.86l12.41-123.11C289 7.31 279.81-1.18 269.33.13 189.63 10.13 128 77.64 128 159.43c0 28.09 4.52 54.09 12.86 77.06L17.75 224.08C7.31 223-1.18 232.19.13 242.67c10 79.7 77.51 141.33 159.3 141.33 28.09 0 54.09-4.52 77.06-12.86l-12.41 123.11c-1.05 10.43 8.11 18.93 18.59 17.62 79.7-10 141.33-77.51 141.33-159.3 0-28.09-4.52-54.09-12.86-77.06l123.11 12.41c10.44 1.05 18.93-8.11 17.62-18.59-10-79.7-77.51-141.33-159.3-141.33zM256 288a32 32 0 1 1 32-32 32 32 0 0 1-32 32z"
            />
        </svg>
    );
}

const styles: Record<string, CSSProperties> = {
    vacuumBattery: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
    },
    vacuumSensorsContainer: {
        overflow: 'auto',
    },
    vacuumSensors: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 4,
        minWidth: 'min-content',
    },
    vacuumButtons: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
    },
    vacuumContent: {
        width: '100%',
        height: '100%',
        overflow: 'auto',
    },
    vacuumMapContainer: { flex: 1 },
    vacuumTopPanel: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    vacuumBottomPanel: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    vacuumSensorCard: { boxShadow: 'none', backgroundColor: 'transparent' },
    vacuumSensorCardContent: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: 2,
        paddingBottom: 2,
    },
    vacuumSensorBigText: { fontSize: 20 },
    vacuumSensorSmallText: { fontSize: 12 },
    vacuumImage: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        color: 'grey',
    },
    vacuumSpeedContainer: { gap: 4, display: 'flex', alignItems: 'center' },
    tooltip: {
        pointerEvents: 'none',
    },
};

export type VACUUM_ID_ROLES_TYPE =
    | 'status'
    | 'battery'
    | 'is-charging'
    | 'fan-speed'
    | 'sensors-left'
    | 'filter-left'
    | 'main-brush-left'
    | 'side-brush-left'
    | 'cleaning-count'
    | 'start'
    | 'home'
    | 'pause'
    | 'map64';

export const VACUUM_ID_ROLES: Record<VACUUM_ID_ROLES_TYPE, { role?: string; name?: string }> = {
    status: { role: 'value.state' },
    battery: { role: 'value.battery' },
    'is-charging': { name: 'is_charging' },
    'fan-speed': { role: 'level.suction' },
    'sensors-left': { role: 'value.usage.sensors' },
    'filter-left': { role: 'value.usage.filter' },
    'main-brush-left': { role: 'value.usage.brush' },
    'side-brush-left': { role: 'value.usage.brush.side' },
    'cleaning-count': { name: 'cleanups' },
    start: { role: 'button', name: 'start' },
    home: { role: 'button', name: 'home' },
    pause: { role: 'button', name: 'pause' },
    map64: { role: 'vacuum.map.base64' },
};

const vacuumLoadStates = async (
    field: RxWidgetInfoAttributesField,
    data: WidgetData,
    changeData: (newData: WidgetData) => void,
    socket: Connection,
): Promise<void> => {
    if (data[field.name!]) {
        const object = await socket.getObject(data[field.name!]);
        if (object && object.common) {
            let parts = object._id.split('.');
            parts.pop();
            // try to find a device object
            let device = await socket.getObject(parts.join('.'));
            if (!device) {
                return;
            }
            if (device.type === 'channel' || device.type === 'folder') {
                parts.pop();
                device = await socket.getObject(parts.join('.'));
            }
            if (!device) {
                return;
            }
            if (device.type !== 'device') {
                parts = object._id.split('.');
                parts.pop();
            }

            const states = await socket.getObjectViewSystem(
                'state',
                `${parts.join('.')}.`,
                `${parts.join('.')}.\u9999`,
            );
            if (states) {
                let changed = false;
                for (const name in VACUUM_ID_ROLES) {
                    if (!data[`vacuum-${name as VACUUM_ID_ROLES_TYPE}-oid`]) {
                        // try to find state
                        Object.values(states).forEach(state => {
                            const _parts = state._id.split('.');
                            if (_parts.includes('rooms')) {
                                if (!data['vacuum-rooms']) {
                                    changed = true;
                                    data['vacuum-rooms'] = true;
                                }
                                return;
                            }

                            const role = state.common?.role;
                            const vacuumRole = VACUUM_ID_ROLES[name as VACUUM_ID_ROLES_TYPE].role;
                            if (vacuumRole && !role?.includes(vacuumRole)) {
                                return;
                            }
                            const vacuumName = VACUUM_ID_ROLES[name as VACUUM_ID_ROLES_TYPE].name;
                            if (vacuumName) {
                                const last = state._id.split('.').pop()!.toLowerCase();
                                if (!last.includes(vacuumName)) {
                                    return;
                                }
                            }

                            changed = true;
                            data[`vacuum-${name}-oid`] = state._id;
                        });
                    }
                }

                changed && changeData(data);
            }
        }
    }
};

export const VACUUM_CLEANING_STATES = ['cleaning', 'spot Cleaning', 'zone cleaning', 'room cleaning'];

export const VACUUM_PAUSE_STATES = ['pause', 'waiting'];

export const VACUUM_CHARGING_STATES = ['charging', 'charging Erro'];

export const VACUUM_GOING_HOME_STATES = ['back to home', 'docking'];

export const vacuumGetStatusColor = (status: string | boolean | null | undefined): string | undefined => {
    if (typeof status === 'boolean') {
        if (status) {
            return 'green';
        }
    } else {
        if (status === null || status === undefined) {
            status = '';
        }
        const smallStatus = status.toString().toLowerCase();
        if (VACUUM_CLEANING_STATES.includes(smallStatus)) {
            return 'green';
        }
        if (VACUUM_PAUSE_STATES.includes(smallStatus)) {
            return 'yellow';
        }
        if (VACUUM_CHARGING_STATES.includes(smallStatus)) {
            return 'gray';
        }
        if (VACUUM_GOING_HOME_STATES.includes(smallStatus)) {
            return 'blue';
        }
    }
    return undefined;
};

interface VacuumRxData {
    noCard: boolean;
    widgetTitle: string;
    externalDialog: boolean;
    'vacuum-status-oid': string;
    'vacuum-battery-oid': string;
    'vacuum-is-charging-oid': string;
    'vacuum-fan-speed-oid': string;
    'vacuum-sensors-left-oid': string;
    'vacuum-filter-left-oid': string;
    'vacuum-main-brush-left-oid': string;
    'vacuum-side-brush-left-oid': string;
    'vacuum-cleaning-count-oid': string;
    'vacuum-use-rooms': boolean;
    'vacuum-map64-oid': string;
    'vacuum-use-default-picture': boolean;
    'vacuum-own-image': string;
    'vacuum-start-oid': string;
    'vacuum-home-oid': string;
    'vacuum-pause-oid': string;
}

interface VacuumState extends VisRxWidgetState {
    showSpeedMenu: (EventTarget & HTMLButtonElement) | null;
    showRoomsMenu: HTMLButtonElement | null;
    dialog: boolean | null;
    objects: Partial<Record<VACUUM_ID_ROLES_TYPE, ioBroker.StateObject>>;
    rooms: null | { value: string; label: string }[];
}

class Vacuum extends Generic<VacuumRxData, VacuumState> {
    constructor(props: VisRxWidgetProps) {
        super(props);
        this.state = {
            ...this.state,
            objects: {},
            rooms: [],
        };
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplMaterial2Vacuum',
            visSet: 'devices',
            visSetLabel: 'set_label',
            visSetColor: '#00897b',
            visWidgetLabel: 'vacuum', // Label of widget
            visName: 'Vacuum',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        {
                            name: 'noCard',
                            label: 'without_card',
                            type: 'checkbox',
                            hidden: '!!data.externalDialog',
                        },
                        {
                            name: 'widgetTitle',
                            label: 'name',
                            hidden: '!!data.noCard || !!data.externalDialog',
                        },
                        {
                            name: 'externalDialog',
                            label: 'use_as_dialog',
                            type: 'checkbox',
                            tooltip: 'use_as_dialog_tooltip',
                        },
                    ],
                },
                {
                    name: 'sensors',
                    label: 'sensors',
                    fields: [
                        {
                            label: 'status',
                            name: 'vacuum-status-oid',
                            type: 'id',
                            onChange: vacuumLoadStates,
                        },
                        {
                            label: 'battery',
                            name: 'vacuum-battery-oid',
                            type: 'id',
                            onChange: vacuumLoadStates,
                        },
                        {
                            label: 'is_charging',
                            name: 'vacuum-is-charging-oid',
                            type: 'id',
                            onChange: vacuumLoadStates,
                        },
                        {
                            label: 'fan_speed',
                            name: 'vacuum-fan-speed-oid',
                            type: 'id',
                            onChange: vacuumLoadStates,
                        },
                        {
                            label: 'sensors_left',
                            name: 'vacuum-sensors-left-oid',
                            type: 'id',
                            onChange: vacuumLoadStates,
                        },
                        {
                            label: 'filter_left',
                            name: 'vacuum-filter-left-oid',
                            type: 'id',
                            onChange: vacuumLoadStates,
                        },
                        {
                            label: 'main_brush_left',
                            name: 'vacuum-main-brush-left-oid',
                            type: 'id',
                            onChange: vacuumLoadStates,
                        },
                        {
                            label: 'side_brush_left',
                            name: 'vacuum-side-brush-left-oid',
                            type: 'id',
                            onChange: vacuumLoadStates,
                        },
                        {
                            label: 'cleaning_count',
                            name: 'vacuum-cleaning-count-oid',
                            type: 'id',
                            onChange: vacuumLoadStates,
                        },
                    ],
                },
                {
                    name: 'map',
                    label: 'map',
                    fields: [
                        {
                            label: 'rooms',
                            name: 'vacuum-use-rooms',
                            type: 'checkbox',
                            tooltip: 'rooms_tooltip',
                        },
                        {
                            label: 'map64',
                            name: 'vacuum-map64-oid',
                            type: 'id',
                            onChange: vacuumLoadStates,
                        },
                        {
                            label: 'useDefaultPicture',
                            name: 'vacuum-use-default-picture',
                            type: 'checkbox',
                            default: true,
                            hidden: '!!data["vacuum-map64-oid"]',
                        },
                        {
                            label: 'ownImage',
                            name: 'vacuum-own-image',
                            type: 'image',
                            hidden: '!!data["vacuum-map64-oid"] || !data["vacuum-use-default-picture"]',
                        },
                    ],
                },
                {
                    name: 'actions',
                    label: 'actions',
                    fields: [
                        {
                            label: 'start',
                            name: 'vacuum-start-oid',
                            type: 'id',
                        },
                        {
                            label: 'home',
                            name: 'vacuum-home-oid',
                            type: 'id',
                        },
                        {
                            label: 'pause',
                            name: 'vacuum-pause-oid',
                            type: 'id',
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: '100%',
                height: 400,
                position: 'relative',
            },
            visPrev: 'widgets/devices/img/prev_vacuum.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return Vacuum.getWidgetInfo();
    }

    async componentDidMount(): Promise<void> {
        super.componentDidMount();
        await this.vacuumPropertiesUpdate();
    }

    async onRxDataChanged(/* prevRxData */): Promise<void> {
        await this.vacuumPropertiesUpdate();
    }

    async vacuumPropertiesUpdate(): Promise<void> {
        const objects: Partial<Record<VACUUM_ID_ROLES_TYPE, ioBroker.StateObject>> = {};
        const oids: string[] = [];
        const keys: VACUUM_ID_ROLES_TYPE[] = Object.keys(VACUUM_ID_ROLES) as VACUUM_ID_ROLES_TYPE[];
        for (let k = 0; k < keys.length; k++) {
            const oid = this.state.rxData[`vacuum-${keys[k]}-oid`];
            if (oid) {
                oids.push(oid);
            }
        }
        const _objects = (await this.props.context.socket.getObjectsById(oids)) ?? {};

        // read all objects at once
        Object.values(_objects).forEach(obj => {
            const oid = keys.find(_oid => this.state.rxData[`vacuum-${_oid}-oid`] === obj._id);
            if (oid) {
                objects[oid] = obj as ioBroker.StateObject;
            }
        });

        const rooms = await this.vacuumLoadRooms();
        this.setState({ objects, rooms });
    }

    async vacuumLoadRooms(): Promise<null | { value: string; label: string }[]> {
        if (this.state.rxData['vacuum-use-rooms']) {
            // try to detect the `rooms` object according to status OID
            // mihome-vacuum.0.info.state => mihome-vacuum.0.rooms
            if (this.state.rxData['vacuum-status-oid']) {
                const parts = this.state.rxData['vacuum-status-oid'].split('.');
                if (parts.length === 4) {
                    parts.pop();
                    parts.pop();
                    parts.push('rooms');
                    const rooms = await this.props.context.socket.getObjectViewSystem(
                        'channel',
                        `${parts.join('.')}.room`,
                        `${parts.join('.')}.room\u9999`,
                    );
                    const result: { value: string; label: string }[] = [];
                    Object.keys(rooms).forEach(id =>
                        result.push({
                            value: `${id}.roomClean`,
                            label: Generic.getText(rooms[id].common?.name || id.split('.').pop() || ''),
                        }),
                    );
                    result.sort((a, b) => a.label.localeCompare(b.label));
                    return result;
                }
            }
        }

        return null;
    }

    vacuumGetValue(id: VACUUM_ID_ROLES_TYPE, numberValue?: boolean): string | boolean | null | undefined {
        const obj = this.vacuumGetObj(id);
        if (!obj) {
            return null;
        }
        const value: string = this.state.values[`${obj._id}.val`];
        if (!numberValue && obj.common?.states) {
            if (
                (obj.common.states as Record<string, string>)[value] !== undefined &&
                (obj.common.states as Record<string, string>)[value] !== null
            ) {
                return (obj.common.states as Record<string, string>)[value];
            }
        }
        return value;
    }

    vacuumGetObj(id: VACUUM_ID_ROLES_TYPE): undefined | ioBroker.StateObject {
        return this.state.objects[id];
    }

    vacuumRenderBattery(): React.JSX.Element | null {
        const batterObj = this.vacuumGetObj('battery');
        return batterObj ? (
            <div style={styles.vacuumBattery}>
                {this.vacuumGetObj('is-charging') && this.vacuumGetValue('is-charging') ? (
                    <BatteryChargingFull />
                ) : (
                    <BatteryFull />
                )}
                {this.vacuumGetValue('battery') || 0} {batterObj.common?.unit}
            </div>
        ) : null;
    }

    vacuumRenderSpeed(): (React.JSX.Element | null)[] | null {
        const obj = this.vacuumGetObj('fan-speed');
        if (!obj) {
            return null;
        }
        let options: Record<string, string> | null = null;

        if (Array.isArray(obj.common.states)) {
            options = {};
            obj.common.states.forEach(item => (options![item] = item));
        } else {
            options = obj.common.states as Record<string, string>;
        }

        let value = this.vacuumGetValue('fan-speed', true);
        if (value === null || value === undefined) {
            value = '';
        }
        value = value.toString();

        return [
            <Button
                key="speed"
                style={styles.vacuumSpeedContainer}
                endIcon={<FanIcon />}
                onClick={e => {
                    e.stopPropagation();
                    this.setState({ showSpeedMenu: e.currentTarget });
                }}
            >
                {options[value] !== undefined && options[value] !== null
                    ? Generic.t(options[value]).replace('vis_2_widgets_devices_', '')
                    : value}
            </Button>,
            this.state.showSpeedMenu ? (
                <Menu
                    open={!0}
                    anchorEl={this.state.showSpeedMenu}
                    key="speedMenu"
                    onClose={() => this.setState({ showSpeedMenu: null })}
                >
                    {Object.keys(options).map(state => (
                        <MenuItem
                            key={state}
                            selected={value === state}
                            onClick={() => {
                                this.setState({ showSpeedMenu: null }, () =>
                                    this.props.context.setValue(this.state.rxData['vacuum-fan-speed-oid'], state),
                                );
                            }}
                        >
                            {Generic.t(options[state]).replace('vis_2_widgets_devices_', '')}
                        </MenuItem>
                    ))}
                </Menu>
            ) : null,
        ];
    }

    vacuumRenderRooms(): React.ReactNode {
        if (!this.state.rooms?.length) {
            return null;
        }
        return [
            <Button
                variant="outlined"
                color="grey"
                key="rooms"
                onClick={e => this.setState({ showRoomsMenu: e.currentTarget })}
            >
                {Generic.t('Room')}
            </Button>,
            this.state.showRoomsMenu ? (
                <Menu
                    onClose={() => this.setState({ showRoomsMenu: null })}
                    open={!0}
                    anchorEl={this.state.showRoomsMenu}
                    key="roomsMenu"
                >
                    {this.state.rooms.map(room => (
                        <MenuItem
                            key={room.value}
                            value={room.value}
                            onClick={() => {
                                // build together mihome-vacuum.0.rooms.room1.roomClean
                                const id = room.value;
                                this.setState({ showRoomsMenu: null }, () => this.props.context.setValue(id, true));
                            }}
                        >
                            {room.label}
                        </MenuItem>
                    ))}
                </Menu>
            ) : null,
        ];
    }

    vacuumRenderSensors(): React.ReactNode {
        const sensors: VACUUM_ID_ROLES_TYPE[] = (
            [
                'filter-left',
                'side-brush-left',
                'main-brush-left',
                'sensors-left',
                'cleaning-count',
            ] as VACUUM_ID_ROLES_TYPE[]
        ).filter(sensor => this.vacuumGetObj(sensor));

        return sensors.length ? (
            <div style={styles.vacuumSensorsContainer}>
                <div style={styles.vacuumSensors}>
                    {sensors.map(sensor => {
                        const object = this.vacuumGetObj(sensor)!;

                        return (
                            <Card
                                key={sensor}
                                style={styles.vacuumSensorCard}
                            >
                                <CardContent style={{ ...styles.vacuumSensorCardContent, paddingBottom: 2 }}>
                                    <div>
                                        <span style={styles.vacuumSensorBigText}>
                                            {this.vacuumGetValue(sensor) || 0}
                                        </span>{' '}
                                        <span style={styles.vacuumSensorSmallText}>{object.common.unit}</span>
                                    </div>
                                    <div>
                                        <span style={styles.vacuumSensorSmallText}>
                                            {Generic.t(sensor.replace(/-/g, '_'))}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        ) : null;
    }

    vacuumRenderButtons(): React.ReactNode {
        let statusColor: string | undefined;
        const statusObj = this.vacuumGetObj('status');
        let status = '';
        let smallStatus;
        if (statusObj) {
            const statusVal = this.vacuumGetValue('status');
            statusColor = vacuumGetStatusColor(statusVal);
            if (typeof statusVal === 'boolean') {
                smallStatus = statusVal ? 'cleaning' : 'pause';
                status = statusVal ? 'Cleaning' : 'Pause';
            } else {
                if (statusVal === null || statusVal === undefined) {
                    status = '';
                }
                status = (statusVal || '').toString();
                smallStatus = status.toLowerCase();
            }
        }

        return (
            <div style={styles.vacuumButtons}>
                {this.vacuumGetObj('start') && (!smallStatus || !VACUUM_CLEANING_STATES.includes(smallStatus)) && (
                    <Tooltip
                        title={Generic.t('Start')}
                        slotProps={{ popper: { sx: styles.tooltip } }}
                    >
                        <IconButton
                            onClick={() => this.props.context.setValue(this.state.rxData['vacuum-start-oid'], true)}
                        >
                            <PlayArrow />
                        </IconButton>
                    </Tooltip>
                )}
                {this.vacuumGetObj('pause') &&
                    (!smallStatus || !VACUUM_PAUSE_STATES.includes(smallStatus)) &&
                    (!smallStatus || !VACUUM_CHARGING_STATES.includes(smallStatus)) && (
                        <Tooltip
                            title={Generic.t('Pause')}
                            slotProps={{ popper: { sx: styles.tooltip } }}
                        >
                            <IconButton
                                onClick={() => this.props.context.setValue(this.state.rxData['vacuum-pause-oid'], true)}
                            >
                                <Pause />
                            </IconButton>
                        </Tooltip>
                    )}
                {this.vacuumGetObj('home') && (!smallStatus || !VACUUM_CHARGING_STATES.includes(smallStatus)) && (
                    <Tooltip
                        title={Generic.t('Home')}
                        slotProps={{ popper: { sx: styles.tooltip } }}
                    >
                        <IconButton
                            onClick={() => this.props.context.setValue(this.state.rxData['vacuum-home-oid'], true)}
                        >
                            <Home />
                        </IconButton>
                    </Tooltip>
                )}
                {statusObj && (
                    <Tooltip
                        title={Generic.t('Status')}
                        slotProps={{ popper: { sx: styles.tooltip } }}
                    >
                        <div style={{ color: statusColor }}>
                            {Generic.t(status).replace('vis_2_widgets_devices_', '')}
                        </div>
                    </Tooltip>
                )}
            </div>
        );
    }

    vacuumRenderMap(): React.ReactNode {
        const obj = this.vacuumGetObj('map64');
        if (!obj || !this.state.values[`${obj._id}.val`]) {
            if (this.state.rxData['vacuum-use-default-picture']) {
                return <VacuumCleanerIcon style={styles.vacuumImage} />;
            }
            if (this.state.rxData['vacuum-own-image']) {
                return (
                    <Icon
                        src={this.state.rxData['vacuum-own-image']}
                        style={styles.vacuumImage}
                    />
                );
            }
            return null;
        }

        return (
            <img
                src={this.state.values[`${obj._id}.val`]}
                alt="vacuum"
                style={styles.vacuumImage}
            />
        );
    }

    onCommand(command: VisWidgetCommand): any {
        const result = super.onCommand(command);
        if (result === false) {
            if (command === 'openDialog') {
                this.setState({ dialog: true });
                return true;
            }
            if (command === 'closeDialog') {
                this.setState({ dialog: false });
                return true;
            }
        }

        return result;
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element[] | React.JSX.Element | null {
        super.renderWidgetBody(props);
        const rooms = this.vacuumRenderRooms();
        const battery = this.vacuumRenderBattery();
        let height = 0;
        if (rooms) {
            height += 36;
        } else if (battery) {
            height += 24;
        }
        const sensors = this.vacuumRenderSensors();
        if (sensors) {
            height += 46;
        }

        const buttons = this.vacuumRenderButtons();
        const speed = this.vacuumRenderSpeed();

        if (buttons || rooms) {
            height += 40;
        }

        const map = this.vacuumRenderMap();

        const content = (
            <div style={styles.vacuumContent}>
                {battery || rooms ? (
                    <div style={styles.vacuumTopPanel}>
                        {rooms}
                        {battery}
                    </div>
                ) : null}
                {map ? (
                    <div
                        style={{ ...styles.vacuumMapContainer, height: `calc(100% - ${height + 5}px)`, width: '100%' }}
                    >
                        {map}
                    </div>
                ) : null}
                {sensors}
                {buttons || speed ? (
                    <div style={styles.vacuumBottomPanel}>
                        {buttons}
                        {speed}
                    </div>
                ) : null}
            </div>
        );

        if (this.state.rxData.externalDialog && !this.props.editMode) {
            return this.state.dialog ? (
                <Dialog
                    open={!0}
                    onClose={() => this.setState({ dialog: null })}
                >
                    <DialogTitle>
                        {this.state.rxData.widgetTitle}
                        <IconButton
                            style={{ float: 'right', zIndex: 2 }}
                            onClick={() => this.setState({ dialog: null })}
                        >
                            <Close />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>{content}</DialogContent>
                </Dialog>
            ) : null;
        }

        return this.wrapContent(content);
    }
}

export default Vacuum;
