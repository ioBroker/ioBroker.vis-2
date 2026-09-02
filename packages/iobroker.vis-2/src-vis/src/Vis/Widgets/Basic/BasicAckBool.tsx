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

type RxData = {
    oid: string;
    html_prepend: string;
    html_append: string;
    html_false: string;
    html_true: string;
};

/**
 * `Basic - AckFlag HTML`: one of two pieces of HTML, depending on the ACK flag of a state - whether a written
 * value has been confirmed by the device.
 *
 * Replaces the can.js template `tplAckBool`. It brought its own test instead of using `isFalse`, and that test
 * is kept: only `false`, the string `"false"` and a value that parses to 0 count as not acknowledged.
 */
class BasicAckBool extends VisRxWidget<RxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplAckBool',
            visSet: 'basic',
            visName: 'AckFlag HTML',
            visPrev: 'widgets/basic/img/Prev_AckBool.svg',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'oid', type: 'id' },
                        { name: 'html_prepend', type: 'html' },
                        { name: 'html_append', type: 'html' },
                        { name: 'html_false', type: 'html' },
                        { name: 'html_true', type: 'html' },
                    ],
                },
            ],
            visWidgetLabel: 'value_ack_bool', // Label of widget
            visHelp: 'help_value_ack_bool', // Description in the palette
            visDefaultStyle: {
                width: 76,
                height: 76,
            },
        } as const;
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return BasicAckBool.getWidgetInfo();
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        // set default width and height
        props.style.width ??= 76;
        props.style.height ??= 76;

        const ack: unknown = this.state.values[`${this.state.rxData.oid}.ack`];
        const value = parseFloat(ack as string);

        const notAcknowledged = ack === false || ack === 'false' || value == 0;
        const html = (notAcknowledged ? this.state.rxData.html_false : this.state.rxData.html_true) ?? '';

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

export default BasicAckBool;
