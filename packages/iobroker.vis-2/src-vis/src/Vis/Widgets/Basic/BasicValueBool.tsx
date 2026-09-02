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
};

/**
 * `Basic - Bool HTML`: one of two pieces of HTML, depending on whether a state is on or off.
 *
 * Replaces the can.js template `tplValueBool`. That template already read `min` and `max` although its
 * attribute list never offered them, so they are declared here - the behaviour is the one it always had, only
 * now the two can be set instead of having to arrive through the project file.
 */
class BasicValueBool extends VisRxWidget<RxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplValueBool',
            visSet: 'basic',
            visName: 'Bool HTML',
            visPrev: 'widgets/basic/img/Prev_ValueBool.svg',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'oid', type: 'id' },
                        { name: 'html_prepend', type: 'html' },
                        { name: 'html_append', type: 'html' },
                        { name: 'html_false', type: 'html' },
                        { name: 'html_true', type: 'html' },
                        { name: 'min', type: 'text' },
                        { name: 'max', type: 'text' },
                    ],
                },
            ],
            visWidgetLabel: 'value_bool', // Label of widget
            visHelp: 'help_value_bool', // Description in the palette
            visDefaultStyle: {
                width: 76,
                height: 76,
            },
        } as const;
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return BasicValueBool.getWidgetInfo();
    }

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
            >
                <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_prepend ?? '' }} />
                <span dangerouslySetInnerHTML={{ __html: html }} />
                <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_append ?? '' }} />
            </div>
        );
    }
}

export default BasicValueBool;
