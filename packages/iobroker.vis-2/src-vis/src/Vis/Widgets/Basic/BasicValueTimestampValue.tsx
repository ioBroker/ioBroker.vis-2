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
 * `Basic - Timestamp Value`: a state whose VALUE is a point in time. Replaces the can.js template
 * `tplValueTimestampValue`.
 *
 * Everything but the source is in {@link BasicValueDate}.
 */
class BasicValueTimestampValue extends BasicValueDate {
    static getWidgetInfo(): RxWidgetInfo {
        return BasicValueDate.buildWidgetInfo({
            id: 'tplValueTimestampValue',
            visName: 'Timestamp Value',
            visPrev: 'widgets/basic/img/Prev_ValueTimestampValue.svg',
            visWidgetLabel: 'value_timestamp_value',
            visHelp: 'help_value_timestamp_value',
        });
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return BasicValueTimestampValue.getWidgetInfo();
    }

    // eslint-disable-next-line class-methods-use-this
    protected getSource(): 'ts' | 'val' | 'lc' {
        return 'val';
    }
}

export default BasicValueTimestampValue;
