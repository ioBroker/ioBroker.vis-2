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
import BasicValueDate from './BasicValueDate';

/**
 * `Basic - Last change`: WHEN a state last changed its value, as opposed to when it was last written.
 * Replaces the can.js template `tplValueLastchange`.
 *
 * Everything but the source is in {@link BasicValueDate}.
 */
class BasicValueLastchange extends BasicValueDate {
    static getWidgetInfo(): RxWidgetInfo {
        return BasicValueDate.buildWidgetInfo({
            id: 'tplValueLastchange',
            visName: 'Last change Timestamp',
            visPrev: 'widgets/basic/img/Prev_ValueLastchange.svg',
            visWidgetLabel: 'value_lastchange',
            visHelp: 'help_value_lastchange',
        });
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return BasicValueLastchange.getWidgetInfo();
    }

    // eslint-disable-next-line class-methods-use-this
    protected getSource(): 'ts' | 'val' | 'lc' {
        return 'lc';
    }
}

export default BasicValueLastchange;
