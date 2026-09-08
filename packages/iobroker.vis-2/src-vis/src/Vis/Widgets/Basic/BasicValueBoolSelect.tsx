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

import { MenuItem, Select } from '@mui/material';

import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';
import VisRxWidget from '../../visRxWidget';

type RxData = {
    oid: string;
    html_prepend: string;
    html_append: string;
    text_true: string;
    text_false: string;
    autoFocus: boolean;
    mui?: boolean;
};

/**
 * `Basic - Bool Select`: a drop-down with two entries that writes a state.
 *
 * Replaces the can.js template `tplValueBoolSelect` with `vis.binds.basic.select`. The two entries carry `0`
 * and `1`, and that is what is written - as in the template, where the value of the selected option went
 * straight to `vis.setValue`.
 */
class BasicValueBoolSelect extends VisRxWidget<RxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplValueBoolSelect',
            visSet: 'basic',
            visName: 'Bool Select',
            visPrev: 'widgets/basic/img/Prev_ValueBoolSelect.svg',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'oid', type: 'id' },
                        { name: 'html_prepend', type: 'html' },
                        { name: 'html_append', type: 'html' },
                        { name: 'text_true', type: 'text' },
                        { name: 'text_false', type: 'text' },
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
            visWidgetLabel: 'value_bool_select', // Label of widget
            visHelp: 'help_value_bool_select', // Description in the palette
            visDefaultStyle: {
                width: 90,
                height: 30,
            },
        } as const;
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return BasicValueBoolSelect.getWidgetInfo();
    }

    /**
     * Which of the two entries is showing.
     *
     * The reading of `vis.binds.basic.select`: a text that is a number counts as that number, and any other
     * text that is not empty counts as on.
     *
     * @returns true if the second entry is the one to show
     */
    private isOn(): boolean {
        let val: unknown = this.state.values[`${this.state.rxData.oid}.val`];
        if (val === 'false') {
            val = false;
        } else if (val === 'true') {
            val = true;
        } else if (typeof val === 'string') {
            const parsed = parseFloat(val);
            val = parsed.toString() === val ? parsed : val !== '';
        }
        return !!val;
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        const oid = this.state.rxData.oid;
        const autoFocus = this.state.rxData.autoFocus === true || (this.state.rxData.autoFocus as unknown) === 'true';

        // a binding may hand the flag over as a string
        const mui = this.state.rxData.mui === true || (this.state.rxData.mui as unknown as string) === 'true';
        const value = this.isOn() ? '1' : '0';
        const write = (newValue: string): void => {
            if (!this.props.editMode && oid && oid !== 'nothing_selected') {
                this.props.context.setValue(oid, newValue);
            }
        };

        return (
            <div className="vis-widget-body">
                <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_prepend ?? '' }} />
                {mui ? (
                    <Select
                        id={`${this.props.id}_select`}
                        data-oid={oid}
                        autoFocus={autoFocus}
                        variant="standard"
                        size="small"
                        fullWidth
                        value={value}
                        onChange={e => write(e.target.value)}
                    >
                        <MenuItem value="0">{this.state.rxData.text_false}</MenuItem>
                        <MenuItem value="1">{this.state.rxData.text_true}</MenuItem>
                    </Select>
                ) : (
                    <select
                        id={`${this.props.id}_select`}
                        data-oid={oid}
                        autoFocus={autoFocus}
                        value={value}
                        onChange={this.props.editMode ? undefined : e => write(e.target.value)}
                    >
                        <option value="0">{this.state.rxData.text_false}</option>
                        <option value="1">{this.state.rxData.text_true}</option>
                    </select>
                )}
                <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_append ?? '' }} />
            </div>
        );
    }
}

export default BasicValueBoolSelect;
