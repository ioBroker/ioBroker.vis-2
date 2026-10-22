/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2023-2025 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 *
 * Short content:
 * Licensees may copy, distribute, display and perform the work and make derivative works based on it only if they give the author or licensor the credits in the manner specified by these.
 * Licensees may copy, distribute, display, and perform the work and make derivative works based on it only for noncommercial purposes.
 * (Free for non-commercial use).
 */

import React from 'react';

import type { TextFieldVariants } from '@mui/material';

import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';
import VisRxWidget from '../../visRxWidget';

// the picker brings `@mui/x-date-pickers` and dayjs along, see DateTimePickers.tsx
const VisTimePicker = React.lazy(() => import('./DateTimePickers').then(m => ({ default: m.VisTimePicker })));
const VisDateTimePicker = React.lazy(() => import('./DateTimePickers').then(m => ({ default: m.VisDateTimePicker })));

type RxData = {
    oid: string;
    variant: TextFieldVariants;
    autoFocus: boolean;
    clearable: boolean;
    widgetTitle: string;
    ampm: boolean;
    asDate: boolean;
    stepMinute: number;
    withDate: boolean;
    dateTimeFormat: string;
};

class JQuiInputDateTime extends VisRxWidget<RxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplJquiInputDatetime',
            visSet: 'jqui',
            visName: 'Input Time',
            visWidgetLabel: 'jqui_input_time',
            visHelp: 'help_jqui_input_time', // Description in the palette
            visPrev: 'widgets/jqui/img/Prev_InputDateTime.png',
            visOrder: 31,
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        {
                            name: 'oid',
                            type: 'id',
                        },
                        {
                            name: 'variant',
                            label: 'jqui_variant',
                            type: 'select',
                            options: [
                                { label: 'standard', value: 'standard' },
                                { label: 'outlined', value: 'outlined' },
                                { label: 'filled', value: 'filled' },
                            ],
                            default: 'standard',
                        },
                        {
                            name: 'autoFocus',
                            type: 'checkbox',
                        },
                        {
                            name: 'clearable',
                            label: 'jqui_clearable',
                            type: 'checkbox',
                        },
                        {
                            name: 'widgetTitle',
                            label: 'jqui_widgetTitle',
                            type: 'text',
                        },
                        {
                            name: 'ampm',
                            label: 'jqui_ampm',
                            type: 'checkbox',
                        },
                        {
                            name: 'withDate',
                            label: 'jqui_withDate',
                            type: 'checkbox',
                        },
                        {
                            name: 'asDate',
                            label: 'jqui_asDate',
                            type: 'checkbox',
                        },
                        {
                            name: 'dateTimeFormat',
                            label: 'jqui_dateTimeFormat',
                            type: 'text',
                            // DEFAULT_DATE_TIME_FORMAT of dateTimeValue.ts, whose dayjs must stay out of the runtime bundle
                            default: 'YYYY-MM-DD HH:mm',
                            hidden: '!data.withDate || !!data.asDate',
                        },
                        {
                            name: 'stepMinute',
                            label: 'jqui_stepMinute',
                            type: 'select',
                            options: [
                                { label: '1 minute', value: 1 },
                                { label: '2 minutes', value: 2 },
                                { label: '3 minutes', value: 3 },
                                { label: '4 minutes', value: 4 },
                                { label: '5 minutes', value: 5 },
                                { label: '10 minutes', value: 10 },
                                { label: '15 minutes', value: 15 },
                                { label: '20 minutes', value: 20 },
                                { label: '30 minutes', value: 30 },
                                { label: '60 minutes', value: 60 },
                            ],
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: 250,
                height: 56,
            },
        } as const;
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return JQuiInputDateTime.getWidgetInfo();
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        props.style.overflow = 'visible';

        const pickerProps = {
            value: this.state.values[`${this.state.rxData.oid}.val`],
            lang: this.props.context.lang,
            variant: this.state.rxData.variant,
            autoFocus: this.state.rxData.autoFocus,
            clearable: this.state.rxData.clearable,
            widgetTitle: this.state.rxData.widgetTitle,
            ampm: this.state.rxData.ampm,
            asDate: this.state.rxData.asDate,
            stepMinute: this.state.rxData.stepMinute,
            onChange: (val: string) => this.props.context.setValue(this.state.rxData.oid, val),
        };

        return (
            <div className="vis-widget-body">
                <React.Suspense fallback={null}>
                    {this.state.rxData.withDate ? (
                        <VisDateTimePicker
                            {...pickerProps}
                            dateTimeFormat={this.state.rxData.dateTimeFormat}
                        />
                    ) : (
                        <VisTimePicker {...pickerProps} />
                    )}
                </React.Suspense>
            </div>
        );
    }
}

export default JQuiInputDateTime;
