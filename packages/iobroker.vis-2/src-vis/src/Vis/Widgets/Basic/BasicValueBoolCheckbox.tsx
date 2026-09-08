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

import { Checkbox } from '@mui/material';

import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';
import VisRxWidget from '../../visRxWidget';
import { isFalse } from '../Utils/boolValue';

type RxData = {
    oid: string;
    html_prepend: string;
    html_append: string;
    autoFocus: boolean;
    mui?: boolean;
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
                        /*
                         * The look of the control. `default: true` is what makes this a change for new
                         * widgets only: the defaults of the fields are written into the data when a widget is
                         * placed (see `Editor.addWidget`) and are never filled in while rendering, so a
                         * widget that is already on a page has no `mui` at all - and keeps the look it was
                         * built with until this is switched on for it.
                         */
                        { name: 'mui', label: 'vis_2_widgets_basic_mui', type: 'checkbox', default: true },
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

        // a binding may hand the flag over as a string
        const mui = this.state.rxData.mui === true || (this.state.rxData.mui as unknown as string) === 'true';

        return (
            <div className="vis-widget-body">
                <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_prepend ?? '' }} />
                {mui ? (
                    <Checkbox
                        id={`${this.props.id}_checkbox`}
                        data-oid={oid}
                        autoFocus={autoFocus}
                        checked={checked}
                        size="small"
                        // the editor shows the state of the widget but must not write it
                        readOnly={this.props.editMode}
                        onChange={
                            this.props.editMode
                                ? undefined
                                : e => oid && this.props.context.setValue(oid, e.target.checked)
                        }
                    />
                ) : (
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
                            this.props.editMode
                                ? undefined
                                : e => oid && this.props.context.setValue(oid, e.target.checked)
                        }
                    />
                )}
                <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_append ?? '' }} />
            </div>
        );
    }
}

export default BasicValueBoolCheckbox;
