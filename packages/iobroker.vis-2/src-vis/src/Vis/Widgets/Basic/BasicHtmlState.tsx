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
    html: string;
    value: string;
    urlValue: string;
};

/**
 * `Basic - HTML State`: a piece of HTML that writes one fixed value when it is clicked.
 *
 * Replaces the can.js template `tplBasicState` with `vis.binds.basic.state`. Unlike the bool widgets it does
 * not toggle and does not read the state at all: it always writes the one value it was given, which is what
 * makes it the widget for a scene or a command.
 */
class BasicHtmlState extends VisRxWidget<RxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplBasicState',
            visSet: 'basic',
            visName: 'HTML State',
            visPrev: 'widgets/basic/img/Prev_BasicState.svg',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'oid', type: 'id' },
                        { name: 'html', type: 'html' },
                        { name: 'value', type: 'text' },
                        { name: 'urlValue', type: 'text' },
                    ],
                },
            ],
            visWidgetLabel: 'basic_state', // Label of widget
            visHelp: 'help_basic_state', // Description in the palette
            visDefaultStyle: {
                width: 76,
                height: 76,
            },
        } as const;
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return BasicHtmlState.getWidgetInfo();
    }

    /** Write the value, and call the URL if one was given */
    private onClick = (): void => {
        if (this.props.editMode) {
            return;
        }

        if (this.state.rxData.urlValue) {
            this.props.context.socket.getRawSocket().emit('httpGet', this.state.rxData.urlValue);
        }

        const oid = this.state.rxData.oid;
        if (!oid) {
            return;
        }

        // An attribute is text, but a state that counts in numbers or switches has to receive its own type.
        let value: string | number | boolean = this.state.rxData.value;
        if (value === undefined || value === null) {
            value = false;
        } else if (value === 'true') {
            value = true;
        } else if (value === 'false') {
            value = false;
        } else {
            const parsed = parseFloat(value);
            if (parsed.toString() === value) {
                value = parsed;
            }
        }

        this.props.context.setValue(oid, value);
    };

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        // set default width and height
        props.style.width ??= 76;
        props.style.height ??= 76;

        return (
            <div
                className="vis-widget-body"
                data-oid={this.state.rxData.oid}
                style={{ cursor: this.props.editMode ? undefined : 'pointer' }}
                onClick={this.onClick}
                dangerouslySetInnerHTML={{ __html: this.state.rxData.html ?? '' }}
            />
        );
    }
}

export default BasicHtmlState;
