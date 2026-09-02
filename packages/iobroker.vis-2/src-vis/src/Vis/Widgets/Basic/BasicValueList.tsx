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

export type ValueListRxData = {
    oid: string;
    html_prepend: string;
    html_append: string;
    valuelist: string;
    /** in the editor: which entry to show, so the list can be checked without the state */
    test_list: string;
};

/** How a semicolon is written inside an entry, as the semicolon itself separates the entries */
const SEMICOLON_ESCAPE = '§§';

/**
 * Shared by `ValueList Text` and `ValueList HTML`: the two differ in nothing but whether the entry is written
 * into the page as text or as markup.
 *
 * The entry is picked by the value of the state, used as the index into a list that is written as one text with
 * semicolons between the entries.
 */
export default abstract class BasicValueListBase<
    TRxData extends ValueListRxData = ValueListRxData,
> extends VisRxWidget<TRxData> {
    /**
     * The parts of the widget info that both share.
     *
     * @param info - what tells the two apart
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
                        { name: 'html_prepend', type: 'html' },
                        { name: 'html_append', type: 'html' },
                        { name: 'valuelist', type: 'text' },
                        {
                            name: 'test_list',
                            type: 'select',
                            noTranslation: true,
                            options: ['', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: 60,
                height: 20,
            },
        };
    }

    /**
     * The entry to show.
     *
     * @returns the text of the entry, or an empty text when the value points past the end of the list
     */
    protected getEntry(): string {
        const list = this.state.rxData.valuelist ? this.state.rxData.valuelist.split(';') : [];
        const test = this.state.rxData.test_list;
        // in the editor a chosen test entry wins, and "0" is a choice like any other
        const index =
            this.props.editMode && (test || test === '0')
                ? parseInt(test, 10)
                : parseInt(this.state.values[`${this.state.rxData.oid}.val`] as string, 10);

        const entry = list[index];
        return entry ? entry.replace(SEMICOLON_ESCAPE, ';') : '';
    }

    /** Whether the entry is written into the page as markup instead of as text */
    protected abstract isHtml(): boolean;

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        // set default width and height
        props.style.width ??= 60;
        props.style.height ??= 20;

        const entry = this.getEntry();

        return (
            <div className="vis-widget-body">
                <div data-oid={this.state.rxData.oid}>
                    <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_prepend ?? '' }} />
                    {this.isHtml() ? <span dangerouslySetInnerHTML={{ __html: entry }} /> : <span>{entry}</span>}
                    <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_append ?? '' }} />
                </div>
            </div>
        );
    }
}
