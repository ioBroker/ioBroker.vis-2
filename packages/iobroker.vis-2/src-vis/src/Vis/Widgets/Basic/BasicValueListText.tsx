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
 * `Basic - ValueList Text`: the entry the value of a state points at, shown as text.
 *
 * Replaces the can.js template `tplValueList`, which escaped the entry.
 *
 * Everything but that is in {@link BasicValueListBase}.
 */
class BasicValueListText extends BasicValueListBase {
    static getWidgetInfo(): RxWidgetInfo {
        return BasicValueListBase.buildWidgetInfo({
            id: 'tplValueList',
            visName: 'ValueList Text',
            visPrev: 'widgets/basic/img/Prev_ValueList.svg',
            visWidgetLabel: 'value_list',
            visHelp: 'help_value_list',
        });
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return BasicValueListText.getWidgetInfo();
    }

    // eslint-disable-next-line class-methods-use-this
    protected isHtml(): boolean {
        return false;
    }
}

export default BasicValueListText;
