import React from 'react';

import { CircularSliderWithChildren } from 'react-circular-slider-svg';

import {
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    LinearProgress,
    Slider,
    Tab,
    Tabs,
    Tooltip,
} from '@mui/material';

import {
    WbSunny as WbSunnyIcon,
    PowerSettingsNew as PowerSettingsNewIcon,
    Air as AirIcon,
    ThermostatAuto as ThermostatAutoIcon,
    PanTool as PanToolIcon,
    AcUnit as AcUnitIcon,
    Dry as DryIcon,
    Park as ParkIcon,
    Houseboat as HouseboatIcon,
    MoreVert as MoreVertIcon,
    Close as IconClose,
    Thermostat as ThermostatIcon,
    Celebration as CelebrationIcon,
    ElectricBolt as BoostIcon,
    Close,
} from '@mui/icons-material';

import { Icon } from '@iobroker/gui-components';
import type {
    RxRenderWidgetProps,
    RxWidgetInfo,
    VisRxWidgetProps,
    VisRxWidgetState,
    VisRxWidgetStateValues,
} from '@iobroker/types-vis-2';

/**
 * The chart of the history, which brings echarts with it. It is only shown in the dialog of the widget, so it is
 * loaded when the dialog is opened and not with the page.
 */
const ObjectChart = React.lazy(() => import('./Components/ObjectChart'));
import Generic from './Generic';

const BUTTONS: Record<string, React.JSX.Element> = {
    AUTO: <ThermostatAutoIcon style={{ width: 24, height: 24 }} />,
    MANUAL: <PanToolIcon style={{ width: 24, height: 24 }} />,
    VACATION: <HouseboatIcon style={{ width: 24, height: 24 }} />,
    COOL: <AcUnitIcon style={{ width: 24, height: 24 }} />,
    COOLING: <AcUnitIcon style={{ width: 24, height: 24 }} />,
    DRY: <DryIcon style={{ width: 24, height: 24 }} />,
    ECO: <ParkIcon style={{ width: 24, height: 24 }} />,
    FAN_ONLY: <AirIcon style={{ width: 24, height: 24 }} />,
    HEAT: <WbSunnyIcon style={{ width: 24, height: 24 }} />,
    HEATING: <WbSunnyIcon style={{ width: 24, height: 24 }} />,
    OFF: <PowerSettingsNewIcon style={{ width: 24, height: 24 }} />,
};

const styles: Record<string, any> = {
    thermostatCircleDiv: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        '& svg circle': {
            cursor: 'pointer',
        },
        '&>div': {
            margin: 'auto',
            '&>div': {
                top: '35% !important',
            },
        },
    },
    moreButton: {
        position: 'absolute',
        top: 4,
        right: 4,
    },
    thermostatButtonsDiv: {
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        position: 'absolute',
        bottom: 8,
        left: 0,
    },
    thermostatNewValueLight: {
        animation: 'vis-2-widgets-material-newValueAnimationLight 2s ease-in-out',
    },
    thermostatNewValueDark: {
        animation: 'vis-2-widgets-material-newValueAnimationDark 2s ease-in-out',
    },
    thermostatDesiredTemp: {
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        left: 0,
        transform: 'none',
    },
    tooltip: {
        pointerEvents: 'none',
    },
};

function getModes(modeObj: ioBroker.StateObject): { value: string; label: string; icon?: React.JSX.Element }[] | null {
    let modes = modeObj?.common?.states;
    if (Array.isArray(modes)) {
        const result: Record<string, string> = {};
        modes.forEach(m => (result[m] = m));
        modes = result;
    }
    const result: { value: string; label: string; icon?: React.JSX.Element }[] = [];
    if (modes) {
        Object.keys(modes).forEach(m => {
            const mode: { value: string; label: string; icon?: React.JSX.Element } = {
                value: m,
                label: (modes as Record<string, string>)[m],
            };
            mode.icon = BUTTONS[((modes as Record<string, string>)[m] || '').toUpperCase()];
            result.push(mode);
        });
    }

    return result.length ? result : null;
}

interface ThermostatRxData {
    noCard: boolean;
    widgetTitle: string;
    'oid-temp-set': string;
    'oid-temp-actual': string;
    unit: string;
    'oid-power': string;
    'oid-mode': string;
    'oid-boost': string;
    'oid-party': string;
    step: string;
    timeout: number;
    externalDialog: boolean;
    count: number | string;
    [key: `hide${number}`]: boolean | 'true';
    [key: `title${number}`]: string;
    [key: `tooltip${number}`]: string;
    [key: `icon${number}`]: string;
    [key: `iconSmall${number}`]: string;
    [key: `color${number}`]: string;
    [key: `noText${number}`]: boolean | 'true';
    [key: `noIcon${number}`]: boolean | 'true';
    [key: `value${number}`]: string;
}

interface ThermostatState extends VisRxWidgetState {
    showDialog: boolean;
    // external dialog
    dialog: boolean;
    dialogTab: number;
    size: number;
    horizontal: boolean;

    modeObject: { common: ioBroker.StateCommon; _id: string } | undefined;
    tempObject: { common: ioBroker.StateCommon; _id: string } | null | undefined;
    tempStateObject: { common: ioBroker.StateCommon; _id: string } | null | undefined;
    isChart?: boolean;
    modes:
        | {
              value: string;
              label: string | null;
              icon?: React.JSX.Element | true | string;
              tooltip: string;
              original: string;
              color?: string;
          }[]
        | undefined
        | null;
    min: number | undefined | null;
    max: number | undefined | null;
    step: number | undefined | null;
}

export default class Thermostat extends Generic<ThermostatRxData, ThermostatState> {
    private lastRxData = '';
    private customStyle: React.CSSProperties = {};
    private updateTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(props: VisRxWidgetProps) {
        super(props);
        this.state = {
            ...this.state,
            showDialog: false,
            dialogTab: 0,
            size: 0,
            horizontal: false,
        };
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplMaterial2Thermostat',
            visSet: 'vis-2-widgets-material',
            visSetLabel: 'set_label',
            visSetColor: '#0f8cc9',
            visWidgetLabel: 'thermostat', // Label of widget
            visName: 'Thermostat',
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
                            name: 'oid-temp-set',
                            type: 'id',
                            label: 'temperature_oid',
                            onChange: async (field, data, changeData, socket) => {
                                if (data[field.name!]) {
                                    const object = await socket.getObject(data[field.name!]);
                                    if (object?.common) {
                                        const id = data[field.name!].split('.');
                                        id.pop();
                                        const states: Record<string, ioBroker.StateObject> =
                                            await socket.getObjectViewSystem(
                                                'state',
                                                `${id.join('.')}.`,
                                                `${id.join('.')}.\u9999`,
                                            );
                                        if (states) {
                                            let changed = false;
                                            const values = Object.values(states);
                                            for (const state of values) {
                                                const role = state.common.role;
                                                if (role && role.includes('value.temperature')) {
                                                    data['oid-temp-actual'] = state._id;
                                                    changed = true;
                                                } else if (role?.includes('power')) {
                                                    data['oid-power'] = state._id;
                                                    changed = true;
                                                } else if (role?.includes('boost')) {
                                                    data['oid-boost'] = state._id;
                                                    changed = true;
                                                } else if (role?.includes('party')) {
                                                    data['oid-party'] = state._id;
                                                    changed = true;
                                                } else if (role?.includes('mode')) {
                                                    const modes = getModes(state);
                                                    if (modes) {
                                                        for (let i = 0; i < modes.length; i++) {
                                                            const mode = modes[i];
                                                            if (!data[`title${i + 1}`] || i + 1 > data.count) {
                                                                changed = true;
                                                                data[`title${i + 1}`] = mode.label;
                                                            }
                                                            if (!data[`value${i + 1}`] || i + 1 > data.count) {
                                                                data[`value${i + 1}`] = mode.value;
                                                                changed = true;
                                                            }
                                                        }
                                                        if (data.count !== modes.length) {
                                                            changed = true;
                                                            data.count = modes.length;
                                                        }
                                                    }
                                                    data['oid-mode'] = state._id;
                                                    changed = true;
                                                }
                                            }

                                            changed && changeData(data);
                                        }
                                    }
                                }
                            },
                        },
                        {
                            name: 'oid-temp-actual',
                            type: 'id',
                            label: 'actual_oid',
                        },
                        {
                            name: 'unit',
                            label: 'unit',
                        },
                        {
                            name: 'oid-power',
                            type: 'id',
                            label: 'power_oid',
                        },
                        {
                            name: 'oid-mode',
                            type: 'id',
                            label: 'mode_oid',
                            onChange: async (field, data, changeData, socket) => {
                                if (data[field.name!]) {
                                    const object = (await socket.getObject(data[field.name!])) as
                                        | ioBroker.StateObject
                                        | null
                                        | undefined;
                                    const modes = object ? getModes(object) : null;
                                    if (modes) {
                                        let changed = false;

                                        modes.forEach((mode, i) => {
                                            if (!data[`title${i + 1}`] || i + 1 > data.count) {
                                                changed = true;
                                                data[`title${i + 1}`] = mode.label;
                                            }
                                            if (!data[`value${i + 1}`] || i + 1 > data.count) {
                                                data[`value${i + 1}`] = mode.value;
                                                changed = true;
                                            }
                                        });
                                        if (data.count !== modes.length) {
                                            changed = true;
                                            data.count = modes.length;
                                        }
                                        changed && changeData(data);
                                    }
                                }
                            },
                        },
                        {
                            name: 'oid-boost',
                            type: 'id',
                            label: 'mode_boost',
                        },
                        {
                            name: 'oid-party',
                            type: 'id',
                            label: 'mode_party',
                        },
                        {
                            name: 'step',
                            type: 'select',
                            disabled: '!data["oid-temp-set"]',
                            label: 'step',
                            noTranslation: true,
                            options: ['0.5', '1'],
                            default: '1',
                        },
                        {
                            name: 'timeout',
                            label: 'controlTimeout',
                            tooltip: 'timeout_tooltip',
                            type: 'slider',
                            min: 0,
                            max: 2000,
                            default: 500,
                        },
                        {
                            name: 'externalDialog',
                            label: 'use_as_dialog',
                            type: 'checkbox',
                            tooltip: 'use_as_dialog_tooltip',
                        },
                        {
                            name: 'count',
                            type: 'slider',
                            min: 1,
                            max: 9,
                            label: 'modes_count',
                            default: 2,
                            hidden: '!data["oid-mode"]',
                        },
                    ],
                },
                {
                    name: 'modes',
                    label: 'group_modes',
                    indexFrom: 1,
                    indexTo: 'count',
                    hidden: '!data["oid-mode"]',
                    fields: [
                        {
                            name: 'hide',
                            type: 'checkbox',
                            label: 'hide',
                            // explicitly allow
                            noBinding: false,
                        },
                        {
                            name: 'title',
                            label: 'title',
                            hidden: 'data["hide" + index] === true',
                        },
                        {
                            name: 'tooltip',
                            label: 'tooltip',
                            hidden: 'data["hide" + index] === true || !!data["title" + index]',
                        },
                        {
                            name: 'icon',
                            type: 'image',
                            label: 'icon',
                            hidden: 'data["hide" + index] === true || !!data["iconSmall" + index]',
                        },
                        {
                            name: 'iconSmall',
                            type: 'icon64',
                            label: 'small_icon',
                            hidden: 'data["hide" + index] === true || !!data["icon" + index]',
                        },
                        {
                            name: 'color',
                            type: 'color',
                            label: 'color',
                            hidden: 'data["hide" + index] === true',
                        },
                        {
                            name: 'noText',
                            type: 'checkbox',
                            label: 'no_text',
                            noBinding: false,
                            hidden: 'data["hide" + index] === true || data["noIcon" + index] === true',
                        },
                        {
                            name: 'noIcon',
                            type: 'checkbox',
                            label: 'no_icon',
                            noBinding: false,
                            hidden: 'data["hide" + index] === true || data["noText" + index] === true || !data["title" + index]',
                        },
                        {
                            name: 'value',
                            type: 'text',
                            label: 'value',
                            hidden: 'data["hide" + index] === true',
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: '100%',
                height: 120,
                position: 'relative',
            },
            visPrev: 'widgets/material/img/prev_thermostat.png',
        };
    }

    async thermostatReadObjects(): Promise<void> {
        const actualRxData = JSON.stringify(this.state.rxData);
        if (this.lastRxData === actualRxData) {
            return;
        }

        const newState: Partial<ThermostatState> = {};
        this.lastRxData = actualRxData;
        const ids = [];
        if (this.state.rxData['oid-mode'] && this.state.rxData['oid-mode'] !== 'nothing_selected') {
            ids.push(this.state.rxData['oid-mode']);
        }
        if (this.state.rxData['oid-temp-set'] && this.state.rxData['oid-temp-set'] !== 'nothing_selected') {
            ids.push(this.state.rxData['oid-temp-set']);
        }
        if (this.state.rxData['oid-temp-actual'] && this.state.rxData['oid-temp-actual'] !== 'nothing_selected') {
            ids.push(this.state.rxData['oid-temp-actual']);
        }
        const _objects: Record<string, ioBroker.StateObject> = ids.length
            ? ((await this.props.context.socket.getObjectsById(ids)) as Record<string, ioBroker.StateObject>)
            : {};

        if (this.state.rxData['oid-mode'] && this.state.rxData['oid-mode'] !== 'nothing_selected') {
            const modeObj = _objects[this.state.rxData['oid-mode']];
            if (modeObj) {
                newState.modeObject = { common: modeObj.common, _id: modeObj._id };
                // convert the array to the object
                const modes = getModes(modeObj);
                newState.modes = [];
                const max = parseInt(this.state.rxData.count as string, 10) || 10;

                modes?.forEach((m, i) => {
                    if (
                        this.state.rxData[`hide${i + 1}`] === true ||
                        this.state.rxData[`hide${i + 1}`] === 'true' ||
                        i >= max
                    ) {
                        return;
                    }
                    const icon: string | true | undefined =
                        this.state.rxData[`noIcon${i + 1}`] !== true && this.state.rxData[`noIcon${i + 1}`] !== 'true'
                            ? this.state.rxData[`icon${i + 1}`] ||
                              this.state.rxData[`iconSmall${i + 1}`] ||
                              !!BUTTONS[(m.label || '').toUpperCase()]
                            : undefined;

                    const mode: {
                        value: string;
                        label: string | null;
                        icon?: React.JSX.Element | true | string;
                        tooltip: string;
                        original: string;
                        color?: string;
                    } = {
                        value: this.state.rxData[`value${i + 1}`] || m.value,
                        tooltip: this.state.rxData[`tooltip${i + 1}`] || m.label,
                        icon,
                        original: m.label,
                        label:
                            icon &&
                            (this.state.rxData[`noText${i + 1}`] === true ||
                                this.state.rxData[`noText${i + 1}`] === 'true')
                                ? null
                                : this.state.rxData[`title${i + 1}`] || m.label,
                        color: this.state.rxData[`color${i + 1}`],
                    };

                    // if icon present, and it is a standard icon and no title provided
                    if (
                        mode.label &&
                        !(
                            this.state.rxData[`noText${i + 1}`] === true ||
                            this.state.rxData[`noText${i + 1}`] === 'true'
                        ) &&
                        mode.icon === true &&
                        !this.state.rxData[`title${i + 1}`]
                    ) {
                        mode.label = null;
                    }
                    newState.modes!.push(mode);
                });

                for (let i = modes?.length || 0; i < max; i++) {
                    if (this.state.rxData[`hide${i + 1}`] === true || this.state.rxData[`hide${i + 1}`] === 'true') {
                        continue;
                    }
                    const icon =
                        this.state.rxData[`noIcon${i + 1}`] !== true && this.state.rxData[`noIcon${i + 1}`] !== 'true'
                            ? this.state.rxData[`icon${i + 1}`] ||
                              this.state.rxData[`iconSmall${i + 1}`] ||
                              !!BUTTONS[(this.state.rxData[`title${i + 1}`] || '').toUpperCase()]
                            : undefined;

                    newState.modes.push({
                        tooltip: this.state.rxData[`tooltip${i + 1}`],
                        icon,
                        original: this.state.rxData[`title${i + 1}`],
                        label:
                            icon &&
                            (this.state.rxData[`noText${i + 1}`] === true ||
                                this.state.rxData[`noText${i + 1}`] === 'true')
                                ? null
                                : this.state.rxData[`title${i + 1}`],
                        value: this.state.rxData[`value${i + 1}`],
                        color: this.state.rxData[`color${i + 1}`],
                    });
                }
            } else {
                newState.modes = null;
            }
        } else {
            newState.modes = null;
        }

        if (this.state.rxData['oid-temp-set'] && this.state.rxData['oid-temp-set'] !== 'nothing_selected') {
            const tempObj = _objects[this.state.rxData['oid-temp-set']];
            newState.min = tempObj?.common?.min === undefined ? 12 : tempObj.common.min;
            newState.max = tempObj?.common?.max === undefined ? 30 : tempObj.common.max;
            // the object can be gone, while its id is still written in the widget
            newState.tempObject = tempObj ? { common: tempObj.common, _id: tempObj._id } : null;
        } else {
            newState.tempObject = null;
            newState.max = null;
            newState.min = null;
        }

        if (this.state.rxData['oid-temp-actual'] && this.state.rxData['oid-temp-actual'] !== 'nothing_selected') {
            const tempStateObj = _objects[this.state.rxData['oid-temp-actual']];
            newState.tempStateObject = tempStateObj ? { common: tempStateObj.common, _id: tempStateObj._id } : null;
        } else {
            newState.tempStateObject = null;
        }
        const defaultHistory = this.props.context.systemConfig?.common?.defaultHistory;
        const mainHistoryInstance = Generic.getHistoryInstance(newState.tempObject, defaultHistory);
        const secondaryHistoryInstance = Generic.getHistoryInstance(newState.tempStateObject, defaultHistory);

        newState.isChart = !!mainHistoryInstance || !!secondaryHistoryInstance;

        // If changed any attribute
        if (
            Object.keys(newState).find(
                key =>
                    JSON.stringify((this.state as Record<string, any>)[key]) !==
                    JSON.stringify((newState as Record<string, any>)[key]),
            )
        ) {
            this.setState(newState as any);
        }
    }

    async componentDidMount(): Promise<void> {
        super.componentDidMount();
        await this.thermostatReadObjects();
    }

    async onRxDataChanged(): Promise<void> {
        await this.thermostatReadObjects();
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return Thermostat.getWidgetInfo();
    }

    formatValue(value: null | string | undefined | number | boolean, round?: number): string {
        if (typeof value === 'number') {
            if (round === 0) {
                value = Math.round(value);
            } else {
                value = Math.round(value * 100) / 100;
            }
            if (this.props.context.systemConfig?.common) {
                if (this.props.context.systemConfig.common.isFloatComma) {
                    value = value.toString().replace('.', ',');
                }
            }
        }

        return value === undefined || value === null ? '' : value.toString();
    }

    /**
     * The dialog behind the button of the widget: the thermostat in one tab and the history of its temperatures
     * in the other. The chart is only built while its tab is chosen, so the page does not carry echarts until
     * somebody asks for it.
     */
    renderDialog(): React.ReactNode {
        if (!this.state.showDialog) {
            return null;
        }

        // the ring should not grow beyond the dialog on a narrow screen
        const size = Math.max(160, Math.min(400, window.innerWidth - 120, window.innerHeight - 260));

        return (
            <Dialog
                sx={{ '& .MuiDialog-paper': { height: '100%' } }}
                maxWidth="lg"
                fullWidth
                open={!0}
                onClose={() => this.setState({ showDialog: false })}
            >
                <DialogTitle>
                    {this.state.rxData.widgetTitle}
                    <IconButton
                        style={{ float: 'right' }}
                        onClick={() => this.setState({ showDialog: false })}
                    >
                        <IconClose />
                    </IconButton>
                </DialogTitle>
                <Tabs
                    value={this.state.dialogTab}
                    onChange={(_e, value: number) => this.setState({ dialogTab: value })}
                >
                    <Tab label={Generic.t('thermostat')} />
                    <Tab label={Generic.t('chart')} />
                </Tabs>
                <DialogContent>
                    {this.state.dialogTab === 0 && (
                        <div
                            style={{
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <div style={{ width: size, height: size, position: 'relative' }}>
                                {this.renderThermostatContent({
                                    withTitle: false,
                                    size,
                                    chartButton: null,
                                    withDialog: false,
                                })}
                            </div>
                        </div>
                    )}
                    {this.state.dialogTab === 1 && (
                        <div style={{ height: '100%' }}>
                            <React.Suspense fallback={<LinearProgress />}>
                                <ObjectChart
                                    t={(key: string): string => Generic.t(key)}
                                    lang={Generic.getLanguage()}
                                    socket={this.props.context.socket}
                                    obj={this.state.tempStateObject || this.state.tempObject}
                                    obj2={!this.state.tempStateObject ? null : this.state.tempObject}
                                    objLineType={this.state.tempStateObject ? 'line' : 'step'}
                                    obj2LineType="step"
                                    themeType={this.props.context.themeType}
                                    historyInstance={Generic.getHistoryInstance(
                                        this.state.tempStateObject || this.state.tempObject,
                                        this.props.context.systemConfig?.common?.defaultHistory || 'history.0',
                                    )}
                                    historyInstance2={Generic.getHistoryInstance(
                                        this.state.tempStateObject,
                                        this.props.context.systemConfig?.common?.defaultHistory || 'history.0',
                                    )}
                                    noToolbar={false}
                                    systemConfig={this.props.context.systemConfig}
                                    dateFormat={this.props.context.systemConfig.common.dateFormat}
                                />
                            </React.Suspense>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        );
    }

    componentDidUpdate(prevProps: VisRxWidgetProps, prevState: typeof this.state): void {
        super.componentDidUpdate(prevProps, prevState);

        if (this.refService?.current) {
            let w = this.refService.current.clientWidth;
            let h = this.refService.current.clientHeight;
            let size = w;
            const widget = this.props.context.views[this.props.view].widgets[this.props.id];
            if (!this.state.rxData.noCard && !widget.usedInWidget) {
                h -= 32; // padding
                w -= 32; // padding
            }

            const withTitle = this.state.rxData.widgetTitle && !this.state.rxData.noCard && !widget.usedInWidget;
            const withModes = this.thermIsWithModeButtons() || this.thermIsWithPowerButton();

            if (withTitle && withModes) {
                h -= 36 + 28; // title and mode buttons
            } else if (withTitle) {
                h -= 36; // title
            } else if (withModes) {
                h -= 28; // title
            }

            if (h < 0) {
                h = 0;
            }

            // with title and with modes
            if (w > h) {
                size = h;
            } else {
                size = w;
            }

            if (size < 80) {
                size = 0;
            }

            if (size !== this.state.size) {
                this.setState({ size });
            }
        }
    }

    thermIsWithPowerButton(): boolean {
        return !!this.state.rxData['oid-power'] && this.state.rxData['oid-power'] !== 'nothing_selected';
    }

    thermIsWithModeButtons(): boolean {
        return (
            (this.state.modes?.length || this.state.rxData['oid-party'] || this.state.rxData['oid-boost']) &&
            // if no power button or power is on
            (!this.state.rxData['oid-power'] || this.state.values[`${this.state.rxData['oid-power']}.val`])
        );
    }

    onCommand(command: 'openDialog' | 'closeDialog'): any {
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

    /**
     * The thermostat itself: the ring - or the slider, where there is no room for the ring - with the two
     * temperatures and the buttons of the modes. The widget shows it, and the first tab of the dialog shows it
     * again, at the size the dialog has room for.
     */
    renderThermostatContent(options: {
        withTitle: boolean;
        size: number;
        chartButton: React.JSX.Element | null;
        withDialog: boolean;
    }): React.JSX.Element {
        const { withTitle, size, chartButton } = options;

        let tempValue = this.state.values[`${this.state.rxData['oid-temp-set']}.val`];
        if (tempValue === undefined) {
            tempValue = null;
        }
        if (
            tempValue !== null &&
            (this.state.min === null || this.state.min === undefined || tempValue < this.state.min)
        ) {
            tempValue = this.state.min;
        } else if (
            tempValue !== null &&
            (this.state.max === null || this.state.max === undefined || tempValue > this.state.max)
        ) {
            tempValue = this.state.max;
        }

        if (
            tempValue === null &&
            this.state.min !== null &&
            this.state.min !== undefined &&
            this.state.max !== null &&
            this.state.max !== undefined
        ) {
            tempValue = (this.state.max - this.state.min) / 2 + this.state.min;
        }

        let actualTemp = this.state.values[`${this.state.rxData['oid-temp-actual']}.val`];
        if (actualTemp === undefined) {
            actualTemp = null;
        }

        let handleSize = Math.round(size / 25);
        if (handleSize < 8) {
            handleSize = 8;
        }

        // console.log(this.state.min, this.state.max, tempValue);

        actualTemp = actualTemp !== null ? this.formatValue(actualTemp) : null;

        const thermIsWithModeButtons = this.thermIsWithModeButtons();
        const thermIsWithPowerButton = this.thermIsWithPowerButton();
        const arcColor =
            this.props.customSettings?.viewStyle?.overrides?.palette?.primary?.main ||
            this.props.context.theme?.palette.primary.main ||
            '#448aff';

        let modesButton: React.JSX.Element[] = [];
        if (thermIsWithModeButtons) {
            if (this.state.modes?.length) {
                modesButton = this.state.modes.map((mode, i) => {
                    const icon =
                        mode.icon === true ? (
                            BUTTONS[(mode.original || '').toUpperCase()]
                        ) : mode.icon ? (
                            <Icon
                                src={mode.icon}
                                style={{ width: 24, height: 24 }}
                            />
                        ) : null;
                    let currentValueStr = this.state.values[`${this.state.rxData['oid-mode']}.val`];

                    if (currentValueStr === null || currentValueStr === undefined) {
                        currentValueStr = 'null';
                    } else {
                        currentValueStr = currentValueStr.toString();
                    }

                    return icon && !mode.label ? (
                        <Tooltip
                            key={`${i}_${mode.value}`}
                            title={mode.tooltip}
                            slotProps={{ popper: { sx: styles.tooltip } }}
                        >
                            <IconButton
                                color={currentValueStr === mode.value ? 'primary' : 'inherit'}
                                style={
                                    currentValueStr === mode.value || !mode.color ? undefined : { color: mode.color }
                                }
                                onClick={() => {
                                    let value: string | boolean | number = mode.value;
                                    if (this.state.modeObject?.common?.type === 'number') {
                                        value = parseFloat(value);
                                    } else if (this.state.modeObject?.common?.type === 'boolean') {
                                        // @ts-expect-error is Ok
                                        value = value === 'true' || value === true || value === '1' || value === 1;
                                    }
                                    const values: VisRxWidgetStateValues = JSON.parse(
                                        JSON.stringify(this.state.values),
                                    );
                                    values[`${this.state.rxData['oid-mode']}.val`] = value;
                                    this.setState({ values });
                                    this.props.context.setValue(this.state.rxData['oid-mode'], value);
                                }}
                            >
                                {icon}
                            </IconButton>
                        </Tooltip>
                    ) : (
                        <Button
                            key={`${i}_${mode.value}`}
                            color={currentValueStr === mode.value ? 'primary' : 'inherit'}
                            // style={currentValueStr === mode.value || !mode.color ? undefined : { color: mode.color }}
                            onClick={() => {
                                let value: string | boolean | number = mode.value;
                                if (this.state.modeObject?.common?.type === 'number') {
                                    value = parseFloat(value);
                                } else if (this.state.modeObject?.common?.type === 'boolean') {
                                    // @ts-expect-error is OK
                                    value = value === 'true' || value === true || value === '1' || value === 1;
                                }
                                const values: VisRxWidgetStateValues = JSON.parse(JSON.stringify(this.state.values));
                                values[`${this.state.rxData['oid-mode']}.val`] = value;
                                this.setState({ values });
                                this.props.context.setValue(this.state.rxData['oid-mode'], value);
                            }}
                            startIcon={icon}
                        >
                            {mode.label}
                        </Button>
                    );
                });
            }

            if (this.state.rxData['oid-party']) {
                let currentValueStr = this.state.values[`${this.state.rxData['oid-party']}.val`];
                if (currentValueStr === null || currentValueStr === undefined) {
                    currentValueStr = false;
                } else {
                    currentValueStr = currentValueStr === '1' || currentValueStr === 'true' || currentValueStr === true;
                }
                modesButton.push(
                    <Button
                        key="party"
                        color={currentValueStr ? 'primary' : 'inherit'}
                        onClick={() => {
                            let _currentValueStr = this.state.values[`${this.state.rxData['oid-party']}.val`];
                            if (_currentValueStr === null || _currentValueStr === undefined) {
                                _currentValueStr = false;
                            } else {
                                _currentValueStr =
                                    _currentValueStr === '1' ||
                                    _currentValueStr === 'true' ||
                                    _currentValueStr === true;
                            }
                            const values: VisRxWidgetStateValues = JSON.parse(JSON.stringify(this.state.values));
                            values[`${this.state.rxData['oid-party']}.val`] = !_currentValueStr;
                            this.setState({ values });
                            this.props.context.setValue(this.state.rxData['oid-party'], !_currentValueStr);
                        }}
                        startIcon={<CelebrationIcon />}
                    >
                        {Generic.t('Party')}
                    </Button>,
                );
            }
            if (this.state.rxData['oid-boost']) {
                let currentValueStr = this.state.values[`${this.state.rxData['oid-boost']}.val`];
                if (currentValueStr === null || currentValueStr === undefined) {
                    currentValueStr = false;
                } else {
                    currentValueStr = currentValueStr === '1' || currentValueStr === 'true' || currentValueStr === true;
                }
                modesButton.push(
                    <Button
                        key="boost"
                        color={currentValueStr ? 'primary' : 'inherit'}
                        onClick={() => {
                            let _currentValueStr = this.state.values[`${this.state.rxData['oid-boost']}.val`];
                            if (_currentValueStr === null || _currentValueStr === undefined) {
                                _currentValueStr = false;
                            } else {
                                _currentValueStr =
                                    _currentValueStr === '1' ||
                                    _currentValueStr === 'true' ||
                                    _currentValueStr === true;
                            }
                            const values: VisRxWidgetStateValues = JSON.parse(JSON.stringify(this.state.values));
                            values[`${this.state.rxData['oid-boost']}.val`] = !_currentValueStr;
                            this.setState({ values });
                            this.props.context.setValue(this.state.rxData['oid-boost'], !_currentValueStr);
                        }}
                        startIcon={<BoostIcon />}
                    >
                        {Generic.t('Boost')}
                    </Button>,
                );
            }
        }

        if (thermIsWithPowerButton) {
            modesButton.push(
                <Tooltip
                    key="power"
                    title={Generic.t('power').replace('vis_2_widgets_material_', '')}
                    slotProps={{ popper: { sx: styles.tooltip } }}
                >
                    <IconButton
                        color={this.state.values[`${this.state.rxData['oid-power']}.val`] ? 'primary' : 'inherit'}
                        onClick={() => {
                            const values: VisRxWidgetStateValues = JSON.parse(JSON.stringify(this.state.values));
                            const id: `${string}.val` = `${this.state.rxData['oid-power']}.val`;
                            values[id] = !values[id];
                            this.setState({ values });
                            this.props.context.setValue(this.state.rxData['oid-power'], values[id]);
                        }}
                    >
                        <PowerSettingsNewIcon />
                    </IconButton>
                </Tooltip>,
            );
        }

        const content = (
            <Box
                component="div"
                sx={styles.thermostatCircleDiv}
                style={{ height: withTitle ? 'calc(100% - 36px)' : '100%' }}
            >
                <style>
                    {`
@keyframes vis-2-widgets-material-newValueAnimationLight {
    0% {
        color: #00bd00;
    },
    80% {
        color: #008000;
    },
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
                {/* if no header, draw button here */}
                {withTitle ? null : chartButton}
                {size && this.state.tempObject ? (
                    <CircularSliderWithChildren
                        minValue={this.state.min === null || this.state.min === undefined ? 12 : this.state.min}
                        maxValue={this.state.max === null || this.state.max === undefined ? 30 : this.state.max}
                        size={size}
                        arcColor={arcColor}
                        arcBackgroundColor={this.props.context.themeType === 'dark' ? '#DDD' : '#222'}
                        startAngle={40}
                        // step={0.5}
                        handleSize={handleSize}
                        endAngle={320}
                        handle1={{
                            value: tempValue,
                            onChange: value => {
                                const values: VisRxWidgetStateValues = JSON.parse(JSON.stringify(this.state.values));
                                if (this.state.rxData.step === '0.5') {
                                    values[`${this.state.rxData['oid-temp-set']}.val`] = Math.round(value * 2) / 2;
                                } else {
                                    values[`${this.state.rxData['oid-temp-set']}.val`] = Math.round(value);
                                }
                                this.setState({ values });
                            },
                        }}
                        onControlFinished={() =>
                            this.props.context.setValue(
                                this.state.rxData['oid-temp-set'],
                                this.state.values[`${this.state.rxData['oid-temp-set']}.val`],
                            )
                        }
                    >
                        {tempValue !== null ? (
                            <Tooltip
                                title={Generic.t('desired_temperature')}
                                slotProps={{ popper: { sx: styles.tooltip } }}
                            >
                                <div
                                    style={{
                                        ...styles.thermostatDesiredTemp,
                                        fontSize: Math.round(size / 6),
                                        ...this.customStyle,
                                    }}
                                >
                                    <ThermostatIcon style={{ width: size / 8, height: size / 8 }} />
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'top',
                                            ...this.customStyle,
                                        }}
                                    >
                                        {this.formatValue(tempValue)}
                                        <span
                                            style={{
                                                fontSize: Math.round(size / 12),
                                                fontWeight: 'normal',
                                            }}
                                        >
                                            {this.state.rxData.unit || this.state.tempObject?.common?.unit}
                                        </span>
                                    </div>
                                </div>
                            </Tooltip>
                        ) : null}
                        {actualTemp !== null ? (
                            <Tooltip
                                title={Generic.t('actual_temperature')}
                                slotProps={{ popper: { sx: styles.tooltip } }}
                            >
                                <div
                                    style={{
                                        ...(this.props.context.themeType === 'dark'
                                            ? styles.thermostatNewValueDark
                                            : styles.thermostatNewValueLight),
                                        fontSize: Math.round((size * 0.6) / 6),
                                        opacity: 0.7,
                                        ...this.customStyle,
                                    }}
                                    key={`${actualTemp}valText`}
                                >
                                    {actualTemp}
                                    {this.state.rxData.unit || this.state.tempStateObject?.common?.unit}
                                </div>
                            </Tooltip>
                        ) : null}
                    </CircularSliderWithChildren>
                ) : this.state.tempObject ? (
                    <div style={{ width: '100%' }}>
                        <Slider
                            style={{ width: 'calc(100% - 50px)', display: 'inline-block' }}
                            min={this.state.min === null || this.state.min === undefined ? 12 : this.state.min}
                            max={this.state.max === null || this.state.max === undefined ? 30 : this.state.max}
                            step={this.state.step || 0.5}
                            value={tempValue}
                            valueLabelDisplay="auto"
                            onChange={(_e, value: number | number[]): void => {
                                const values: VisRxWidgetStateValues = JSON.parse(JSON.stringify(this.state.values));
                                if (this.state.rxData.step === '0.5') {
                                    values[`${this.state.rxData['oid-temp-set']}.val`] =
                                        Math.round((value as number) * 2) / 2;
                                } else {
                                    values[`${this.state.rxData['oid-temp-set']}.val`] = Math.round(value as number);
                                }
                                this.setState({ values });
                            }}
                            onChangeCommitted={() =>
                                this.props.context.setValue(
                                    this.state.rxData['oid-temp-set'],
                                    this.state.values[`${this.state.rxData['oid-temp-set']}.val`],
                                )
                            }
                        />
                        <div
                            style={{
                                textAlign: 'center',
                                display: 'inline-block',
                                flexDirection: 'column',
                                width: 50,
                            }}
                        >
                            {tempValue !== null ? (
                                <Tooltip
                                    title={Generic.t('desired_temperature')}
                                    slotProps={{ popper: { sx: styles.tooltip } }}
                                >
                                    <div
                                        style={{
                                            ...styles.thermostatDesiredTemp,
                                            fontSize: 12,
                                            ...this.customStyle,
                                        }}
                                    >
                                        <ThermostatIcon style={{ width: 24, height: 24 }} />
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'top',
                                                ...this.customStyle,
                                            }}
                                        >
                                            {this.formatValue(tempValue)}
                                            <span
                                                style={{
                                                    fontSize: 10,
                                                    fontWeight: 'normal',
                                                }}
                                            >
                                                {this.state.rxData.unit || this.state.tempObject?.common?.unit}
                                            </span>
                                        </div>
                                    </div>
                                </Tooltip>
                            ) : null}
                            {actualTemp !== null ? (
                                <Tooltip
                                    title={Generic.t('actual_temperature')}
                                    slotProps={{ popper: { sx: styles.tooltip } }}
                                >
                                    <div
                                        style={{
                                            ...(this.props.context.themeType === 'dark'
                                                ? styles.thermostatNewValueDark
                                                : styles.thermostatNewValueLight),
                                            fontSize: Math.round(10),
                                            opacity: 0.7,
                                            ...this.customStyle,
                                        }}
                                        key={`${actualTemp}valText`}
                                    >
                                        {actualTemp}
                                        {this.state.rxData.unit || this.state.tempStateObject?.common?.unit}
                                    </div>
                                </Tooltip>
                            ) : null}
                        </div>
                    </div>
                ) : null}
                <div style={{ ...styles.thermostatButtonsDiv, bottom: 8 }}>{modesButton}</div>
                {options.withDialog ? this.renderDialog() : null}
            </Box>
        );

        return content;
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element[] | React.JSX.Element | null {
        super.renderWidgetBody(props);

        this.customStyle = {};
        if (this.state.rxStyle) {
            if (this.state.rxStyle['font-weight']) {
                this.customStyle.fontWeight = this.state.rxStyle['font-weight'];
            }
            if (this.state.rxStyle['font-size']) {
                this.customStyle.fontSize = this.state.rxStyle['font-size'];
            }
            if (this.state.rxStyle['font-family']) {
                this.customStyle.fontFamily = this.state.rxStyle['font-family'];
            }
            if (this.state.rxStyle['font-style']) {
                this.customStyle.fontStyle = this.state.rxStyle['font-style'];
            }
            if (this.state.rxStyle['word-spacing']) {
                this.customStyle.wordSpacing = this.state.rxStyle['word-spacing'];
            }
            if (this.state.rxStyle['letter-spacing']) {
                this.customStyle.letterSpacing = this.state.rxStyle['letter-spacing'];
            }
        }

        const withCard = !this.state.rxData.noCard && !props.widget.usedInWidget;
        const withTitle = this.state.rxData.widgetTitle && withCard;

        const actualRxData = JSON.stringify(this.state.rxData);
        if (this.lastRxData !== actualRxData) {
            this.updateTimeout ||= setTimeout(async () => {
                this.updateTimeout = null;
                await this.thermostatReadObjects();
            }, 50);
        }

        const chartButton = this.state.isChart ? (
            <IconButton
                style={{
                    ...(withTitle ? undefined : styles.moreButton),
                    right: this.state.rxData.externalDialog ? undefined : withTitle ? undefined : 4,
                    left: this.state.rxData.externalDialog ? 16 : undefined,
                    top: this.state.rxData.externalDialog ? 16 : withTitle ? undefined : 4,
                    zIndex: 2,
                }}
                onClick={() => this.setState({ showDialog: true })}
            >
                <MoreVertIcon />
            </IconButton>
        ) : null;

        const content = this.renderThermostatContent({
            withTitle: !!withTitle,
            size: this.state.size,
            chartButton,
            withDialog: true,
        });

        if (this.state.rxData.externalDialog && !this.props.editMode) {
            return this.state.dialog ? (
                <Dialog
                    open={!0}
                    onClose={() => this.setState({ dialog: false })}
                >
                    <DialogTitle>
                        {this.state.rxData.widgetTitle}
                        <IconButton
                            style={{ float: 'right', zIndex: 2 }}
                            onClick={() => this.setState({ dialog: false })}
                        >
                            <Close />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent style={{ minWidth: 150, minHeight: 150 }}>{content}</DialogContent>
                </Dialog>
            ) : null;
        }

        if (!withCard) {
            return content;
        }

        return this.wrapContent(content, withTitle ? chartButton : null, { textAlign: 'center' });
    }
}
