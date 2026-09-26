import React from 'react';

import { Opacity as TankIcon } from '@mui/icons-material';

import { Types } from '@iobroker/type-detector';

import TankGauge from '../Base/controls/TankGauge';
import { asNumber } from '../Base/controls/stateValue';
import { defineDeviceWidget, type StandardRxData } from '../Base/defineDeviceWidget';
import { limitsOf, toPercent } from '../Base/limits';

interface TankRxData extends StandardRxData {
    unit?: string;
    min?: number | string;
    max?: number | string;
    /** Places after the point */
    digits?: number | string;
    /** Below this the tank is drawn as a warning */
    low?: number | string;
    /** Where the number stands: `right`, `top`, `bottom`, `inside` or `none` */
    valuePosition?: 'right' | 'top' | 'bottom' | 'inside' | 'none';
}

/**
 * The fill level: a cistern, an oil tank, a pellet store, a battery.
 *
 * It is a number between two ends like any other, but nobody reads it as a number - it is read as a height,
 * the way one looks at a tank. The scale beside the bar is what makes that reading exact, and `low` is what
 * turns it into a warning before the tank is empty rather than after.
 *
 * What the ends are comes from the object where it says so; `min` and `max` are there to overrule it.
 */
const tankDevice = defineDeviceWidget<TankRxData>({
    name: 'Tank',
    label: 'widget_tank',
    help: 'help_tank',
    picture: {
        glyph:
            '<path d="M12 3.5s6 6.5 6 10.5a6 6 0 0 1-12 0c0-4 6-10.5 6-10.5z" stroke-width="2" ' +
            'stroke-linejoin="round"/>',
        value: '72 %',
        tank: true,
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<rect x="11" y="4" width="10" height="24" rx="5" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M12 17h8v6a4 4 0 0 1-8 0z" fill="currentColor"/></svg>',
    deviceTypes: [Types.fillLevel],
    fields: [
        { name: 'oid', type: 'id', label: 'oid' },
        { name: 'unit', label: 'unit' },
        { name: 'min', type: 'number', label: 'tank_empty' },
        { name: 'max', type: 'number', label: 'tank_full' },
        { name: 'low', type: 'number', label: 'tank_low', tooltip: 'tank_low_tooltip' },
        { name: 'digits', type: 'number', label: 'digits', min: 0, max: 3 },
        {
            name: 'valuePosition',
            type: 'select',
            label: 'tank_value_position',
            default: 'right',
            tooltip: 'tank_value_position_tooltip',
            options: [
                { value: 'right', label: 'tank_value_right' },
                { value: 'top', label: 'tank_value_top' },
                { value: 'bottom', label: 'tank_value_bottom' },
                { value: 'inside', label: 'tank_value_inside' },
                { value: 'none', label: 'tank_value_none' },
            ],
        },
    ],
    tile: { columns: 4, rows: 4, minColumns: 2, minRows: 3 },
    markerShape: 'value',
    render: context => {
        const { data, accents, theme } = context;
        const limits = limitsOf(context, 'oid');
        const value = asNumber(context.valueOf('oid'));
        const known = value !== null;
        const unit = data.unit || context.commonOf('oid')?.unit || '';
        const digits = asNumber(data.digits);

        const low = asNumber(data.low);
        const running = known && low !== null && value <= low;
        const accent = !known ? accents.off : running ? accents.red : accents.blue;

        const percent = known ? Math.round(toPercent(value, limits)) : null;
        const written = known ? value.toFixed(digits ?? (limits.max - limits.min > 20 ? 0 : 1)) : '--';
        const shown = context.isFloatComma ? written.replace('.', ',') : written;

        return {
            accent,
            // a tank that is running out is worth a card in its colour; a full one is not
            active: running,
            icon: <TankIcon style={{ width: '100%', height: '100%' }} />,
            // the gauge writes the number itself; the other two layouts have no room for it
            body:
                context.layout === 'default' ? (
                    <TankGauge
                        value={value}
                        min={limits.min}
                        max={limits.max}
                        unit={unit}
                        digits={digits ?? undefined}
                        accent={accent}
                        track={theme.palette.divider}
                        ink={theme.palette.text.primary}
                        quiet={theme.palette.text.secondary}
                        isFloatComma={context.isFloatComma}
                        valuePosition={data.valuePosition}
                    />
                ) : null,
            value: context.layout === 'default' ? undefined : `${shown}${unit ? ` ${unit}` : ''}`,
            valueColor: accent,
            stateText: `${shown}${unit ? ` ${unit}` : ''}`,
            // a marker has no room for a scale, so it shows how full the tank is in percent
            marker: { text: percent === null ? '--' : `${percent}`, unit: '%' },
            chart: { attrs: ['oid'] },
        };
    },
});

export default tankDevice;
