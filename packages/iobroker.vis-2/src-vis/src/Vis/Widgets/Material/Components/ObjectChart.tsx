import React, { createRef, Component, type CSSProperties } from 'react';

import {
    Paper,
    LinearProgress,
    InputLabel,
    MenuItem,
    FormControl,
    Select,
    Toolbar,
    Fab,
    Box,
    type SxProps,
    type Theme,
} from '@mui/material';

// the ESM build, because the CJS one (`lib/core`) arrives as `{ default: … }` and React then gets an object
import ReactEchartsCore from 'echarts-for-react/esm/core';

import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
    GridComponent,
    ToolboxComponent,
    TooltipComponent,
    TitleComponent,
    TimelineComponent,
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

import { type ThemeType, Utils, withWidth, type IobTheme, type Connection } from '@iobroker/gui-components';
import type { EChartsOption, LineSeriesOption } from 'echarts';
import type { YAXisOption } from 'echarts/types/dist/shared';

/**
 * What a value axis can do beyond the published options: write its labels itself and keep a fixed step between them.
 *
 * echarts describes this in a type of its sources, which the package does not offer, so the axis is cast to this
 * when a boolean or a state list has to be written out.
 */
interface NumericYAxis {
    axisLabel?: { formatter?: (value: number) => string; showMaxLabel?: boolean };
    interval?: number;
}

echarts.use([
    TimelineComponent,
    ToolboxComponent,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LineChart,
    SVGRenderer,
]);

export type FormatterParam = {
    componentType: 'series';
    componentSubType: 'line';
    componentIndex: number;
    seriesType: 'line';
    // Index of series
    seriesIndex: number;
    // "\u0000series\u00000\u00000"
    seriesId: string;
    seriesName: string;
    name: string;
    /** Index in an array */
    dataIndex: number;
    data: {
        value: [ts: number, val: number];
        exact?: boolean;
    };
    value: [ts: number, val: number];
    exact?: boolean;
    // "rgba(243,177,31,0.65)"
    color: string;
    dimensionNames: ['x', 'y'];
    encode: {
        x: [0];
        y: [1];
    };
    $vars: ['seriesName', 'name', 'value'];
    axisDim: 'x';
    /** Index of X axis */
    axisIndex: number;
    axisType: 'xAxis.time';
    // "\u0000series\u00000\u00000"
    axisId: string;
    /** Time */
    axisValue: number;
    // Like "2025-05-02 14:01:52"
    axisValueLabel: string;
    // "<span style=\"display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:rgba(243,177,31,0.65);\"></span>"
    marker: string;
};

function SplitLineIcon(props: {
    style?: React.CSSProperties;
    width?: number | string;
    height?: number | string;
}): React.JSX.Element {
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
                d="M496 384H64V80c0-8.84-7.16-16-16-16H16C7.16 64 0 71.16 0 80v336c0 17.67 14.33 32 32 32h464c8.84 0 16-7.16 16-16v-32c0-8.84-7.16-16-16-16zM464 96H345.94c-21.38 0-32.09 25.85-16.97 40.97l32.4 32.4L288 242.75l-73.37-73.37c-12.5-12.5-32.76-12.5-45.25 0l-68.69 68.69c-6.25 6.25-6.25 16.38 0 22.63l22.62 22.62c6.25 6.25 16.38 6.25 22.63 0L192 237.25l73.37 73.37c12.5 12.5 32.76 12.5 45.25 0l96-96 32.4 32.4c15.12 15.12 40.97 4.41 40.97-16.97V112c.01-8.84-7.15-16-15.99-16z"
            />
        </svg>
    );
}

const styles: Record<string, CSSProperties | SxProps<IobTheme>> = {
    chartWithToolbar: theme => ({
        height: `calc(100% - ${parseFloat((theme?.mixins?.toolbar.minHeight as string) || '48') + 8}px)`,
    }),
    chartWithoutToolbar: {
        height: '100%',
    },
    customRange: (theme: IobTheme): { color: string } => ({
        color: theme?.palette?.primary.main || '#00bcd4',
    }),
};

const GRID_PADDING_LEFT = 80;
const GRID_PADDING_RIGHT = 25;

interface ObjectChartProps {
    socket: Connection;
    objects: Record<string, ioBroker.Object>;
    customsInstances: string[];
    obj: ioBroker.Object;
    obj2?: ioBroker.Object;
    historyInstance: string;
    historyInstance2?: string;
    lang: string;
    themeType: ThemeType;
    noToolbar?: boolean;
    customsStyles?: Record<string, CSSProperties | SxProps<IobTheme>>;
    customsClasses?: Record<string, CSSProperties | SxProps<IobTheme>>;
    customsIcons?: Record<string, React.ReactNode>;
    customsComponents?: Record<string, React.ReactNode>;
    unit?: string;
    unit2?: string;
    isFloatComma?: boolean;
    chartTitle?: string;
    title?: string;
    title2?: string;
    objLineType?: 'step' | 'line';
    obj2LineType?: 'step' | 'line';
    objBackgroundColor?: string;
    objColor?: string;
    obj2BackgroundColor?: string;
    obj2Color?: string;
    from: number;
    end: number;
    t: (key: string) => string;
    systemConfig: ioBroker.SystemConfigObject;
}

interface ObjectChartState {
    chartHeight: number;
    chartWidth: number;
    relativeRange: string;
    splitLine: boolean;
    maxYLen: number;
    maxYLen2: number;
    max: number;
}

interface ChartData {
    min?: number;
    max?: number;
    diff?: number;
    withTime?: boolean;
    withSeconds?: boolean;
    lastX?: number;
    lastWidth?: number | null;
}

class ObjectChart extends Component<ObjectChartProps, ObjectChartState> {
    private readTimeout: ReturnType<typeof setTimeout> | null = null;
    private timeTimer: ReturnType<typeof setTimeout> | null = null;
    private start: number;
    private end: number;
    private echartsReact: ReactEchartsCore | null = null;
    private rangeRef: React.RefObject<HTMLElement | null> = createRef();
    private maxYLenTimeout: ReturnType<typeof setTimeout> | null = null;
    private maxYLenTimeout2: ReturnType<typeof setTimeout> | null = null;
    private timerResize: ReturnType<typeof setTimeout> | null = null;
    private mouseDown: boolean = false;
    private chart: ChartData = {};
    private readonly divRef: React.RefObject<HTMLDivElement | null> = createRef();
    private readonly unit: string;
    private readonly unit2: string;
    private minY!: Record<string, number | null>;
    private maxY!: Record<string, number | null>;
    private minX!: Record<string, number | null>;
    private maxX!: Record<string, number | null>;
    private chartValues: Record<string, { val: number; ts: number; i?: boolean }[]> | null = null;

    constructor(props: ObjectChartProps) {
        super(props);
        if (!this.props.from) {
            const from = new Date();
            from.setHours(from.getHours() - 24 * 7);
            this.start = from.getTime();
        } else {
            this.start = this.props.from;
        }
        if (!this.props.end) {
            this.end = Date.now();
        } else {
            this.end = this.props.end;
        }
        let relativeRange = window.localStorage.getItem('App.relativeRange') || '30';
        const min = parseInt(window.localStorage.getItem('App.absoluteStart')!, 10) || 0;
        const max = parseInt(window.localStorage.getItem('App.absoluteEnd')!, 10) || 0;

        if ((!min || !max) && (!relativeRange || relativeRange === 'absolute')) {
            relativeRange = '30';
        }

        if (max && min) {
            relativeRange = 'absolute';
        }

        this.state = {
            chartHeight: 300,
            chartWidth: 500,
            relativeRange,
            splitLine: window.localStorage.getItem('App.splitLine') === 'true',
            // dateFormat: 'dd.MM.yyyy',
            // min,
            max,
            maxYLen: 0,
            maxYLen2: 0,
        };

        this.unit = this.props.unit
            ? ` ${this.props.unit}`
            : this.props.obj?.common?.unit
              ? ` ${this.props.obj.common.unit}`
              : '';

        this.unit2 = this.props.unit2
            ? ` ${this.props.unit2}`
            : this.props.obj2?.common?.unit
              ? ` ${this.props.obj2.common.unit}`
              : '';
    }

    componentDidMount(): void {
        const ids: string[] = [];
        if (this.props.obj._id && this.props.obj._id !== 'nothing_selected') {
            ids.push(this.props.obj._id);
        }
        if (this.props.obj2?._id && this.props.obj2._id !== 'nothing_selected') {
            ids.push(this.props.obj2._id);
        }

        if (ids.length) {
            void this.props.socket.subscribeState(ids, this.onChange);
        }
        window.addEventListener('resize', this.onResize);

        this.setRelativeInterval(this.state.relativeRange, true, () => this.forceUpdate());
    }

    componentWillUnmount(): void {
        if (this.readTimeout) {
            clearTimeout(this.readTimeout);
            this.readTimeout = null;
        }

        this.timeTimer && clearTimeout(this.timeTimer);
        this.timeTimer = null;

        this.maxYLenTimeout && clearTimeout(this.maxYLenTimeout);
        this.maxYLenTimeout = null;

        this.maxYLenTimeout2 && clearTimeout(this.maxYLenTimeout2);
        this.maxYLenTimeout2 = null;

        const ids = [];
        if (this.props.obj._id && this.props.obj._id !== 'nothing_selected') {
            ids.push(this.props.obj._id);
        }
        if (this.props.obj2?._id && this.props.obj2._id !== 'nothing_selected') {
            ids.push(this.props.obj2._id);
        }

        if (ids.length) {
            this.props.socket.unsubscribeState(ids, this.onChange);
        }

        window.removeEventListener('resize', this.onResize);
    }

    onResize = (): void => {
        this.timerResize && clearTimeout(this.timerResize);
        this.timerResize = setTimeout(() => {
            this.timerResize = null;
            this.componentDidUpdate();
        });
    };

    onChange = (id: string, state: ioBroker.State | null | undefined): void => {
        if ((id === this.props.obj._id || id === this.props.obj2?._id) && state) {
            if (!this.state.max || state.ts - this.state.max < 120000) {
                this.chartValues?.[id]?.push({ val: state.val as number, ts: state.ts });

                // update only if the end is near to now
                if (state.ts >= this.chart.min! && state.ts <= this.chart.max! + 300000) {
                    this.updateChart();
                }
            }
        }
    };

    async readHistory(start: number, end: number, id: string): Promise<{ val: number; ts: number; i?: boolean }[]> {
        const options: ioBroker.GetHistoryOptions = {
            instance: id === this.props.obj2?._id ? this.props.historyInstance2 : this.props.historyInstance,
            start,
            end,
            from: false,
            ack: false,
            q: false,
            addId: false,
            aggregate: 'none',
            returnNewestEntries: true,
        };

        // if more than 30 minutes => aggregate
        if (
            !id &&
            end - start > 60000 * 30 &&
            !(
                this.props.obj.common.type === 'boolean' ||
                (this.props.obj.common.type === 'number' && this.props.obj.common.states)
            )
        ) {
            options.aggregate = 'minmax';
            // options.step = 60000;
        }

        const values = await this.props.socket.getHistory(id, options);
        const chart: { val: number; ts: number; i?: boolean }[] = [];
        let minY = null;
        let maxY = null;

        for (let t = 0; t < values.length; t++) {
            if (!chart.length || chart[chart.length - 1].ts < values[t].ts) {
                chart.push(values[t] as { val: number; ts: number; i?: boolean });
            } else if (chart[chart.length - 1].ts === values[t].ts && chart[chart.length - 1].val !== values[t].ts) {
                console.error('Strange data!');
            }
            if (minY === null || values[t].val! < minY) {
                minY = values[t].val;
            }
            if (maxY === null || values[t].val! > maxY) {
                maxY = values[t].val;
            }
        }
        // sort
        chart.sort((a, b) => (a.ts > b.ts ? 1 : a.ts < b.ts ? -1 : 0));
        id ||= this.props.obj._id;
        this.chartValues ||= {};
        this.minY ||= {};
        this.maxY ||= {};
        this.minX ||= {};
        this.maxX ||= {};
        this.chartValues[id] = chart;
        this.minY[id] = minY as number;
        this.maxY[id] = maxY as number;
        this.minX[id] = minY as number;
        this.maxX[id] = maxY as number;
        if (this.minY[id]! < 10) {
            this.minY[id] = Math.round(this.minY[id]! * 10) / 10;
        } else {
            this.minY[id] = Math.ceil(this.minY[id]!);
        }
        if (this.maxY[id]! < 10) {
            this.maxY[id] = Math.round(this.maxY[id]! * 10) / 10;
        } else {
            this.maxY[id] = Math.ceil(this.maxY[id]!);
        }
        return chart;
    }

    convertData(
        values: { val: number; ts: number; i?: boolean }[] | null,
        id: string,
    ): { value: [ts: number, val: number]; exact?: boolean }[] {
        values ||= this.chartValues![id];
        const data: { value: [ts: number, val: number]; exact?: boolean }[] = [];
        if (!values?.length) {
            return data;
        }

        for (let i = 0; i < values.length; i++) {
            const dp: { value: [ts: number, val: number]; exact?: boolean } = { value: [values[i].ts, values[i].val] };
            if (values[i].i) {
                dp.exact = false;
            }
            data.push(dp);
        }

        if (id === this.props.obj._id && !this.chart.min) {
            this.chart.min = values[0].ts;
            this.chart.max = values[values.length - 1].ts;
        }

        return data;
    }

    static getColor(color: string, opacity: number): string {
        let r: number;
        let g: number;
        let b: number;
        if (color.startsWith('#')) {
            r = parseInt(color.substring(1, 3), 16);
            g = parseInt(color.substring(3, 5), 16);
            b = parseInt(color.substring(5, 7), 16);
        } else if (color.startsWith('rgb(')) {
            const parts = color.replace('rgb(', '').replace(')', '').split(',');
            r = parseInt(parts[0], 10);
            g = parseInt(parts[1], 10);
            b = parseInt(parts[2], 10);
        } else if (color.startsWith('rgba(')) {
            const parts = color.replace('rgba(', '').replace(')', '').split(',');
            r = parseInt(parts[0], 10);
            g = parseInt(parts[1], 10);
            b = parseInt(parts[2], 10);
        }
        return `rgba(${r!},${g!},${b!},${opacity})`;
    }

    getOption(): EChartsOption {
        let widthAxis;
        if (this.minY[this.props.obj._id] !== null && this.minY[this.props.obj._id] !== undefined) {
            widthAxis = (this.minY[this.props.obj._id]!.toString() + this.unit).length * 9 + 12;
        }
        if (this.maxY[this.props.obj._id] !== null && this.maxY[this.props.obj._id] !== undefined) {
            const w = (this.maxY[this.props.obj._id]!.toString() + this.unit).length * 9 + 12;
            if (w > (widthAxis as number)) {
                widthAxis = w;
            }
        }

        if (this.state.maxYLen) {
            const w = this.state.maxYLen * 9 + 12;
            if (w > (widthAxis as number)) {
                widthAxis = w;
            }
        }

        let widthAxis2: number | undefined;
        if (this.props.obj2) {
            if (this.minY[this.props.obj2._id] !== null && this.minY[this.props.obj2._id] !== undefined) {
                widthAxis2 = (this.minY[this.props.obj2._id]!.toString() + this.unit2).length * 9 + 12;
            }
            if (this.maxY[this.props.obj2._id] !== null && this.maxY[this.props.obj2._id] !== undefined) {
                const w = (this.maxY[this.props.obj2._id]!.toString() + this.unit2).length * 9 + 12;
                if (w > widthAxis2!) {
                    widthAxis2 = w;
                }
            }

            if (this.state.maxYLen2) {
                const w = this.state.maxYLen2 * 9 + 12;
                if (w > widthAxis2!) {
                    widthAxis2 = w;
                }
            }
        }

        const serie: LineSeriesOption = {
            xAxisIndex: 0,
            type: 'line',
            step: this.props.objLineType === 'step' ? 'start' : undefined,
            showSymbol: false,
            // @ts-expect-error fix later
            hoverAnimation: true,
            animation: false,
            data: this.convertData(null, this.props.obj._id),
            areaStyle: {
                color: this.props.objBackgroundColor || 'rgba(243,177,31,0.14)',
            },
            lineStyle: {
                color: this.props.objColor || '#f5ba4d',
            },
        };

        const yAxis: YAXisOption[] = [
            {
                type: 'value',
                boundaryGap: [0, '100%'],
                splitLine: {
                    show: this.props.noToolbar || !!this.state.splitLine,
                },
                splitNumber: Math.round(this.state.chartHeight / 50),
                name: this.props.title || undefined,
                nameTextStyle: {
                    align: 'left',
                },
                axisLabel: {
                    formatter: value => {
                        let text;
                        value = Math.round(value * 10) / 10;
                        if (this.props.isFloatComma) {
                            text = value.toString().replace(',', '.') + this.unit;
                        } else {
                            text = value + this.unit;
                        }

                        if (this.state.maxYLen < text.length) {
                            this.maxYLenTimeout && clearTimeout(this.maxYLenTimeout);
                            this.maxYLenTimeout = setTimeout(maxYLen => this.setState({ maxYLen }), 200, text.length);
                        }
                        return text;
                    },
                    showMaxLabel: true,
                    showMinLabel: true,
                },
                axisTick: {
                    // @ts-expect-error fix later
                    alignWithLabel: true,
                },
            },
        ];

        let serie2: LineSeriesOption;
        if (this.props.obj2) {
            serie2 = {
                xAxisIndex: 0,
                type: 'line',
                yAxisIndex: 1,
                step: this.props.obj2LineType === 'step' || !this.props.obj2LineType ? 'start' : undefined,
                showSymbol: false,
                // @ts-expect-error fix later
                hoverAnimation: true,
                animation: false,
                data: this.convertData(null, this.props.obj2._id),
                areaStyle: {
                    color: this.props.obj2BackgroundColor || 'rgba(141,243,31,0.14)',
                },
                lineStyle: {
                    color: this.props.obj2Color || '#21b400',
                },
            };
            yAxis.push({
                type: 'value',
                alignTicks: true,
                boundaryGap: [0, '100%'],
                name: this.props.title2 || undefined,
                nameTextStyle: {
                    align: 'right',
                },
                splitLine: {
                    show: this.props.noToolbar || !!this.state.splitLine,
                },
                splitNumber: Math.round(this.state.chartHeight / 50),
                axisLabel: {
                    formatter: value => {
                        let text;
                        value = Math.round(value * 10) / 10;
                        if (this.props.isFloatComma) {
                            text = value.toString().replace(',', '.') + this.unit2;
                        } else {
                            text = value + this.unit2;
                        }

                        if (this.state.maxYLen2 < text.length) {
                            if (this.maxYLenTimeout2) {
                                clearTimeout(this.maxYLenTimeout2);
                            }
                            this.maxYLenTimeout2 = setTimeout(
                                (maxYLen2: number): void => this.setState({ maxYLen2 }),
                                200,
                                text.length,
                            );
                        }
                        return text;
                    },
                    showMaxLabel: true,
                    showMinLabel: true,
                },
                axisTick: {
                    // @ts-expect-error fix later
                    alignWithLabel: true,
                },
            });
        }

        if (this.props.obj?.common?.type === 'boolean') {
            serie.step = 'end';
            yAxis[0].axisLabel!.showMaxLabel = false;
            (yAxis[0] as unknown as NumericYAxis).axisLabel!.formatter = value => (value === 1 ? 'TRUE' : 'FALSE');
            yAxis[0].max = 1.5;
            (yAxis[0] as unknown as NumericYAxis).interval = 1;
            widthAxis = 50;
        } else if (this.props.obj?.common?.type === 'number' && this.props.obj.common.states) {
            serie.step = 'end';
            yAxis[0].axisLabel!.showMaxLabel = false;
            (yAxis[0] as unknown as NumericYAxis).axisLabel!.formatter = value =>
                this.props.obj.common.states[value] !== undefined ? this.props.obj.common.states[value] : value;
            const keys = Object.keys(this.props.obj.common.states);
            keys.sort();
            yAxis[0].max = parseFloat(keys[keys.length - 1]) + 0.5;
            (yAxis[0] as unknown as NumericYAxis).interval = 1;
            let max = '';
            for (let i = 0; i < keys.length; i++) {
                if (
                    typeof this.props.obj.common.states[keys[i]] === 'string' &&
                    this.props.obj.common.states[keys[i]].length > max.length
                ) {
                    max = this.props.obj.common.states[keys[i]];
                }
            }
            widthAxis = (max.length * 9 || 50) + 12;
        } else if (this.props.obj?.common?.type === 'number') {
            if (this.props.obj.common.min !== undefined && this.props.obj.common.max !== undefined) {
                yAxis[0].max = this.props.obj.common.max;
                yAxis[0].min = this.props.obj.common.min;
            } else if (this.props.obj.common.unit === '%') {
                yAxis[0].max = 100;
                yAxis[0].min = 0;
            }
        }

        if (this.props.obj2?.common?.type === 'boolean') {
            serie.step = 'end';
            yAxis[1].axisLabel!.showMaxLabel = false;
            (yAxis[1] as unknown as NumericYAxis).axisLabel!.formatter = value => (value === 1 ? 'TRUE' : 'FALSE');
            yAxis[1].max = 1.5;
            (yAxis[1] as unknown as NumericYAxis).interval = 1;
            widthAxis2 = 50;
        } else if (this.props.obj2?.common?.type === 'number' && this.props.obj2.common.states) {
            serie.step = 'end';
            yAxis[1].axisLabel!.showMaxLabel = false;
            (yAxis[1] as unknown as NumericYAxis).axisLabel!.formatter = value =>
                this.props.obj2!.common.states[value] !== undefined ? this.props.obj2!.common.states[value] : value;
            const keys = Object.keys(this.props.obj2.common.states);
            keys.sort();
            yAxis[1].max = parseFloat(keys[keys.length - 1]) + 0.5;
            (yAxis[1] as unknown as NumericYAxis).interval = 1;
            let max = '';
            for (let i = 0; i < keys.length; i++) {
                if (
                    typeof this.props.obj2.common.states[keys[i]] === 'string' &&
                    this.props.obj2.common.states[keys[i]].length > max.length
                ) {
                    max = this.props.obj2.common.states[keys[i]];
                }
            }
            widthAxis2 = (max.length * 9 || 50) + 12;
        } else if (this.props.obj2?.common?.type === 'number') {
            if (this.props.obj2.common.min !== undefined && this.props.obj2.common.max !== undefined) {
                yAxis[1].max = this.props.obj2.common.max;
                yAxis[1].min = this.props.obj2.common.min;
            } else if (this.props.obj2.common.unit === '%') {
                yAxis[1].max = 100;
                yAxis[1].min = 0;
            }
        }

        const splitNumber = this.chart.withSeconds
            ? Math.round((this.state.chartWidth - GRID_PADDING_RIGHT - GRID_PADDING_LEFT) / 100)
            : Math.round((this.state.chartWidth - GRID_PADDING_RIGHT - GRID_PADDING_LEFT) / 60);

        return {
            backgroundColor: 'transparent',
            title: {
                text: this.props.noToolbar
                    ? ''
                    : this.props.chartTitle !== undefined
                      ? this.props.chartTitle
                      : Utils.getObjectNameFromObj(this.props.obj, this.props.lang as ioBroker.Languages),
                padding: [
                    10, // up
                    0, // right
                    0, // down
                    widthAxis ? widthAxis + 10 : GRID_PADDING_LEFT + 10, // left
                ],
            },
            grid: {
                left: widthAxis || GRID_PADDING_LEFT,
                top: yAxis[0].name || (yAxis[1] && yAxis[1].name) ? 38 : 8,
                right: widthAxis2 || (this.props.noToolbar ? 5 : GRID_PADDING_RIGHT),
                bottom: 40,
            },
            tooltip: {
                trigger: 'axis',
                formatter: (params: any): string | HTMLElement => {
                    const lines: string[] = [];
                    const date = new Date((params as FormatterParam[])[0].value[0]);
                    let first = true;
                    for (const param of params as FormatterParam[]) {
                        const [, val] = param.value;
                        let value: number | string = val;
                        if (value !== null && value !== undefined) {
                            value = Math.round(value * 1000) / 1000;
                        }

                        if (value !== null && this.props.isFloatComma) {
                            value = value.toString().replace('.', ',');
                        }
                        lines.push(
                            `<div style="display: flex; gap: 4px; align-items: center">
<div style="border-radius: 15px;width: 15px;height: 15px;background-color: ${first ? this.props.objColor || '#f5ba4d' : this.props.obj2Color || '#21b400'};"></div>
<div>${first ? this.props.title : this.props.title2} -</div>
<div style="flex-grow: 1"></div>
<div>${param.exact === false ? 'i' : ''}${value}${this.unit}</div>
</div>`,
                        );
                        first = false;
                    }

                    const div = document.createElement('div');
                    div.innerHTML = `<div>${date.toLocaleString()}.${date.getMilliseconds().toString().padStart(3, '0')}</div>${lines.join('\n')}`;
                    return div;
                },
                axisPointer: {
                    animation: true,
                },
            },
            xAxis: {
                type: 'time',
                splitLine: {
                    show: false,
                },
                splitNumber,
                min: this.chart.min,
                max: this.chart.max,
                // @ts-expect-error fix later
                axisTick: { alignWithLabel: true },
                axisLabel: {
                    formatter: (value: number) => {
                        const date = new Date(value);
                        if (this.chart.withSeconds) {
                            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
                        }
                        if (this.chart.withTime) {
                            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}\n${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                        }
                        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}\n${date.getFullYear()}`;
                    },
                },
            },
            yAxis,
            series: [serie, serie2!],
        };
    }

    static getDerivedStateFromProps(): null {
        return null;
    }

    updateChart(start?: number, end?: number, withReadData?: boolean, cb?: () => void): void {
        if (start) {
            this.start = start;
        }
        if (end) {
            this.end = end;
        }
        start ||= this.start;
        end ||= this.end;

        if (this.readTimeout) {
            clearTimeout(this.readTimeout);
        }

        this.readTimeout = setTimeout(
            async () => {
                this.readTimeout = null;

                const diff = this.chart.max! - this.chart.min!;
                if (diff !== this.chart.diff) {
                    this.chart.diff = diff;
                    this.chart.withTime = this.chart.diff < 3600000 * 24 * 7;
                    this.chart.withSeconds = this.chart.diff < 60000 * 30;
                }

                if (withReadData || !this.chartValues) {
                    const values = await this.readHistory(start, end, this.props.obj._id);
                    let values2: { val: number; ts: number; i?: boolean }[] | undefined;
                    if (this.props.obj2) {
                        values2 = await this.readHistory(start, end, this.props.obj2._id);
                    }

                    if (this.echartsReact && typeof this.echartsReact.getEchartsInstance === 'function') {
                        this.echartsReact.getEchartsInstance().setOption({
                            series: [
                                { data: this.convertData(values, this.props.obj._id) },
                                this.props.obj2 ? { data: this.convertData(values2!, this.props.obj2._id) } : undefined,
                            ],
                            xAxis: {
                                min: this.chart.min,
                                max: this.chart.max,
                            },
                        });
                    }
                    cb?.();
                } else if (this.echartsReact && typeof this.echartsReact.getEchartsInstance === 'function') {
                    this.echartsReact.getEchartsInstance().setOption({
                        series: [
                            { data: this.convertData(null, this.props.obj._id) },
                            this.props.obj2 ? { data: this.convertData(null, this.props.obj2._id) } : undefined,
                        ],
                        xAxis: {
                            min: this.chart.min,
                            max: this.chart.max,
                        },
                    });
                    cb?.();
                }
            },
            this.chartValues ? 400 : 0,
        ); // For the first time, don't wait 400 ms and read immediately
    }

    setNewRange(readData?: boolean): void {
        /* if (this.rangeRef.current &&
            this.rangeRef.current.childNodes[1] &&
            this.rangeRef.current.childNodes[1].value) {
            this.rangeRef.current.childNodes[0].innerHTML = '';
            this.rangeRef.current.childNodes[1].value = '';
        } */
        this.chart.diff = this.chart.max! - this.chart.min!;
        this.chart.withTime = this.chart.diff < 3600000 * 24 * 7;
        this.chart.withSeconds = this.chart.diff < 60000 * 30;

        if (this.state.relativeRange !== 'absolute') {
            this.setState({ relativeRange: 'absolute' });
            // stop shift timer
            this.timeTimer && clearTimeout(this.timeTimer);
            this.timeTimer = null;
        } else if (this.echartsReact && typeof this.echartsReact.getEchartsInstance === 'function') {
            this.echartsReact.getEchartsInstance().setOption({
                xAxis: {
                    min: this.chart.min,
                    max: this.chart.max,
                },
            });

            if (readData) {
                this.updateChart(this.chart.min, this.chart.max, true);
            }
        }
    }

    shiftTime(): void {
        const now = new Date();
        const delay = 60000 - now.getSeconds() - (1000 - now.getMilliseconds());

        if (now.getMilliseconds()) {
            now.setMilliseconds(1000);
        }
        if (now.getSeconds()) {
            now.setSeconds(60);
        }

        const max = now.getTime();
        let min;
        let mins: string | number = this.state.relativeRange;

        if (mins === 'day') {
            now.setHours(0);
            now.setMinutes(0);
            min = now.getTime();
        } else if (mins === 'week') {
            now.setHours(0);
            now.setMinutes(0);
            // find week start
            if (now.getDay()) {
                // if not sunday
                now.setDate(now.getDate() - now.getDay() - 1);
            } else {
                now.setDate(now.getDate() - 6);
            }
            min = now.getTime();
        } else if (mins === '2weeks') {
            now.setHours(0);
            now.setMinutes(0);
            // find week start
            if (now.getDay()) {
                // if not sunday
                now.setDate(now.getDate() - now.getDay() - 8);
            } else {
                now.setDate(now.getDate() - 13);
            }
            min = now.getTime();
        } else if (mins === 'month') {
            now.setHours(0);
            now.setMinutes(0);
            now.setDate(1);
            min = now.getTime();
        } else if (mins === 'year') {
            now.setHours(0);
            now.setMinutes(0);
            now.setDate(1);
            now.setMonth(0);
            min = now.getTime();
        } else if (mins === '12months') {
            now.setHours(0);
            now.setMinutes(0);
            now.setFullYear(now.getFullYear() - 1);
            min = now.getTime();
        } else {
            mins = parseInt(mins, 10);
            min = max - mins * 60000;
        }

        this.chart.min = min;
        this.chart.max = max;

        this.setState({ /* min, */ max }, () => this.updateChart(this.chart.min, this.chart.max, true));

        this.timeTimer = setTimeout(() => {
            this.timeTimer = null;
            this.shiftTime();
        }, delay || 60000);
    }

    setRelativeInterval(mins: string | number, dontSave?: boolean, cb?: () => void): void {
        if (!dontSave) {
            window.localStorage.setItem('App.relativeRange', mins as string);
            this.setState({ relativeRange: mins as string });
        }
        if (mins === 'absolute') {
            this.timeTimer && clearTimeout(this.timeTimer);
            this.timeTimer = null;
            this.updateChart(this.chart.min, this.chart.max, true, cb);
            return;
        }
        window.localStorage.removeItem('App.absoluteStart');
        window.localStorage.removeItem('App.absoluteEnd');

        const now = new Date();

        if (!this.timeTimer) {
            const delay = 60000 - now.getSeconds() - (1000 - now.getMilliseconds());
            this.timeTimer = setTimeout(() => {
                this.timeTimer = null;
                this.shiftTime();
            }, delay || 60000);
        }

        if (now.getMilliseconds()) {
            now.setMilliseconds(1000);
        }
        if (now.getSeconds()) {
            now.setSeconds(60);
        }

        this.chart.max = now.getTime();

        if (mins === 'day') {
            now.setHours(0);
            now.setMinutes(0);
            this.chart.min = now.getTime();
        } else if (mins === 'week') {
            now.setHours(0);
            now.setMinutes(0);
            // find week start
            if (now.getDay()) {
                // if not sunday
                now.setDate(now.getDate() - now.getDay() - 1);
            } else {
                now.setDate(now.getDate() - 6);
            }
            this.chart.min = now.getTime();
        } else if (mins === '2weeks') {
            now.setHours(0);
            now.setMinutes(0);
            // find week start
            if (now.getDay()) {
                // if not sunday
                now.setDate(now.getDate() - now.getDay() - 8);
            } else {
                now.setDate(now.getDate() - 13);
            }
            this.chart.min = now.getTime();
        } else if (mins === 'month') {
            now.setHours(0);
            now.setMinutes(0);
            now.setDate(1);
            this.chart.min = now.getTime();
        } else if (mins === 'year') {
            now.setHours(0);
            now.setMinutes(0);
            now.setDate(1);
            now.setMonth(0);
            this.chart.min = now.getTime();
        } else if (mins === '12months') {
            now.setHours(0);
            now.setMinutes(0);
            now.setFullYear(now.getFullYear() - 1);
            this.chart.min = now.getTime();
        } else {
            mins = parseInt(mins as string, 10);
            this.chart.min = this.chart.max - mins * 60000;
        }

        this.setState({ /* min: this.chart.min, */ max: this.chart.max }, () =>
            this.updateChart(this.chart.min, this.chart.max, true, cb),
        );
    }

    installEventHandlers(): void {
        if (!this.echartsReact || typeof this.echartsReact.getEchartsInstance !== 'function') {
            return;
        }

        const zr = this.echartsReact.getEchartsInstance().getZr();
        if (!(zr as any)._iobInstalled) {
            (zr as any)._iobInstalled = true;
            zr.on('mousedown', e => {
                console.log('mouse down');
                this.mouseDown = true;
                this.chart.lastX = e.offsetX;
            });
            zr.on('mouseup', () => {
                console.log('mouse up');
                this.mouseDown = false;
                this.setNewRange(true);
            });
            zr.on('mousewheel', e => {
                let diff = this.chart.max! - this.chart.min!;
                const width = this.state.chartWidth - GRID_PADDING_RIGHT - GRID_PADDING_LEFT;
                const x = e.offsetX - GRID_PADDING_LEFT;
                const pos = x / width;

                const oldDiff = diff;
                const amount = e.wheelDelta > 0 ? 1.1 : 0.9;
                diff *= amount;
                const move = oldDiff - diff;
                this.chart.max! += move * (1 - pos);
                this.chart.min! -= move * pos;

                this.setNewRange();
            });
            zr.on('mousemove', e => {
                if (this.mouseDown) {
                    const moved = this.chart.lastX! - (e.offsetX - GRID_PADDING_LEFT);
                    this.chart.lastX = e.offsetX - GRID_PADDING_LEFT;
                    const diff = this.chart.max! - this.chart.min!;
                    const width = this.state.chartWidth - GRID_PADDING_RIGHT - GRID_PADDING_LEFT;

                    const shift = Math.round((moved * diff) / width);
                    this.chart.min! += shift;
                    this.chart.max! += shift;
                    this.setNewRange();
                }
            });

            zr.on('touchstart', e => {
                e.preventDefault();
                this.mouseDown = true;
                const touches = e.touches || e.originalEvent.touches;
                if (touches) {
                    this.chart.lastX = touches[touches.length - 1].pageX;
                    if (touches.length > 1) {
                        this.chart.lastWidth = Math.abs(touches[0].pageX - touches[1].pageX);
                    } else {
                        this.chart.lastWidth = null;
                    }
                }
            });
            zr.on('touchend', e => {
                e.preventDefault();
                this.mouseDown = false;
                this.setNewRange(true);
            });
            zr.on('touchmove', e => {
                e.preventDefault();
                const touches = e.touches || e.originalEvent.touches;
                if (!touches) {
                    return;
                }
                const pageX = touches[touches.length - 1].pageX - GRID_PADDING_LEFT;
                if (this.mouseDown) {
                    if (touches.length > 1) {
                        // zoom
                        const fingerWidth = Math.abs(touches[0].pageX - touches[1].pageX);
                        if (this.chart.lastWidth !== null && fingerWidth !== this.chart.lastWidth) {
                            let diff = this.chart.max! - this.chart.min!;
                            const chartWidth = this.state.chartWidth - GRID_PADDING_RIGHT - GRID_PADDING_LEFT;

                            const amount = fingerWidth > this.chart.lastWidth! ? 1.1 : 0.9;
                            const positionX =
                                touches[0].pageX > touches[1].pageX
                                    ? touches[1].pageX - GRID_PADDING_LEFT + fingerWidth / 2
                                    : touches[0].pageX - GRID_PADDING_LEFT + fingerWidth / 2;

                            const pos = positionX / chartWidth;

                            const oldDiff = diff;
                            diff *= amount;
                            const move = oldDiff - diff;

                            this.chart.max! += move * (1 - pos);
                            this.chart.min! -= move * pos;

                            this.setNewRange();
                        }
                        this.chart.lastWidth = fingerWidth;
                    } else {
                        // swipe
                        const moved = this.chart.lastX! - pageX;
                        const diff = this.chart.max! - this.chart.min!;
                        const chartWidth = this.state.chartWidth - GRID_PADDING_RIGHT - GRID_PADDING_LEFT;

                        const shift = Math.round((moved * diff) / chartWidth);
                        this.chart.min! += shift;
                        this.chart.max! += shift;

                        this.setNewRange();
                    }
                }
                this.chart.lastX = pageX;
            });
        }
    }

    renderChart(): React.ReactNode {
        if (this.chartValues && this.chartValues[this.props.obj._id]) {
            return (
                <ReactEchartsCore
                    ref={e => {
                        this.echartsReact = e;
                    }}
                    echarts={echarts}
                    option={this.getOption()}
                    notMerge
                    lazyUpdate
                    theme={this.props.themeType === 'dark' ? 'dark' : ''}
                    style={{ height: `${this.state.chartHeight}px`, width: '100%' }}
                    opts={{ renderer: 'svg' }}
                    onEvents={{ rendered: () => this.installEventHandlers() }}
                />
            );
        }
        return <LinearProgress />;
    }

    componentDidUpdate(): void {
        if (this.divRef.current) {
            const width = this.divRef.current.offsetWidth;
            const height = this.divRef.current.offsetHeight;
            if (this.state.chartHeight !== height) {
                // || this.state.chartHeight !== height) {
                setTimeout(() => this.setState({ chartHeight: height, chartWidth: width }), 100);
            }
        }
    }

    renderToolbar(): React.ReactNode {
        if (this.props.noToolbar) {
            return null;
        }

        const showTimeSettings = window.document.body.clientWidth > 600;

        return (
            <Toolbar style={{ display: 'flex', justifyContent: 'space-between' }}>
                <FormControl
                    variant="standard"
                    style={{ minWidth: 200 }}
                >
                    <InputLabel>{this.props.t('relative')}</InputLabel>
                    <Select
                        variant="standard"
                        ref={this.rangeRef}
                        value={this.state.relativeRange}
                        onChange={e => this.setRelativeInterval(e.target.value)}
                    >
                        <MenuItem
                            value="absolute"
                            sx={{
                                color: 'primary.main',
                            }}
                        >
                            {this.props.t('custom_range')}
                        </MenuItem>
                        <MenuItem value={10}>{this.props.t('last 10 minutes')}</MenuItem>
                        <MenuItem value={30}>{this.props.t('last 30 minutes')}</MenuItem>
                        <MenuItem value={60}>{this.props.t('last hour')}</MenuItem>
                        <MenuItem value="day">{this.props.t('this day')}</MenuItem>
                        <MenuItem value={24 * 60}>{this.props.t('last 24 hours')}</MenuItem>
                        <MenuItem value="week">{this.props.t('this week')}</MenuItem>
                        <MenuItem value={24 * 60 * 7}>{this.props.t('last week')}</MenuItem>
                        <MenuItem value="2weeks">{this.props.t('this 2 weeks')}</MenuItem>
                        <MenuItem value={24 * 60 * 14}>{this.props.t('last 2 weeks')}</MenuItem>
                        <MenuItem value="month">{this.props.t('this month')}</MenuItem>
                        <MenuItem value={30 * 24 * 60}>{this.props.t('last 30 days')}</MenuItem>
                        <MenuItem value="year">{this.props.t('this year')}</MenuItem>
                        <MenuItem value="12months">{this.props.t('last 12 months')}</MenuItem>
                    </Select>
                </FormControl>
                {showTimeSettings ? (
                    <Fab
                        variant="extended"
                        size="small"
                        color={this.state.splitLine ? 'primary' : undefined}
                        aria-label="show lines"
                        onClick={() => {
                            window.localStorage.setItem('App.splitLine', this.state.splitLine ? 'false' : 'true');
                            this.setState({ splitLine: !this.state.splitLine });
                        }}
                    >
                        <SplitLineIcon
                            style={{
                                marginRight: 8,
                            }}
                        />
                        {this.props.t('Show lines')}
                    </Fab>
                ) : null}
            </Toolbar>
        );
    }

    render(): React.ReactNode {
        return (
            <Paper
                style={{
                    height: '100%',
                    maxHeight: '100%',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    width: '100%',
                }}
            >
                {this.renderToolbar()}
                <Box
                    component="div"
                    ref={this.divRef}
                    style={{
                        width: '100%',
                        overflow: 'hidden',
                    }}
                    sx={(this.props.noToolbar ? styles.chartWithoutToolbar : styles.chartWithToolbar) as SxProps<Theme>}
                >
                    {this.renderChart()}
                </Box>
            </Paper>
        );
    }
}

export default withWidth()(ObjectChart);
