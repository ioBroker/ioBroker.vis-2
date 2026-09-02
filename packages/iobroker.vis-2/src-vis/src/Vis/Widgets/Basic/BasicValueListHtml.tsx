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

import type { RxWidgetInfo } from '@iobroker/types-vis-2';
import BasicValueListBase from './BasicValueList';

/**
 * `Basic - ValueList HTML`: the entry the value of a state points at, written into the page as markup.
 *
 * Replaces the can.js template `tplValueListHtml`. It is `tplValueList` with the one difference that the
 * entry is not escaped, which is the whole reason the pair exists.
 *
 * Everything but that is in {@link BasicValueListBase}.
 */
class BasicValueListHtml extends BasicValueListBase {
    static getWidgetInfo(): RxWidgetInfo {
        return BasicValueListBase.buildWidgetInfo({
            id: 'tplValueListHtml',
            visName: 'ValueList HTML',
            visPrev: 'widgets/basic/img/Prev_ValueListHtml.svg',
            visWidgetLabel: 'value_list_html',
            visHelp: 'help_value_list_html',
        });
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return BasicValueListHtml.getWidgetInfo();
    }

    // eslint-disable-next-line class-methods-use-this
    protected isHtml(): boolean {
        return true;
    }
}

export default BasicValueListHtml;
