import React from 'react';

import { Dialog, DialogContent, DialogTitle, IconButton, LinearProgress, Switch } from '@mui/material';

import { Close as IconClose } from '@mui/icons-material';

import { Icon } from '@iobroker/gui-components';
import type { RxRenderWidgetProps, RxWidgetInfo, VisRxWidgetProps, VisRxWidgetState } from '@iobroker/types-vis-2';

import Generic from './Generic';
/**
 * The chart of the history, which brings echarts with it. It is only shown in the dialog of the widget, so it is
 * loaded when the dialog is opened and not with the page.
 */
const ObjectChart = React.lazy(() => import('./Components/ObjectChart'));

const styles: Record<string, any> = {
    newValueLight: {
        animation: '$newValueAnimationLight 2s ease-in-out',
    },
    '@keyframes newValueAnimationLight': {
        '0%': {
            color: '#00bd00',
        },
        '80%': {
            color: '#008000',
        },
        '100%': {
            color: '#000',
        },
    },
    newValueDark: {
        animation: '$newValueAnimationDark 2s ease-in-out',
    },
    '@keyframes newValueAnimationDark': {
        '0%': {
            color: '#008000',
        },
        '80%': {
            color: '#00bd00',
        },
        '100%': {
            color: '#ffffff',
        },
    },
};

interface StaticRxData {
    noCard: boolean;
    widgetTitle: string;
    count: number;
    [key: `oid${number}`]: string;
    [key: `icon${number}`]: string;
    [key: `iconSmall${number}`]: string;
    [key: `iconEnabled${number}`]: string;
    [key: `iconEnabledSmall${number}`]: string;
    [key: `color${number}`]: string;
    [key: `colorEnabled${number}`]: string;
    [key: `title${number}`]: string;
}

interface StaticState extends VisRxWidgetState {
    showDialog: number | null;
    objects: { common: ioBroker.StateCommon; _id: string; isChart: boolean }[];
}

class Static extends Generic<StaticRxData, StaticState> {
    private lastRxData?: string;
    private updateTimeout: ReturnType<typeof setTimeout> | null = null;
    constructor(props: VisRxWidgetProps) {
        super(props);
        this.state = {
            ...this.state,
            objects: [],
            showDialog: null,
        };
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplMaterial2Static',
            visSet: 'vis-2-widgets-material',
            visSetLabel: 'set_label',
            visSetColor: '#0f8cc9',
            visName: 'Static information',
            visWidgetLabel: 'static_info', // Label of widget
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        {
                            name: 'noCard',
                            label: 'without_card',
                            type: 'checkbox',
                        },
                        {
                            name: 'widgetTitle',
                            label: 'name',
                            hidden: '!!data.noCard',
                        },
                        {
                            name: 'count',
                            type: 'number',
                            default: 2,
                            label: 'count',
                        },
                    ],
                },
                {
                    name: 'item',
                    label: 'group_item',
                    indexFrom: 1,
                    indexTo: 'count',
                    fields: [
                        {
                            name: 'oid',
                            type: 'id',
                            label: 'oid',
                        },
                        {
                            name: 'icon',
                            type: 'image',
                            label: 'icon',
                            hidden: '!!data.iconSmall',
                        },
                        {
                            name: 'iconSmall',
                            type: 'icon64',
                            label: 'small_icon',
                            hidden: '!!data.icon',
                        },
                        {
                            name: 'iconEnabled',
                            type: 'image',
                            label: 'icon_active',
                            hidden: '!!data.iconEnabledSmall',
                        },
                        {
                            name: 'iconEnabledSmall',
                            type: 'icon64',
                            label: 'small_icon_active',
                            hidden: '!!data.iconEnabled',
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
                            type: 'text',
                            label: 'title',
                            noButton: true,
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: '100%',
                height: 120,
                position: 'relative',
            },
            visPrev: 'widgets/material/img/prev_static.png',
        };
    }

    async propertiesUpdate(): Promise<void> {
        const actualRxData = JSON.stringify(this.state.rxData);
        if (this.lastRxData === actualRxData) {
            return;
        }

        this.lastRxData = actualRxData;

        const objects: { common: ioBroker.StateCommon; _id: string; isChart: boolean }[] = [];

        const defaultHistory = this.props.context.systemConfig?.common?.defaultHistory;

        // try to find icons for all OIDs
        for (let i = 1; i <= this.state.rxData.count; i++) {
            if (this.state.rxData[`oid${i}`]) {
                // read object itself
                const object = (await this.props.context.socket.getObject(this.state.rxData[`oid${i}`])) as
                    | ioBroker.StateObject
                    | null
                    | undefined;
                if (!object) {
                    objects[i] = { common: {} as ioBroker.StateCommon, _id: '', isChart: false };
                    continue;
                }
                object.common = object.common || {};
                const isChart = !!(defaultHistory && object.common.custom?.[defaultHistory]);
                if (
                    !this.state.rxData[`icon${i}`] &&
                    !this.state.rxData[`iconSmall${i}`] &&
                    !object.common.icon &&
                    (object.type === 'state' || object.type === 'channel')
                ) {
                    const idArray = this.state.rxData[`oid${i}`].split('.');

                    // read channel
                    const parentObject = await this.props.context.socket.getObject(idArray.slice(0, -1).join('.'));
                    if (!parentObject?.common?.icon) {
                        const grandParentObject = await this.props.context.socket.getObject(
                            idArray.slice(0, -2).join('.'),
                        );
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
                objects[i] = { common: object.common, _id: object._id, isChart };
            }
        }

        if (JSON.stringify(objects) !== JSON.stringify(this.state.objects)) {
            this.setState({ objects });
        }
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return Static.getWidgetInfo();
    }

    componentDidMount(): void {
        super.componentDidMount();
        void this.propertiesUpdate().catch(e => console.error(e));
    }

    async onRxDataChanged(): Promise<void> {
        await this.propertiesUpdate();
    }

    getStateIcon(key: number): React.JSX.Element | null {
        let iconStr: string | undefined = '';
        let icon: React.JSX.Element | null = null;
        const isEnabled =
            this.state.objects[key].common.type === 'boolean' &&
            this.state.values[`${this.state.rxData[`oid${key}`]}.val`];
        if (isEnabled) {
            iconStr = this.state.rxData[`iconEnabled${key}`] || this.state.rxData[`iconEnabledSmall${key}`];
        }
        iconStr ||= this.state.rxData[`icon${key}`] || this.state.rxData[`iconSmall${key}`];
        iconStr ||= this.state.objects[key].common.icon;

        if (iconStr) {
            icon = (
                <Icon
                    src={iconStr}
                    style={{
                        width: 24,
                        height: 24,
                    }}
                />
            );
        }

        return icon;
    }

    getColor(key: number): string | undefined {
        const isEnabled =
            this.state.objects[key].common.type === 'boolean' &&
            this.state.values[`${this.state.rxData[`oid${key}`]}.val`];
        return isEnabled
            ? this.state.rxData[`colorEnabled${key}`] ||
                  this.state.rxData[`color${key}`] ||
                  this.state.objects[key].common.color
            : this.state.rxData[`color${key}`] || this.state.objects[key].common.color;
    }

    getValue(key: number, styleUpdateVal: React.CSSProperties): string | React.JSX.Element | null {
        const object = this.state.objects[key];
        const state = this.state.values[`${this.state.rxData[`oid${key}`]}.val`];
        if (state === undefined) {
            return null;
        }
        if (object?.common?.states) {
            if ((object.common.states as Record<string, string>)[state?.toString()] !== undefined) {
                return (object.common.states as Record<string, string>)[state.toString()];
            }

            return state.toString();
        }

        const onClick: React.MouseEventHandler | undefined = object.isChart
            ? e => {
                  e.preventDefault();
                  e.stopPropagation();
                  this.setState({ showDialog: key });
              }
            : undefined;

        if (object?.common?.type === 'boolean') {
            return (
                <Switch
                    checked={state}
                    onClick={onClick}
                    style={{ cursor: onClick ? 'pointer' : 'default' }}
                />
            );
        }
        let val;

        if (object?.common?.type === 'number') {
            val = `${state}${object.common.unit || ''}`;
        } else {
            val = this.formatValue(state);
        }
        return (
            <span
                key={`${val}valText`}
                onClick={onClick}
                style={{ ...styleUpdateVal, cursor: onClick ? 'pointer' : 'default' }}
            >
                {val}
            </span>
        );
    }

    renderDialog(): React.ReactNode {
        if (this.state.showDialog === null) {
            return null;
        }

        const index = this.state.showDialog;

        return (
            <Dialog
                sx={{ '& .MuiDialog-paper': { height: '100%' } }}
                maxWidth="lg"
                fullWidth
                open={!0}
                onClose={() => this.setState({ showDialog: null })}
            >
                <DialogTitle>
                    {this.state.rxData.widgetTitle}
                    <IconButton
                        style={{ float: 'right' }}
                        onClick={() => this.setState({ showDialog: null })}
                    >
                        <IconClose />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <React.Suspense fallback={<LinearProgress />}>
                        <ObjectChart
                            t={(word: string) => Generic.t(word)}
                            lang={Generic.getLanguage()}
                            socket={this.props.context.socket}
                            obj={this.state.objects[index]}
                            chartTitle={
                                this.state.rxData[`title${index}`] ||
                                Generic.getText(this.state.objects[index].common?.name)
                            }
                            title=""
                            themeType={this.props.context.themeType}
                            historyInstance={Generic.getHistoryInstance(
                                this.state.objects[index],
                                this.props.context.systemConfig?.common?.defaultHistory || 'history.0',
                            )}
                            noToolbar={false}
                            systemConfig={this.props.context.systemConfig}
                            dateFormat={this.props.context.systemConfig.common.dateFormat}
                        />
                    </React.Suspense>
                </DialogContent>
            </Dialog>
        );
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element[] | React.JSX.Element | null {
        super.renderWidgetBody(props);

        const actualRxData = JSON.stringify(this.state.rxData);
        if (this.lastRxData !== actualRxData) {
            this.updateTimeout =
                this.updateTimeout ||
                setTimeout(async () => {
                    this.updateTimeout = null;
                    await this.propertiesUpdate();
                }, 50);
        }

        const icons: (React.JSX.Element | null)[] = this.state.objects.map((_, index) => this.getStateIcon(index));
        const anyIcon = icons.find(icon => icon);
        const styleUpdateVal = this.props.context.themeType === 'dark' ? styles.newValueDark : styles.newValueLight;

        const content = (
            <>
                {this.renderDialog()}
                {this.state.objects.map((obj, index) =>
                    obj ? (
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                width: '100%',
                                alignItems: 'center',
                            }}
                            key={index}
                        >
                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                {anyIcon ? (
                                    <span
                                        style={{
                                            width: 24,
                                            height: 24,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {icons[index]}
                                    </span>
                                ) : null}
                                <span style={{ color: this.getColor(index), paddingLeft: 16 }}>
                                    {this.state.rxData[`title${index}`] || Generic.getText(obj.common.name)}
                                </span>
                            </span>

                            {this.getValue(index, styleUpdateVal)}
                        </div>
                    ) : null,
                )}
            </>
        );

        return this.wrapContent(content);
    }
}

export default Static;
