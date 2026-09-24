import { describe, expect, it } from 'vitest';

import { getSliderControlOid, getSliderWrite } from './sliderWrite';

const SHOWN = 'hass.0.thermostat.temperature';
const CONTROL = '0_userdata.0.thermostat.setpoint';

describe('getSliderWrite', () => {
    // #580: a slider that shows the temperature of a thermostat and writes its set point could not set the
    // temperature the room had - the value was compared with the shown state and dropped as "already there"
    it('writes to the control ID even if the shown state has the value', () => {
        const data = { oid: SHOWN, click_id: CONTROL, min: 15, max: 25 };
        expect(getSliderWrite(data, { [`${SHOWN}.val`]: 18 }, 18)).toEqual({ oid: CONTROL, val: 18 });
    });

    it('does not write to the control ID if that state has the value', () => {
        const data = { oid: SHOWN, click_id: CONTROL };
        expect(getSliderWrite(data, { [`${CONTROL}.val`]: 18 }, 18)).toBeNull();
    });

    it('writes to the shown state without a control ID, unless it has the value', () => {
        const data = { oid: SHOWN };
        expect(getSliderWrite(data, { [`${SHOWN}.val`]: 17 }, 18)).toEqual({ oid: SHOWN, val: 18 });
        expect(getSliderWrite(data, { [`${SHOWN}.val`]: 18 }, 18)).toBeNull();
    });

    it('takes a control ID that is not selected as none', () => {
        const data = { oid: SHOWN, click_id: 'nothing_selected' };
        expect(getSliderWrite(data, {}, 18)).toEqual({ oid: SHOWN, val: 18 });
    });

    it('writes nothing without a state', () => {
        expect(getSliderWrite({}, {}, 18)).toBeNull();
        expect(getSliderWrite({ oid: 'nothing_selected', click_id: '' }, {}, 18)).toBeNull();
    });

    it('mirrors the value between min and max if inverted', () => {
        const data = { oid: SHOWN, click_id: CONTROL, inverted: true, min: 15, max: 25 };
        expect(getSliderWrite(data, {}, 18)).toEqual({ oid: CONTROL, val: 22 });
        // the attributes may arrive as text
        expect(getSliderWrite({ ...data, min: '15', max: '25' }, {}, 25)).toEqual({ oid: CONTROL, val: 15 });
        // an inverted value that the control ID has is not written again
        expect(getSliderWrite(data, { [`${CONTROL}.val`]: 22 }, 18)).toBeNull();
    });

    describe('second thumb of a range', () => {
        const data = {
            oid: SHOWN,
            click_id: CONTROL,
            'oid-2': 'hass.0.thermostat.max',
            'click_id-2': '0_userdata.0.thermostat.max',
            'inverted-2': true,
            min: 0,
            max: 100,
        };

        it('uses its own control ID, compared with that state only', () => {
            expect(getSliderWrite(data, { 'hass.0.thermostat.max.val': 30 }, 70, true)).toEqual({
                oid: '0_userdata.0.thermostat.max',
                val: 30,
            });
            expect(getSliderWrite(data, { '0_userdata.0.thermostat.max.val': 30 }, 70, true)).toBeNull();
        });

        it('falls back to its own shown state, not to the one of the first thumb', () => {
            expect(getSliderControlOid({ oid: SHOWN, 'oid-2': 'hass.0.thermostat.max' }, true)).toBe(
                'hass.0.thermostat.max',
            );
            expect(getSliderControlOid({ oid: SHOWN, click_id: CONTROL }, true)).toBe('');
        });
    });
});
