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
    test_html: string;
};

/**
 * `Basic - String (unescaped)`: the value of a state, written into the page as HTML instead of as text.
 *
 * It replaces the can.js template `tplValueStringRaw`, whose whole point is the unescaped output - the template
 * uses `<%==` where `tplValueString` uses `<%=`, so a state that holds markup is rendered as markup. That is
 * why `BasicValueString` cannot simply be reused with a flag: the two differ in exactly this, and a project
 * that has this widget expects its state to reach the page unescaped.
 */
class BasicValueStringRaw extends VisRxWidget<RxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplValueStringRaw',
            visSet: 'basic',
            visName: 'String (unescaped)',
            visPrev: 'widgets/basic/img/Prev_ValueStringRaw.svg',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'oid', type: 'id' },
                        { name: 'html_prepend', type: 'html' },
                        { name: 'html_append', type: 'html' },
                        { name: 'test_html', type: 'html' },
                    ],
                },
            ],
            visWidgetLabel: 'value_string_raw', // Label of widget
            visHelp: 'help_value_string_raw', // Description in the palette
            visDefaultStyle: {
                width: 50,
                height: 20,
            },
        } as const;
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return BasicValueStringRaw.getWidgetInfo();
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        // set default width and height
        props.style.width ??= 50;
        props.style.height ??= 20;

        let body: string;
        if (this.props.editMode && this.state.rxData.test_html) {
            body = this.state.rxData.test_html;
        } else {
            const value = this.state.values[`${this.state.rxData.oid}.val`];
            body = value === undefined || value === null ? '' : `${value as string}`;
        }

        return (
            <div className="vis-widget-body">
                <div data-oid={this.state.rxData.oid}>
                    <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_prepend ?? '' }} />
                    <span dangerouslySetInnerHTML={{ __html: body }} />
                    <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_append ?? '' }} />
                </div>
            </div>
        );
    }
}

export default BasicValueStringRaw;
