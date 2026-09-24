/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

import type { VisRxWidgetStateValues } from '@iobroker/types-vis-2';

/** The attributes of the jQui slider that decide which state a thumb writes and which value */
export interface SliderWriteData {
    oid?: string;
    click_id?: string;
    inverted?: boolean;
    'oid-2'?: string;
    'click_id-2'?: string;
    'inverted-2'?: boolean;
    min?: number | string | null;
    max?: number | string | null;
}

function isSelected(id: string | undefined): id is string {
    return !!id && id !== 'nothing_selected';
}

/**
 * The state a thumb of the slider writes: its control ID if one is set, otherwise the state it shows.
 *
 * @param data - attributes of the slider
 * @param isMax - the second thumb of a range
 * @returns the ID, or an empty string if the thumb has no state
 */
export function getSliderControlOid(data: SliderWriteData, isMax?: boolean): string {
    const control = isMax ? data['click_id-2'] : data.click_id;
    if (isSelected(control)) {
        return control;
    }
    const shown = isMax ? data['oid-2'] : data.oid;
    return isSelected(shown) ? shown : '';
}

/**
 * What a thumb of the slider writes for its position `value`.
 *
 * A value the state has already is not written again - but only the state that is WRITTEN can tell that. The
 * control ID is not subscribed, so its value is not known and every position is written to it. Comparing with
 * the shown state instead dropped the one position the shown state had at that moment: a slider that shows the
 * temperature of a room and writes the set point of its thermostat could not set the temperature the room had,
 * and the set point stayed at the neighbour the thumb had passed last (#580).
 *
 * @param data - attributes of the slider
 * @param values - the known values of the states, as `<id>.val`
 * @param value - the position of the thumb
 * @param isMax - the second thumb of a range
 * @returns the state and the value to write, or null if there is nothing to write
 */
export function getSliderWrite(
    data: SliderWriteData,
    values: VisRxWidgetStateValues,
    value: number,
    isMax?: boolean,
): { oid: string; val: number } | null {
    const oid = getSliderControlOid(data, isMax);
    if (!oid) {
        return null;
    }
    let val = value;
    if (isMax ? data['inverted-2'] : data.inverted) {
        val = parseFloat(data.max as string) - val + parseFloat(data.min as string);
    }
    return values[`${oid}.val`] === val ? null : { oid, val };
}
