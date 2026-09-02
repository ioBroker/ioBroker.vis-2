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

export type DateRxData = {
    oid: string;
    /** show how long ago it was instead of the date itself */
    show_interval: boolean;
    format_date: string;
    html_prepend: string;
    html_append: string;
    test_html: string;
};

/**
 * Shared by the four `basic` widgets that show a time of a state: they differ in nothing but WHICH time they
 * take - the timestamp of the value, the value itself, or the moment of the last change - so the attributes,
 * the formatting and the markup live here once.
 *
 * The formatting is `VisBaseWidget.formatDate()`, which is the React side of `vis.binds.basic.formatDate` the
 * can.js templates used, down to the interval that keeps counting up on its own.
 */
export default abstract class BasicValueDate<TRxData extends DateRxData = DateRxData> extends VisRxWidget<TRxData> {
    /**
     * The parts of the widget info that are the same for all four.
     *
     * @param info - what tells the four apart
     * @param info.id - the template id the widget replaces
     * @param info.visName - the untranslated name
     * @param info.visPrev - the preview drawn for the palette
     * @param info.visWidgetLabel - the translation key of the label in the palette
     * @param info.visHelp - the translation key of the description shown in the tooltip of the palette
     */
    protected static buildWidgetInfo(info: {
        id: string;
        visName: string;
        visPrev: string;
        visWidgetLabel: string;
        visHelp: string;
    }): RxWidgetInfo {
        return {
            ...info,
            visSet: 'basic',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'oid', type: 'id' },
                        { name: 'show_interval', type: 'checkbox' },
                        {
                            name: 'format_date',
                            type: 'auto',
                            options: [
                                'YYYY.MM.DD hh:mm:ss',
                                'DD.MM.YYYY hh:mm:ss',
                                'YYYY.MM.DD',
                                'DD.MM.YYYY',
                                'YYYY/MM/DD hh:mm:ss',
                                'YYYY/MM/DD',
                                'hh:mm:ss',
                            ],
                            default: '',
                        },
                        { name: 'html_prepend', type: 'html' },
                        { name: 'html_append', type: 'html' },
                        { name: 'test_html', type: 'html' },
                    ],
                },
            ],
            visDefaultStyle: {
                width: 50,
                height: 20,
            },
        };
    }

    /**
     * Which time of the state this widget shows: `ts` is when the value was written, `val` the value itself
     * when it carries a time, and `lc` the moment it last changed.
     */
    protected abstract getSource(): 'ts' | 'val' | 'lc';

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        // set default width and height
        props.style.width ??= 50;
        props.style.height ??= 20;

        let body: string | React.JSX.Element;
        if (this.props.editMode && this.state.rxData.test_html) {
            body = this.state.rxData.test_html;
        } else {
            body = this.formatDate(
                this.state.values[`${this.state.rxData.oid}.${this.getSource()}`] as string | number,
                // an empty format means "auto", the same as in the can.js template
                this.state.rxData.format_date || 'auto',
                this.state.rxData.show_interval,
                false,
                // as an element, so that the interval can keep counting without writing into the DOM by hand
                true,
            );
        }

        return (
            <div className="vis-widget-body">
                <div data-oid={this.state.rxData.oid}>
                    <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_prepend ?? '' }} />
                    {typeof body === 'string' ? <span dangerouslySetInnerHTML={{ __html: body }} /> : body}
                    <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_append ?? '' }} />
                </div>
            </div>
        );
    }
}
