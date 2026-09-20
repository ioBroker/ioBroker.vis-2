import React, { type CSSProperties } from 'react';

import type {
    RxRenderWidgetProps,
    RxWidgetInfo,
    VisRxWidgetProps,
    VisWidgetCommand,
    WidgetData,
} from '@iobroker/types-vis-2';

import BlindsBase, { type BlindsBaseRxData, type BlindsBaseState, type HelperObject } from './Components/BlindsBase';

const styles: Record<string, CSSProperties> = {
    cardContent: {
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        overflow: 'hidden',
        height: '100%',
    },
};

interface BlindsRxData extends BlindsBaseRxData {
    noCard: boolean;
    widgetTitle: string;
    sashCount: number;
    ratio: number;
    borderWidth: number;
    oid: string;
    oid_stop: string;
    showValue: boolean;
    min: string;
    max: string;
    invert: boolean;
    externalDialog: boolean;
    [key: `slideSensor_oid${number}`]: string;
    [key: `slideRatio${number}`]: number;
    [key: `slidePos_oid${number}`]: string;
    [key: `slideHandle_oid${number}`]: string;
}

export default class Blinds extends BlindsBase<BlindsRxData, BlindsBaseState> {
    private readonly refCardContent: React.RefObject<HTMLDivElement | null> = React.createRef();
    private lastRxData: string | undefined;
    private updateTimeout: ReturnType<typeof setTimeout> | undefined;

    constructor(props: VisRxWidgetProps) {
        super(props);
        this.state = { ...this.state, objects: [] };
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplMaterial2Blinds',
            visSet: 'vis-2-widgets-material',
            visSetLabel: 'set_label',
            visSetColor: '#0f8cc9',
            visName: 'Blinds',
            visWidgetLabel: 'blinds', // Label of widget
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
                            hidden: '!!data.noCard',
                        },
                        {
                            name: 'sashCount',
                            type: 'number',
                            default: 1,
                            label: 'sash_count',
                        },
                        {
                            name: 'ratio',
                            type: 'slider',
                            min: 0.1,
                            max: 3,
                            step: 0.1,
                            label: 'window_ratio',
                            default: 1,
                        },
                        {
                            name: 'borderWidth',
                            type: 'slider',
                            min: 0,
                            max: 100,
                            step: 0.1,
                            label: 'border_width',
                            default: 3,
                        },
                        {
                            name: 'oid',
                            type: 'id',
                            default: '',
                            label: 'blinds_position_oid',
                            noInit: true,
                            onChange: async (field, data, changeData, socket) => {
                                if (data[field.name!]) {
                                    const object = await socket.getObject(data[field.name!]);
                                    if (object?.common) {
                                        let changed = false;

                                        // try to find stop button
                                        const id = object._id.split('.');
                                        id.pop();
                                        const states = await socket.getObjectViewSystem(
                                            'state',
                                            `${id.join('.')}.`,
                                            `${id.join('.')}.\u9999`,
                                        );
                                        if (states) {
                                            Object.values(states).forEach(state => {
                                                if (state?.common?.role?.includes('stop')) {
                                                    data.blinds_stop_oid = state._id;
                                                    changed = true;
                                                }
                                            });
                                        }

                                        changed && changeData(data);
                                    }
                                }
                            },
                        },
                        {
                            name: 'oid_stop',
                            type: 'id',
                            default: '',
                            label: 'blinds_stop_oid',
                            noInit: true,
                            hidden: (data: WidgetData) => !data.oid,
                        },
                        {
                            label: 'show_value',
                            type: 'checkbox',
                            name: 'showValue',
                            hidden: (data: WidgetData) => !data.oid,
                            default: true,
                        },
                        {
                            label: 'min_position',
                            type: 'number',
                            hidden: (data: WidgetData) => !data.oid,
                            name: 'min',
                        },
                        {
                            label: 'max_position',
                            type: 'number',
                            hidden: (data: WidgetData) => !data.oid,
                            name: 'max',
                        },
                        {
                            label: 'invert_position',
                            type: 'checkbox',
                            hidden: (data: WidgetData) => !data.oid,
                            name: 'invert',
                        },
                        {
                            name: 'externalDialog',
                            label: 'use_as_dialog',
                            type: 'checkbox',
                            tooltip: 'use_as_dialog_tooltip',
                        },
                        /*{
                            name: 'timeout',
                            type: 'slider',
                            label: 'controlTimeout',
                            min: 0,
                            max: 2000,
                        },*/
                    ],
                },
                {
                    name: 'sashes',
                    label: 'sash',
                    indexFrom: 1,
                    indexTo: 'sashCount',
                    fields: [
                        {
                            name: 'slideSensor_oid',
                            type: 'id',
                            label: 'slide_sensor_oid',
                            noInit: true,
                        },
                        {
                            name: 'slideHandle_oid',
                            type: 'id',
                            label: 'handle_sensor_oid',
                            noInit: true,
                        },
                        {
                            name: 'slideType',
                            type: 'select',
                            label: 'sash_type',
                            options: [
                                { value: '', label: 'sash_none' },
                                { value: 'left', label: 'left' },
                                { value: 'right', label: 'right' },
                                { value: 'top', label: 'top' },
                                { value: 'bottom', label: 'bottom' },
                            ],
                        },
                        {
                            name: 'slideRatio',
                            type: 'slider',
                            label: 'slide_ratio',
                            default: 1,
                            min: 0.1,
                            max: 4,
                            step: 0.1,
                            hidden: (data: WidgetData) => data.sashCount < 2,
                        },
                        {
                            name: 'slidePos_oid',
                            type: 'id',
                            default: '',
                            label: 'blinds_position_oid',
                            hidden: (data: WidgetData) => !!data.oid,
                            noInit: true,
                            onChange: async (field, data, changeData, socket) => {
                                if (data[field.name!]) {
                                    const object = await socket.getObject(data[field.name!]);
                                    const index = field.name!.match(/(\d+)$/)![1];
                                    if (object?.common) {
                                        let changed = false;
                                        // try to find stop button
                                        const id = object._id.split('.');
                                        id.pop();
                                        const states = await socket.getObjectViewSystem(
                                            'state',
                                            `${id.join('.')}.`,
                                            `${id.join('.')}.\u9999`,
                                        );
                                        if (states) {
                                            Object.values(states).forEach(state => {
                                                if (state?.common?.role?.includes('stop')) {
                                                    data[`slideStop_oid${index}`] = state._id;
                                                    changed = true;
                                                }
                                            });
                                        }
                                        changed && changeData(data);
                                    }
                                }
                            },
                        },
                        {
                            name: 'slideStop_oid',
                            type: 'id',
                            default: '',
                            label: 'blinds_stop_oid',
                            noInit: true,
                            hidden: (data, index) => !!data.oid || !data[`slidePos_oid${index}`],
                        },
                        {
                            label: 'min_position',
                            type: 'number',
                            hidden: (data, index) => !!data.oid || !data[`slidePos_oid${index}`],
                            name: 'slideMin',
                        },
                        {
                            label: 'max_position',
                            type: 'number',
                            hidden: (data, index) => !!data.oid || !data[`slidePos_oid${index}`],
                            name: 'slideMax',
                        },
                        {
                            label: 'invert_position',
                            type: 'checkbox',
                            hidden: (data, index) => !!data.oid || !data[`slidePos_oid${index}`],
                            name: 'slideInvert',
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: '100%',
                height: 120,
                position: 'relative',
            },
            visPrev: 'widgets/material/img/prev_blinds.png',
        } as const;
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return Blinds.getWidgetInfo();
    }

    async propertiesUpdate(): Promise<void> {
        const actualRxData = JSON.stringify(this.state.rxData);
        if (this.lastRxData === actualRxData) {
            return;
        }

        this.lastRxData = actualRxData;
        const objects: (HelperObject | null | string)[] = [];
        const ids: string[] = [];
        for (let index = 1; index <= this.state.rxData.sashCount; index++) {
            if (
                this.state.rxData[`slidePos_oid${index}`] &&
                this.state.rxData[`slidePos_oid${index}`] !== 'nothing_selected'
            ) {
                ids.push(this.state.rxData[`slidePos_oid${index}`]);
            }
        }
        if (this.state.rxData.oid && this.state.rxData.oid !== 'nothing_selected') {
            ids.push(this.state.rxData.oid);
        }
        const _objects: Record<string, ioBroker.StateObject> = ids.length
            ? ((await this.props.context.socket.getObjectsById(ids)) as Record<string, ioBroker.StateObject>)
            : {};
        const _object = _objects[this.state.rxData.oid] || null;
        const main = _object?.common || ({} as ioBroker.StateCommon);

        // try to find icons for all OIDs
        for (let index = 1; index <= this.state.rxData.sashCount; index++) {
            if (
                this.state.rxData[`slidePos_oid${index}`] &&
                this.state.rxData[`slidePos_oid${index}`] !== 'nothing_selected'
            ) {
                // read object itself
                const object = _objects[this.state.rxData[`slidePos_oid${index}`]];
                objects[index] = {
                    common: object?.common || ({} as ioBroker.StateCommon),
                    _id: this.state.rxData[`slidePos_oid${index}`],
                    widgetType: 'blinds',
                };
            }
        }

        if (
            JSON.stringify(objects) !== JSON.stringify(this.state.objects) ||
            JSON.stringify(main) !== JSON.stringify(this.state.main)
        ) {
            this.setState({ objects, main });
        }
    }

    async componentDidMount(): Promise<void> {
        super.componentDidMount();
        await this.propertiesUpdate();
    }

    async onRxDataChanged(): Promise<void> {
        await this.propertiesUpdate();
    }

    onCommand(command: VisWidgetCommand): any {
        const result = super.onCommand(command);
        if (result === false) {
            if (command === 'openDialog') {
                this.setState({ showBlindsDialog: true });
                return true;
            }
            if (command === 'closeDialog') {
                this.setState({ showBlindsDialog: false });
                return true;
            }
        }

        return result;
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        const actualRxData = JSON.stringify(this.state.rxData);
        if (this.lastRxData !== actualRxData) {
            this.updateTimeout ||= setTimeout(async () => {
                this.updateTimeout = undefined;
                await this.propertiesUpdate();
            }, 50);
        }

        let height: number;
        let width: number;
        if (!this.refCardContent.current) {
            setTimeout(() => this.forceUpdate(), 50);
        } else {
            height = this.refCardContent.current.offsetHeight; // take 10° for opened slash
            // if one of the slashes could be opened, find the length of it
            let length = 0;
            for (let i = 1; i <= this.state.rxData.sashCount; i++) {
                if (this.state.rxData[`slideSensor_oid${i}`] || this.state.rxData[`slideHandle_oid${i}`]) {
                    if (length < this.state.rxData[`slideRatio${i}`]) {
                        length = this.state.rxData[`slideRatio${i}`];
                    }
                }
            }

            width = this.refCardContent.current.offsetWidth;

            if (length) {
                const oneWidth = (width / this.state.rxData.sashCount) * length;
                height -= 0.12 * oneWidth;
            }
        }

        const data = this.getMinMaxPosition(0);
        height! -= 8;

        const content = (
            <div
                ref={this.refCardContent}
                style={{ ...styles.cardContent, cursor: data.hasControl ? 'pointer' : undefined }}
                onClick={
                    data.hasControl
                        ? e => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (!this.lastClick || Date.now() - this.lastClick > 300) {
                                  this.setState({ showBlindsDialog: true });
                              }
                          }
                        : undefined
                }
            >
                {height! ? this.renderBlindsDialog() : null}
                {height! ? this.renderWindows({ height: height!, width: width! }) : null}
            </div>
        );

        if (this.state.rxData.externalDialog && !this.props.editMode) {
            return this.renderBlindsDialog();
        }

        if (this.state.rxData.noCard || props.widget.usedInWidget) {
            return content;
        }

        return this.wrapContent(
            content,
            this.state.rxData.showValue && data.hasControl ? <span>{data.shutterPos}%</span> : null,
        );
    }
}
