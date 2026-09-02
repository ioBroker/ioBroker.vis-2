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
    html_prepend: string;
    html_append: string;
    autoFocus: boolean;
};

/**
 * `Basic - Bool Checkbox`: a plain checkbox that writes a state.
 *
 * Replaces the can.js template `tplValueBoolCheckbox` with `vis.binds.basic.checkbox`. That helper could also
 * run numerically, with a `min` and a `max`, but the template never offered the attributes for it, so the
 * widget always wrote `false` and `true` - which is what it does here.
 */
class BasicValueBoolCheckbox extends VisRxWidget<RxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplValueBoolCheckbox',
            visSet: 'basic',
            visName: 'Bool Checkbox',
            visPrev: 'widgets/basic/img/Prev_ValueBoolCheckbox.svg',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'oid', type: 'id' },
                        { name: 'html_prepend', type: 'html' },
                        { name: 'html_append', type: 'html' },
                        { name: 'autoFocus', type: 'checkbox' },
                    ],
                },
            ],
            visWidgetLabel: 'value_bool_checkbox', // Label of widget
            visHelp: 'help_value_bool_checkbox', // Description in the palette
            visDefaultStyle: {
                width: 40,
                height: 30,
            },
        } as const;
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return BasicValueBoolCheckbox.getWidgetInfo();
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        const oid = this.state.rxData.oid;
        const checked = !isFalse(this.state.values[`${oid}.val`]);
        const autoFocus = this.state.rxData.autoFocus === true || (this.state.rxData.autoFocus as unknown) === 'true';

        return (
            <div className="vis-widget-body">
                <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_prepend ?? '' }} />
                <input
                    type="checkbox"
                    name={`${this.props.id}_checkbox`}
                    id={`${this.props.id}_checkbox`}
                    data-oid={oid}
                    autoFocus={autoFocus}
                    checked={checked}
                    // the editor shows the state of the widget but must not write it
                    readOnly={this.props.editMode}
                    onChange={
                        this.props.editMode ? undefined : e => oid && this.props.context.setValue(oid, e.target.checked)
                    }
                />
                <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_append ?? '' }} />
            </div>
        );
    }
}

export default BasicValueBoolCheckbox;
