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
    count: number;
    /** in the editor: which entry to show, so the list can be checked without the state */
    test_list: string;
    [value: `value${number}`]: string;
    [style: `style${number}`]: string;
};

/** How a semicolon is written inside an entry, kept from the two simpler list widgets */
const SEMICOLON_ESCAPE = '§§';

/**
 * `Basic - ValueList HTML Style`: the entry the value of a state points at, with a CSS text of its own.
 *
 * Replaces the can.js template `tplValueListHtml8`. Where `tplValueList` keeps its entries in one text with
 * semicolons, this one has a `value0`, `value1`, ... and a `style0`, `style1`, ... beside each of them, so
 * every entry can look different. The style goes onto the body of the widget, as it did in the template.
 */
class BasicValueListHtml8 extends VisRxWidget<RxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplValueListHtml8',
            visSet: 'basic',
            visName: 'ValueList HTML Style',
            visPrev: 'widgets/basic/img/Prev_ValueListHtml8.svg',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'oid', type: 'id' },
                        { name: 'html_prepend', type: 'html' },
                        { name: 'html_append', type: 'html' },
                        { name: 'count', type: 'number', min: 0, max: 10, step: 1, default: 2 },
                        {
                            name: 'test_list',
                            type: 'select',
                            noTranslation: true,
                            options: ['', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
                        },
                    ],
                },
                {
                    name: 'values',
                    indexFrom: 0,
                    indexTo: 'count',
                    fields: [
                        { name: 'value', type: 'html' },
                        { name: 'style', type: 'text' },
                    ],
                },
            ],
            visWidgetLabel: 'value_list_html8', // Label of widget
            visHelp: 'help_value_list_html8', // Description in the palette
            visDefaultStyle: {
                width: 100,
                height: 30,
            },
        } as const;
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return BasicValueListHtml8.getWidgetInfo();
    }

    /**
     * Which entry the state points at.
     *
     * The template read `true` as 1 and `false` as 0 before taking the value as an index, so that a boolean
     * state picks the second and the first entry.
     *
     * @returns the index into the entries
     */
    private getIndex(): number {
        const test = this.state.rxData.test_list;
        if (this.props.editMode && (test || test === '0')) {
            return parseInt(test, 10);
        }
        const value = this.state.values[`${this.state.rxData.oid}.val`];

        if (value == true) {
            return 1;
        }

        if (value == false) {
            return 0;
        }
        return parseInt(value as string, 10);
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        // set default width and height
        props.style.width ??= 100;
        props.style.height ??= 30;

        const index = this.getIndex();
        const entry = this.state.rxData[`value${index}`];
        const style = this.state.rxData[`style${index}`];

        return (
            // The style is a CSS text as it was typed into the attribute, so it goes on as an attribute too.
            // React only takes an object for `style`, and parsing the text into one would change what a user
            // may write there.
            <div
                className="vis-widget-body"
                ref={el => {
                    if (el) {
                        el.setAttribute('style', style || '');
                    }
                }}
            >
                <div data-oid={this.state.rxData.oid}>
                    <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_prepend ?? '' }} />
                    <span dangerouslySetInnerHTML={{ __html: entry ? entry.replace(SEMICOLON_ESCAPE, ';') : '' }} />
                    <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_append ?? '' }} />
                </div>
            </div>
        );
    }
}

export default BasicValueListHtml8;
