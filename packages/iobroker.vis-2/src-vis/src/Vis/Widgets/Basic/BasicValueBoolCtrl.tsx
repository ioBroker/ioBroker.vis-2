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
import { isFalse } from '../Utils/boolValue';

type RxData = {
    oid: string;
    min: string;
    max: string;
    html_prepend: string;
    html_append: string;
    html_false: string;
    html_true: string;
    urlTrue: string;
    urlFalse: string;
    oidTrue: string;
    oidFalse: string;
};

/**
 * `Basic - Bool HTML` (the controlling one): shows one of two pieces of HTML and switches the state when it is
 * clicked.
 *
 * Replaces the can.js template `tplValueBoolCtrl` with `vis.binds.basic.toggle`. The switching keeps the shape
 * that helper had: with `oidTrue`/`urlTrue` the widget writes somewhere else - or calls a URL - and reads the
 * state only to know which way to switch; without them it writes the state itself, where `min` and `max` name
 * the two values it toggles between.
 */
class BasicValueBoolCtrl extends VisRxWidget<RxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplValueBoolCtrl',
            visSet: 'basic',
            visName: 'Bool HTML (control)',
            visPrev: 'widgets/basic/img/Prev_ValueBoolCtrl.svg',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'oid', type: 'id' },
                        { name: 'min', type: 'text' },
                        { name: 'max', type: 'text' },
                        { name: 'html_prepend', type: 'html' },
                        { name: 'html_append', type: 'html' },
                        { name: 'html_false', type: 'html' },
                        { name: 'html_true', type: 'html' },
                    ],
                },
                {
                    name: 'ccontrol',
                    fields: [
                        { name: 'urlTrue', type: 'text' },
                        { name: 'urlFalse', type: 'text' },
                        { name: 'oidTrue', type: 'id' },
                        { name: 'oidFalse', type: 'id' },
                    ],
                },
            ],
            visWidgetLabel: 'value_bool_ctrl', // Label of widget
            visHelp: 'help_value_bool_ctrl', // Description in the palette
            visDefaultStyle: {
                width: 76,
                height: 76,
            },
        } as const;
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return BasicValueBoolCtrl.getWidgetInfo();
    }

    /**
     * The value to write, read as a number when it looks like one.
     *
     * `vis.binds.basic.toggle` did the same before every write: an attribute is text, but a state that counts
     * in numbers has to receive a number.
     *
     * @param value - what the settings ask to write
     * @returns the value in the type the state expects
     */
    private static asValue(value: string | boolean): string | number | boolean {
        if (value === 'false') {
            return false;
        }
        if (value === 'true') {
            return true;
        }
        if (typeof value === 'string') {
            const parsed = parseFloat(value);
            if (parsed.toString() === value) {
                return parsed;
            }
        }
        return value;
    }

    /** Switch: what happens when the widget is clicked */
    private onToggle = (): void => {
        if (this.props.editMode) {
            return;
        }

        const { oid, oidTrue, urlTrue } = this.state.rxData;
        const oidFalse = this.state.rxData.oidFalse || oidTrue;
        const urlFalse = this.state.rxData.urlFalse || urlTrue;
        const min = this.state.rxData.min;
        const max = this.state.rxData.max;
        const value = this.state.values[`${oid}.val`];

        if (oidTrue || urlTrue) {
            // The state is only read here to know which way to switch; what is written goes somewhere else.
            let on: boolean;
            if (!oid || oid === 'nothing_selected') {
                on = !this.ownState;
                this.ownState = on;
            } else if (max !== undefined && max !== '') {
                on = !(BasicValueBoolCtrl.asValue(value as string) == BasicValueBoolCtrl.asValue(max));
            } else {
                on = !(value === 1 || value === '1' || value === true || value === 'true');
            }

            if (oidTrue) {
                const target = on ? oidTrue : oidFalse;
                const fallback = on
                    ? max === '' || max === undefined
                        ? true
                        : max
                    : min === '' || min === undefined
                      ? false
                      : min;
                this.props.context.setValue(target, BasicValueBoolCtrl.asValue(fallback));
            }

            if (urlTrue) {
                this.props.context.socket.getRawSocket().emit('httpGet', on ? urlTrue : urlFalse);
            }
            return;
        }

        if (!oid) {
            return;
        }

        // The widget writes its own state: off goes to `max`, on goes to `min`, and anything in between is
        // decided by which of the two it is nearer to.
        const hasMin = min !== undefined && min !== '';
        const hasMax = max !== undefined && max !== '';

        if (
            (!hasMin &&
                (value === null || value === '' || value === undefined || value === false || value === 'false')) ||
            (hasMin && min == value)
        ) {
            this.props.context.setValue(oid, hasMax ? BasicValueBoolCtrl.asValue(max) : true);
        } else if ((!hasMax && (value === true || value === 'true')) || (hasMax && value == max)) {
            this.props.context.setValue(oid, hasMin ? BasicValueBoolCtrl.asValue(min) : false);
        } else {
            const numeric = parseFloat(value as string);
            if (hasMin && hasMax) {
                this.props.context.setValue(
                    oid,
                    BasicValueBoolCtrl.asValue(numeric >= (parseFloat(max) - parseFloat(min)) / 2 ? min : max),
                );
            } else {
                this.props.context.setValue(oid, numeric >= 0.5 ? 0 : 1);
            }
        }
    };

    /** Without an own state to read, the widget remembers on its own which way it switched last */
    private ownState = false;

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        // set default width and height
        props.style.width ??= 76;
        props.style.height ??= 76;

        const off = isFalse(
            this.state.values[`${this.state.rxData.oid}.val`],
            this.state.rxData.min,
            this.state.rxData.max,
        );
        const html = (off ? this.state.rxData.html_false : this.state.rxData.html_true) ?? '';

        return (
            <div
                className="vis-widget-body"
                data-oid={this.state.rxData.oid}
                style={{ cursor: this.props.editMode ? undefined : 'pointer' }}
                onClick={this.onToggle}
            >
                <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_prepend ?? '' }} />
                <span dangerouslySetInnerHTML={{ __html: html }} />
                <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_append ?? '' }} />
            </div>
        );
    }
}

export default BasicValueBoolCtrl;
