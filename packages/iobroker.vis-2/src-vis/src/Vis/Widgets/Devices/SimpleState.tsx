// ------------------- deprecated, use Switches.jsx instead -------------------
import React from 'react';

import { Button, Dialog, DialogContent, DialogTitle, Slider, IconButton, Box } from '@mui/material';

import {
    Lightbulb as LightbulbIconOn,
    LightbulbOutlined as LightbulbIconOff,
    Close as CloseIcon,
} from '@mui/icons-material';

import { CircularSliderWithChildren } from 'react-circular-slider-svg';

import { Icon, type IobTheme } from '@iobroker/gui-components';
import type {
    RxRenderWidgetProps,
    RxWidgetInfo,
    VisRxWidgetProps,
    VisRxWidgetState,
    VisRxWidgetStateValues,
} from '@iobroker/types-vis-2';

import Generic from './Generic';

const styles: Record<string, any> = {
    intermediate: {
        opacity: 0.2,
    },
    text: {
        textTransform: 'none',
    },
    button: {
        display: 'block',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        padding: 0,
    },
    buttonInactive: {
        opacity: 0.6,
    },
    topButton: {
        display: 'flex',
        alignItems: 'center',
    },
    iconButton: {
        width: '50%',
        height: 40,
        display: 'flex',
        textAlign: 'left',
        alignItems: 'center',
    },
    iconButtonCenter: {
        width: '100%',
        height: 40,
        display: 'flex',
        textAlign: 'center',
        justifyContent: 'center',
    },
    rightButton: (theme: IobTheme): any => ({
        width: '50%',
        textAlign: 'right',
        position: 'relative',
        mt: '-20px',
        mb: '-20px',
        left: '20px',
        display: 'flex',
        justifyContent: 'right',
        color: theme.palette.mode === 'light' ? '#000' : '#fff',
        '&>div': {
            margin: 'auto',
            '&>div': {
                transform: 'translate(-50%, -50%) !important',
                top: '50% !important',
            },
        },
    }),
    iconSwitch: {
        width: 40,
        height: 40,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardsHolder: {
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        alignItems: 'center',
    },
    allButtonsTitle: {
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        width: '100%',
        alignItems: 'center',
    },
    buttonDiv: {
        display: 'inline-block',
        width: 120,
        height: 80,
        textAlign: 'center',
    },
    iconCustom: {
        maxWidth: 40,
        maxHeight: 40,
    },
    newValueLight: {
        animation: 'vis-2-widgets-material-newValueAnimationLight 2s ease-in-out',
    },
    newValueDark: {
        animation: 'vis-2-widgets-material-newValueAnimationDark 2s ease-in-out',
    },
};

interface SimpleStateRxData {
    noCard: boolean | 'true';
    widgetTitle: string;
    values_count: number;
    oid: string;
    noIcon: boolean | 'true';
    icon: string;
    iconSmall: string;
    iconEnabled: string;
    iconEnabledSmall: string;
    iconSize: number | string;
    color: string;
    colorEnabled: string;
    title: string;
    circleSize: number;
    readOnly: boolean | 'true';
    unit: string;
    timeout: number | string;
    step: number | string;
    [key: `value${number}`]: string;
    [key: `icon${number}`]: string;
    [key: `iconSmall${number}`]: string;
    [key: `color${number}`]: string;
    [key: `title${number}`]: string;
    [key: `iconSize${number}`]: number;
}

interface SimpleStateState extends VisRxWidgetState {
    showDimmerDialog: boolean | null;
    object: { common: ioBroker.StateCommon; _id: string; type: ioBroker.ObjectType | '' };
    controlValue: { value: number; changed: boolean } | null;
}

export default class SimpleState extends Generic<SimpleStateRxData, SimpleStateState> {
    private readonly refDiv: React.RefObject<HTMLDivElement | null> = React.createRef();
    private updateTimeout: ReturnType<typeof setTimeout> | null = null;
    private updateTimer1: ReturnType<typeof setTimeout> | null = null;
    private lastRxData: string | null = null;
    private controlTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(props: VisRxWidgetProps) {
        super(props);
        this.state = {
            ...this.state,
            showDimmerDialog: null,
            object: { common: {} as ioBroker.StateCommon, _id: '', type: '' },
            controlValue: null,
        };
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplMaterial2SimpleState',
            visSet: 'devices',
            visSetLabel: 'set_label',
            visSetColor: '#00897b',
            visName: 'SimpleState',
            visWidgetLabel: 'simple_state',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        {
                            name: 'noCard',
                            label: 'without_card',
                            type: 'checkbox',
                            noBinding: false,
                        },
                        {
                            name: 'widgetTitle',
                            label: 'name',
                            hidden: 'data.noCard === true',
                        },
                        {
                            name: 'values_count',
                            type: 'number',
                            hidden: '!data.withStates',
                            default: 2,
                            label: 'values_count',
                        },
                        {
                            name: 'oid',
                            type: 'id',
                            label: 'oid',
                            onChange: async (field, data, changeData, socket) => {
                                if (data.oid) {
                                    const object = (await socket.getObject(data.oid)) as
                                        | ioBroker.StateObject
                                        | null
                                        | undefined;
                                    if (object?.common?.states) {
                                        let states: Record<string, string>;
                                        if (Array.isArray(object.common.states)) {
                                            // convert to {'state1': 'state1', 'state2': 'state2', ...}
                                            states = {};
                                            object.common.states.forEach(state => (states[state] = state));
                                        } else {
                                            states = object.common.states as Record<string, string>;
                                        }
                                        object.common.states = states;
                                        data.values_count = Object.keys(states).length;
                                        data.withStates = true;
                                        data.withNumber = false;
                                        Object.keys(states).forEach(
                                            (state, index) => (data[`value${index + 1}`] = states[state]),
                                        );
                                        changeData(data);
                                    } else if (object?.common) {
                                        data.withNumber = object.common.type === 'number';
                                        data.withStates = false;
                                        data.values_count = 0;
                                        changeData(data);
                                    }
                                }
                            },
                        },
                        {
                            name: 'noIcon',
                            type: 'checkbox',
                            label: 'no_icon',
                            noBinding: false,
                        },
                        {
                            name: 'icon',
                            type: 'image',
                            hidden: 'data.noIcon === true || !!data.iconSmall',
                            label: 'icon',
                        },
                        {
                            name: 'iconSmall',
                            type: 'icon64',
                            label: 'small_icon',
                            hidden: 'data.noIcon === true || !!data.icon',
                        },
                        {
                            name: 'iconEnabled',
                            hidden: 'data.noIcon === true || !!data.iconEnabledSmall',
                            type: 'image',
                            label: 'icon_active',
                        },
                        {
                            name: 'iconEnabledSmall',
                            type: 'icon64',
                            label: 'small_icon_active',
                            hidden: 'data.noIcon === true || !!data.iconEnabled',
                        },
                        {
                            name: 'iconSize',
                            label: 'icon_size',
                            type: 'slider',
                            tooltip: 'icon_size_tooltip',
                            min: 0,
                            max: 300,
                            hidden: 'data.noIcon === true || (!data.icon && !data.iconSmall && !data.iconEnabled && !data.iconEnabledSmall)',
                        },
                        {
                            name: 'color',
                            type: 'color',
                            label: 'color',
                        },
                        {
                            name: 'colorEnabled',
                            type: 'color',
                            label: 'color_active',
                        },
                        {
                            name: 'title',
                            label: 'title',
                        },
                        {
                            name: 'circleSize',
                            label: 'circle_size',
                            type: 'slider',
                            min: 0,
                            max: 200,
                            default: 0,
                            hidden: '!data.withNumber',
                        },
                        {
                            name: 'readOnly',
                            type: 'checkbox',
                            label: 'read_only',
                            noBinding: false,
                        },
                        {
                            name: 'unit',
                            label: 'unit',
                        },
                        {
                            name: 'timeout',
                            label: 'controlTimeout',
                            tooltip: 'In milliseconds',
                            type: 'number',
                            min: 0,
                            max: 2000,
                            hidden: 'data.readOnly === true',
                        },
                        {
                            name: 'step',
                            label: 'step',
                            type: 'number',
                            tooltip: 'only_for_slider',
                            hidden: 'data.readOnly === true',
                        },
                    ],
                },
                {
                    name: 'values',
                    indexFrom: 1,
                    indexTo: 'values_count',
                    label: 'values',
                    fields: [
                        {
                            name: 'value',
                            label: 'value',
                        },
                        {
                            name: 'icon',
                            type: 'image',
                            label: 'icon',
                            hidden: (data, i) => !!data[`iconSmall${i}`],
                        },
                        {
                            name: 'iconSmall',
                            type: 'icon64',
                            label: 'small_icon',
                            hidden: (data, i) => !!data[`icon${i}`],
                        },
                        {
                            name: 'color',
                            type: 'color',
                            label: 'color',
                        },
                        {
                            name: 'title',
                            label: 'title',
                        },
                        {
                            name: 'iconSize',
                            label: 'icon_size',
                            type: 'slider',
                            min: 0,
                            max: 300,
                            hidden: (data, i) => !data[`icon${i}`],
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: '100%',
                height: 120,
                position: 'relative',
            },
            visPrev: 'widgets/devices/img/prev_simple_state.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return SimpleState.getWidgetInfo();
    }

    async propertiesUpdate(): Promise<void> {
        const actualRxData = JSON.stringify(this.state.rxData);
        if (this.lastRxData === actualRxData) {
            return;
        }

        this.lastRxData = actualRxData;
        if (!this.state.rxData.oid || this.state.rxData.oid === 'nothing_selected') {
            this.setState({ object: { common: {} as ioBroker.StateCommon, _id: '', type: '' } });
            return;
        }
        // read object itself
        const stateObj = await this.props.context.socket.getObject(this.state.rxData.oid);
        let object: { common: ioBroker.StateCommon; _id: string; type: ioBroker.ObjectType | '' };
        if (!stateObj) {
            object = { common: {} as ioBroker.StateCommon, _id: '', type: '' };
        } else {
            object = { common: stateObj.common as ioBroker.StateCommon, _id: stateObj._id, type: stateObj.type };
        }
        object.common ||= {} as ioBroker.StateCommon;
        if (object.common.type === 'number') {
            if (object.common.max === undefined) {
                object.common.max = 100;
            }
            if (object.common.min === undefined) {
                object.common.min = 0;
            }
        }
        if (object.common.states && Array.isArray(object.common.states)) {
            // convert to {'state1': 'state1', 'state2': 'state2', ...}
            const states: Record<string, string> = {};
            object.common.states.forEach(state => (states[state] = state));
            object.common.states = states;
        }

        if (!object.common.icon && (object.type === 'state' || object.type === 'channel')) {
            const idArray = this.state.rxData.oid.split('.');

            // read channel
            const parentObject = await this.props.context.socket.getObject(idArray.slice(0, -1).join('.'));
            if (!parentObject?.common?.icon) {
                const grandParentObject = await this.props.context.socket.getObject(idArray.slice(0, -2).join('.'));
                if (grandParentObject?.common?.icon) {
                    object.common.icon = grandParentObject.common.icon;
                    if (grandParentObject.type === 'instance' || grandParentObject.type === 'adapter') {
                        object.common.icon = `../${grandParentObject.common.name}.admin/${object.common.icon}`;
                    }
                }
            } else {
                object.common.icon = parentObject.common.icon;
                if (parentObject.type === 'instance' || parentObject.type === 'adapter') {
                    object.common.icon = `../${parentObject.common.name}.admin/${object.common.icon}`;
                }
            }
        }

        if (object.common.name && typeof object.common.name === 'object') {
            object.common.name = object.common.name[Generic.getLanguage()] || object.common.name.en;
        }

        if (JSON.stringify(this.state.object) !== JSON.stringify(object)) {
            this.setState({ object });
        }
    }

    async componentDidMount(): Promise<void> {
        super.componentDidMount();
        await this.propertiesUpdate();
    }

    async onRxDataChanged(): Promise<void> {
        await this.propertiesUpdate();
    }

    getValueData(): { color?: string; icon?: string; title?: string } | null {
        const valueId = this.state.values[`${this.state.rxData.oid}.val`];
        const value: string | undefined = (this.state.object.common?.states as Record<string, string>)[valueId];
        for (let i = 1; i <= this.state.rxData.values_count; i++) {
            if (this.state.rxData[`value${i}`] === value) {
                return {
                    color: this.state.rxData[`color${i}`],
                    icon: this.state.rxData[`icon${i}`] || this.state.rxData[`iconSmall${i}`],
                    title: this.state.rxData[`title${i}`],
                };
            }
        }

        return null;
    }

    isOn(values?: VisRxWidgetStateValues): boolean {
        values ||= this.state.values;
        if (this.state.object.common.type === 'number') {
            return values[`${this.state.object._id}.val`] !== this.state.object.common.min;
        }
        return !!values[`${this.state.object._id}.val`];
    }

    getStateIcon(isOn?: boolean): React.JSX.Element | null {
        let icon: string | undefined = '';
        if (this.state.rxData.noIcon) {
            return null;
        }
        if (this.state.object.common.states) {
            icon = this.getValueData()?.icon;
        }
        if (!icon) {
            if (this.isOn()) {
                icon = this.state.rxData.iconEnabled || this.state.rxData.iconEnabledSmall;
            }
        }

        icon ||= this.state.rxData.icon || this.state.rxData.iconSmall;
        icon ||= this.state.object.common.icon;
        isOn ??= this.isOn();
        const color = this.getColor(isOn);

        if (icon) {
            let size = 40;
            let style = styles.iconCustom;
            if (this.state.rxData.iconSize) {
                size = parseFloat(this.state.rxData.iconSize as string);
                style = undefined;
            }
            return (
                <Icon
                    src={icon}
                    style={{
                        ...style,
                        width: size,
                        height: size,
                        color,
                    }}
                />
            );
        }
        if (isOn) {
            return (
                <LightbulbIconOn
                    color="primary"
                    style={{ color }}
                />
            );
        }
        return <LightbulbIconOff style={{ color }} />;
    }

    getColor(isOn: boolean): string | undefined {
        if (this.state.object.common.states) {
            return this.getValueData()?.color;
        }
        isOn = isOn !== undefined ? isOn : this.isOn();

        return isOn
            ? this.state.rxData.colorEnabled || this.state.object.common.color
            : this.state.rxData.color || this.state.object.common.color;
    }

    changeSwitch = (): void => {
        if (this.state.object.common.type === 'number' || this.state.object.common.states) {
            this.setState({ showDimmerDialog: true });
        } else {
            const values = JSON.parse(JSON.stringify(this.state.values));
            const oid = `${this.state.object._id}.val`;
            // @ts-expect-error artefact
            if (this.state.object.common.type === 'number') {
                values[oid] =
                    values[oid] === this.state.object.common.max
                        ? this.state.object.common.min
                        : this.state.object.common.max;
            } else {
                values[oid] = !values[oid];
            }
            this.setState({ values });
            this.props.context.setValue(this.state.rxData.oid, values[oid]);
        }
    };

    setOnOff(isOn: boolean): void {
        const values = JSON.parse(JSON.stringify(this.state.values));
        const oid = `${this.state.object._id}.val`;
        values[oid] = isOn ? this.state.object.common.max : this.state.object.common.min;
        this.setState({ values });
        this.props.context.setValue(this.state.rxData.oid, values[oid]);
    }

    controlSpecificState(value: string): void {
        const values: VisRxWidgetStateValues = JSON.parse(JSON.stringify(this.state.values));
        const oid: `${string}.val` = `${this.state.object._id}.val`;
        values[oid] = value;
        this.setState({ values });
        this.props.context.setValue(this.state.rxData.oid, values[oid]);
    }

    onStateUpdated(id: string): void {
        if (this.state.controlValue && this.state.rxData.oid === id) {
            this.setState({ controlValue: { value: this.state.controlValue.value, changed: true } });
        }
    }

    finishChanging(): void {
        if (this.state.controlValue) {
            const newState: Partial<SimpleStateState> = { controlValue: null };
            // If the value was not yet updated, write a new value into "values"
            if (!this.state.controlValue.changed) {
                const values: VisRxWidgetStateValues = JSON.parse(JSON.stringify(this.state.values));
                values[`${this.state.rxData.oid}.val`] = this.state.controlValue.value;
                newState.values = values;
            }
            this.setState(newState as any);
        }
    }

    renderDimmerDialog(): React.ReactNode {
        if (this.state.showDimmerDialog) {
            const isLamp =
                this.state.object.common.min === 0 &&
                (this.state.object.common.max === 100 || this.state.object.common.max === 1);

            return (
                <Dialog
                    fullWidth
                    maxWidth="sm"
                    open={!0}
                    onClose={() => this.setState({ showDimmerDialog: null })}
                >
                    <DialogTitle>
                        {this.state.rxData.title || Generic.getText(this.state.object.common.name)}
                        <IconButton
                            style={{ float: 'right' }}
                            onClick={() => this.setState({ showDimmerDialog: null })}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        {this.state.object.common.states ? (
                            <div style={{ width: '100%', textAlign: 'center' }}>
                                {Object.keys(this.state.object.common.states).map((state, i) => (
                                    <Button
                                        key={`${state}_${i}`}
                                        style={
                                            this.state.values[`${this.state.object._id}.val`] !== state
                                                ? styles.buttonInactive
                                                : undefined
                                        }
                                        color={
                                            this.state.values[`${this.state.object._id}.val`] === state
                                                ? 'primary'
                                                : 'grey'
                                        }
                                        onClick={() => this.controlSpecificState(state)}
                                    >
                                        {(this.state.object.common.states as Record<string, string>)[state]}
                                    </Button>
                                ))}
                            </div>
                        ) : (
                            <>
                                <div style={{ width: '100%', marginBottom: 20 }}>
                                    <Button
                                        style={{
                                            ...(this.state.values[`${this.state.object._id}.val`] ===
                                            this.state.object.common.min
                                                ? undefined
                                                : styles.buttonInactive),
                                            width: '50%',
                                        }}
                                        color="grey"
                                        onClick={() => this.setOnOff(false)}
                                        startIcon={isLamp ? <LightbulbIconOff /> : null}
                                    >
                                        {isLamp
                                            ? Generic.t('OFF').replace('vis_2_widgets_devices_', '')
                                            : this.state.object.common.min +
                                              (this.state.rxData.unit || this.state.object.common.unit || '')}
                                    </Button>
                                    <Button
                                        style={{
                                            width: '50%',
                                            ...(this.state.values[`${this.state.object._id}.val`] ===
                                            this.state.object.common.max
                                                ? undefined
                                                : styles.buttonInactive),
                                        }}
                                        color="primary"
                                        onClick={() => this.setOnOff(true)}
                                        startIcon={isLamp ? <LightbulbIconOn color="primary" /> : null}
                                    >
                                        {isLamp
                                            ? Generic.t('ON').replace('vis_2_widgets_devices_', '')
                                            : this.state.object.common.max +
                                              (this.state.rxData.unit || this.state.object.common.unit || '')}
                                    </Button>
                                </div>
                                <div style={{ width: '100%' }}>
                                    <Slider
                                        size="small"
                                        value={
                                            this.state.controlValue
                                                ? this.state.controlValue.value
                                                : this.state.values[`${this.state.object._id}.val`]
                                        }
                                        valueLabelFormat={value => {
                                            if (this.props.context.systemConfig?.common?.isFloatComma) {
                                                return value.toString().replace('.', ',');
                                            }
                                            return value.toString();
                                        }}
                                        step={parseFloat(this.state.rxData.step as string) || 1}
                                        valueLabelDisplay="auto"
                                        min={this.state.object.common.min}
                                        max={this.state.object.common.max}
                                        onChangeCommitted={() => this.finishChanging()}
                                        onChange={(event, value) => {
                                            this.setState(
                                                {
                                                    controlValue: {
                                                        value: value,
                                                        changed: !!this.state.controlValue?.changed,
                                                    },
                                                },
                                                () => {
                                                    if (this.controlTimer) {
                                                        clearTimeout(this.controlTimer);
                                                        this.controlTimer = null;
                                                    }
                                                    if (this.state.rxData.timeout) {
                                                        this.controlTimer = setTimeout(
                                                            (newValue: number) => {
                                                                this.controlTimer = null;
                                                                this.props.context.setValue(
                                                                    this.state.rxData.oid,
                                                                    newValue,
                                                                );
                                                            },
                                                            parseInt(this.state.rxData.timeout as string, 10) || 0,
                                                            value,
                                                        );
                                                    } else {
                                                        this.props.context.setValue(this.state.rxData.oid, value);
                                                    }
                                                },
                                            );
                                        }}
                                    />
                                </div>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            );
        }
        return null;
    }

    renderCircular(): React.ReactNode {
        const value = this.state.values[`${this.state.object._id}.val`];
        const object = this.state.object;
        if (value === undefined || value === null) {
            return null;
        }
        if (
            (object.common.min !== undefined && value < object.common.min) ||
            (object.common.max !== undefined && value > object.common.max)
        ) {
            return value + (this.state.rxData.unit || this.state.object.common?.unit || '');
        }

        let size = this.state.rxData.circleSize;
        if (!size) {
            size = this.refDiv.current?.offsetHeight || 0;
            if (size > (this.refDiv.current?.offsetWidth || 0)) {
                size = this.refDiv.current?.offsetWidth || 0;
            }
        }
        size = size || 80;
        if (size < 60) {
            return null;
        }

        if (!this.refDiv.current) {
            this.updateTimer1 ||= setTimeout(() => {
                this.updateTimer1 = null;
                this.forceUpdate();
            }, 50);
        }

        return (
            <CircularSliderWithChildren
                minValue={object.common.min}
                maxValue={object.common.max}
                size={size * 1.1}
                arcColor={this.props.context.theme.palette.primary.main}
                arcBackgroundColor={this.props.context.themeType === 'dark' ? '#DDD' : '#222'}
                startAngle={0}
                endAngle={360}
                handle1={{ value }}
            >
                <div
                    key={`_${value}`}
                    style={{
                        ...(this.props.context.themeType === 'dark' ? styles.newValueDark : styles.newValueLight),
                        fontSize: Math.round(size / 8),
                        fontWeight: 'bold',
                    }}
                >
                    {value + (this.state.rxData.unit || this.state.object.common?.unit || '')}
                </div>
            </CircularSliderWithChildren>
        );
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element[] | React.JSX.Element | null {
        super.renderWidgetBody(props);

        const actualRxData = JSON.stringify(this.state.rxData);
        if (this.lastRxData !== actualRxData) {
            this.updateTimeout ||= setTimeout(async () => {
                this.updateTimeout = null;
                await this.propertiesUpdate();
            }, 50);
        }
        const isOn = this.isOn();
        const icon = this.getStateIcon(isOn);
        const color = this.getColor(isOn);
        const stateTitle = this.state.object.common.states && this.getValueData()?.title;

        let value;
        if (this.state.object._id && (this.state.object.common.type === 'number' || this.state.object.common.states)) {
            value = this.state.values[`${this.state.object._id}.val`];
            if (
                this.state.object.common.states &&
                (this.state.object.common.states as Record<string, string>)[value] !== undefined
            ) {
                value = (this.state.object.common.states as Record<string, string>)[value];
            } else {
                value = this.formatValue(value);
            }
        }

        const height =
            this.state.rxData.noCard !== true &&
            this.state.rxData.noCard !== 'true' &&
            !props.widget.usedInWidget &&
            this.state.rxData.widgetTitle
                ? 'calc(100% - 36px)'
                : '100%';

        if (!this.state.object.common.states && this.isOn()) {
            props.className = `${props.className} vis-on`.trim();
        } else {
            props.className = `${props.className} vis-off`.trim();
        }

        const content = (
            <>
                <style>
                    {`
@keyframes vis-2-widgets-material-newValueAnimationLight {
    0% {
        color: #00bd00;
    }
    80% {
        color: #008000;
    }
    100% {
        color: #000;
    }
}
@keyframes vis-2-widgets-material-newValueAnimationDark {
    0% {
        color: #008000;
    }
    80% {
        color: #00bd00;
    }
    100% {
        color: #ffffff;
    }
}            
`}
                </style>
                {this.renderDimmerDialog()}
                <div
                    style={{
                        width: '100%',
                        height,
                    }}
                    ref={this.refDiv}
                >
                    <div
                        style={{
                            ...styles.buttonDiv,
                            width: '100%',
                            height: '100%',
                        }}
                    >
                        <Button
                            onClick={() => this.changeSwitch()}
                            disabled={this.state.rxData.readOnly === true || this.state.rxData.readOnly === 'true'}
                            color={!this.state.object.common.states && this.isOn() ? 'primary' : 'grey'}
                            style={{
                                ...styles.button,
                                ...(!this.isOn() ? styles.buttonInactive : undefined),
                            }}
                        >
                            <div style={styles.topButton}>
                                {icon ? (
                                    <div
                                        style={{
                                            ...(!this.state.object.common.states &&
                                            value !== undefined &&
                                            value !== null
                                                ? styles.iconButton
                                                : styles.iconButtonCenter),
                                            height: this.state.rxData.iconSize ? 'unset' : undefined,
                                        }}
                                    >
                                        {icon}
                                    </div>
                                ) : null}
                                {!this.state.object.common.states && value !== undefined && value !== null ? (
                                    <Box
                                        component="div"
                                        sx={styles.rightButton}
                                        style={icon ? {} : { width: '100%', left: 0, justifyContent: 'center' }}
                                    >
                                        {this.renderCircular()}
                                    </Box>
                                ) : null}
                            </div>
                            <div style={{ ...styles.text, color }}>
                                {this.state.rxData.title || Generic.getText(this.state.object.common.name)}
                            </div>
                            {this.state.object.common.states && value !== undefined && value !== null ? (
                                <div
                                    key={`${stateTitle || value}`}
                                    style={{
                                        ...styles.value,
                                        ...(!color
                                            ? this.props.context.themeType === 'dark'
                                                ? styles.newValueDark
                                                : styles.newValueLight
                                            : undefined),
                                        color,
                                    }}
                                >
                                    {stateTitle || value}
                                </div>
                            ) : null}
                        </Button>
                    </div>
                </div>
            </>
        );

        if (this.state.rxData.noCard === true || this.state.rxData.noCard === 'true' || props.widget.usedInWidget) {
            return content;
        }

        return this.wrapContent(content, null);
    }
}
