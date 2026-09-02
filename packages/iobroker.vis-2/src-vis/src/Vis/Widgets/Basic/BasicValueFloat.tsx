/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
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

import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';
import VisRxWidget from '../../visRxWidget';
import VisBaseWidget from '../../visBaseWidget';
import { addClass } from '../../visUtils';

type RxData = {
    oid: string;
    html_prepend: string;
    html_append_singular: string;
    html_append_plural: string;
    /** digits after the decimal separator; empty leaves the value as it is */
    digits: number | string;
    /** decimal comma instead of the decimal point */
    is_comma: boolean;
    /** thousands separator */
    is_tdp: boolean;
    factor: number | string;
    /** a boolean state: while it is true the widget carries `class_true`, otherwise `class_false` */
    'oid-quality': string;
    class_true: string;
    class_false: string;
    test_html: string;
};

/**
 * `Basic - Number`: a state shown as a formatted number. It replaces the can.js template `tplValueFloat`, whose
 * behaviour - `vis.binds.basic.formatFloat` and the template around it - is kept here to the letter, so that
 * projects with the old widget look the same.
 */
export default class BasicValueFloat extends VisRxWidget<RxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplValueFloat',
            visSet: 'basic',
            visName: 'Number',
            visPrev: 'widgets/basic/img/Prev_ValueFloat.svg',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'oid', type: 'id' },
                        { name: 'html_prepend', type: 'html' },
                        { name: 'html_append_singular', type: 'html' },
                        { name: 'html_append_plural', type: 'html' },
                    ],
                },
                {
                    name: 'extended',
                    fields: [
                        { name: 'digits', type: 'number' },
                        { name: 'is_comma', type: 'checkbox', default: true },
                        { name: 'is_tdp', type: 'checkbox' },
                        { name: 'factor', type: 'number', default: 1 },
                        { name: 'oid-quality', type: 'id' },
                        { name: 'class_true', type: 'text' },
                        { name: 'class_false', type: 'text' },
                        { name: 'test_html', type: 'html' },
                    ],
                },
            ],
            visWidgetLabel: 'value_float', // Label of widget
            visHelp: 'help_value_float', // Description in the palette
            visDefaultStyle: {
                width: 60,
                height: 18,
            },
        } as const;
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return BasicValueFloat.getWidgetInfo();
    }

    /**
     * The value as the widget shows it: multiplied, rounded and with the separators the settings ask for.
     *
     * This is `vis.binds.basic.formatFloat` of the can.js widget. Rounding by `digits` is done before the
     * separators are applied and again inside the thousands formatting, as it was there - the results are the
     * same, and a project that has the old widget must not change its display.
     *
     * @returns the text to show; an empty string when there is no number
     */
    formatFloat(): string {
        const data = this.state.rxData;
        let val: number | string;

        if (this.props.editMode && data.test_html !== undefined && data.test_html !== '') {
            val = parseFloat(data.test_html);
        } else {
            val = parseFloat(this.state.values[`${data.oid}.val`] as string);
        }

        if (data.factor !== undefined && data.factor !== '') {
            val *= parseFloat(data.factor as string);
        }
        if (data.digits !== undefined && data.digits !== '') {
            val = val.toFixed(parseFloat(data.digits as string));
        }

        if (data.is_tdp) {
            // `.,` is thousands `.` and decimal `,`, the way formatValue() reads its format
            val = VisBaseWidget.formatValue(
                val,
                data.digits ? parseInt(data.digits as string, 10) : 2,
                data.is_comma ? '.,' : ',.',
            );
        } else if (data.is_comma) {
            val = `${val}`.replace('.', ',');
        }

        return `${val}`;
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        // set default width and height
        props.style.width ??= 60;
        props.style.height ??= 18;

        // the quality state chooses between the two classes; a missing state is "not true"
        const quality = this.state.rxData['oid-quality']
            ? this.state.values[`${this.state.rxData['oid-quality']}.val`]
            : undefined;
        const qualityClass =
            quality === true || quality === 'true' ? this.state.rxData.class_true : this.state.rxData.class_false;
        if (qualityClass) {
            props.className = addClass(props.className, qualityClass);
        }

        const text = this.formatFloat();
        const append =
            parseFloat(text) === 1 ? this.state.rxData.html_append_singular : this.state.rxData.html_append_plural;

        return (
            <div className="vis-widget-body">
                <div data-oid={this.state.rxData.oid}>
                    <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_prepend ?? '' }} />
                    <span>{text}</span>
                    <span dangerouslySetInnerHTML={{ __html: append ?? '' }} />
                </div>
            </div>
        );
    }
}
