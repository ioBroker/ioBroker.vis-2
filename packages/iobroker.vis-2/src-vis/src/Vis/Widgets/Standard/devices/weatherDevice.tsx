import React from 'react';

import {
    Air as WindIcon,
    Umbrella as RainIcon,
    WaterDrop as HumidityIcon,
    WbSunny as WeatherIcon,
} from '@mui/icons-material';

import { Types } from '@iobroker/type-detector';

import { Icon } from '@iobroker/gui-components';

import { asNumber, asText } from '../Base/controls/stateValue';
import { defineDeviceWidget, type DeviceContext, type StandardRxData } from '../Base/defineDeviceWidget';

interface WeatherRxData extends StandardRxData {
    /** What the sky is doing, in words */
    oidText?: string;
    /** The picture the weather adapter serves for it */
    oidIcon?: string;
    /** What it feels like, which is not what the thermometer says */
    oidFeelsLike?: string;
    oidHumidity?: string;
    oidWind?: string;
    oidPrecipitation?: string;
    unit?: string;
    windUnit?: string;
    /** How many days of the forecast are shown */
    days?: number | string;
    [key: string]: any;
}

/** One day of the forecast, out of the numbered fields */
interface ForecastDay {
    icon: string;
    min: number | null;
    max: number | null;
    name: string;
}

/**
 * The days of the forecast that were given states.
 *
 * The weekday is not asked for: the first day of a forecast is tomorrow, and the browser knows what
 * tomorrow is called in the language of the user. A state for it would be one more field per day and
 * one more thing to get wrong.
 *
 * @param context - the widget, its states and its settings
 */
function forecastOf(context: DeviceContext<WeatherRxData>): ForecastDay[] {
    const count = Math.max(0, Math.min(asNumber(context.data.days) ?? 0, 7));
    const days: ForecastDay[] = [];

    for (let index = 1; index <= count; index++) {
        const icon = asText(context.valueOf(`oidDayIcon${index}`));
        const min = asNumber(context.valueOf(`oidDayMin${index}`));
        const max = asNumber(context.valueOf(`oidDayMax${index}`));
        if (!icon && min === null && max === null) {
            continue;
        }
        const date = new Date();
        date.setDate(date.getDate() + index);
        days.push({ icon, min, max, name: date.toLocaleDateString(undefined, { weekday: 'short' }) });
    }

    return days;
}

/**
 * The weather: what it is doing now, and what it will do.
 *
 * Every weather adapter serves the same handful of readings under a different name, so each one is a
 * field and the card shows what it was given: a card with only a temperature is a thermometer, one
 * with everything is a weather station. The icons are the ones the adapter serves, because a widget
 * that draws its own would disagree with the forecast that comes with them.
 */
const weatherDevice = defineDeviceWidget<WeatherRxData>({
    name: 'Weather',
    label: 'widget_weather',
    help: 'help_weather',
    picture: {
        glyph:
            '<circle cx="12" cy="12" r="4.5" stroke-width="2"/>' +
            '<path d="M12 2.5v2.5M12 19v2.5M2.5 12h2.5M19 12h2.5M5.2 5.2l1.8 1.8M17 17l1.8 1.8M18.8 5.2L17 7' +
            'M7 17l-1.8 1.8" stroke-width="2" stroke-linecap="round"/>',
        value: '18 °C',
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<circle cx="13" cy="13" r="6" fill="currentColor" opacity="0.8"/>' +
        '<path d="M12 26h12a5 5 0 0 0 0-10 7 7 0 0 0-13-2 5 5 0 0 0 1 12z" fill="currentColor" ' +
        'opacity="0.45"/></svg>',
    deviceTypes: [Types.weatherCurrent, Types.weatherForecast],
    fields: [
        { name: 'oid', type: 'id', label: 'oid_temperature' },
        { name: 'oidText', type: 'id', label: 'oid_weather_text' },
        { name: 'oidIcon', type: 'id', label: 'oid_weather_icon' },
        { name: 'oidFeelsLike', type: 'id', label: 'oid_feels_like' },
        { name: 'oidHumidity', type: 'id', label: 'oid_humidity' },
        { name: 'oidWind', type: 'id', label: 'oid_wind' },
        { name: 'oidPrecipitation', type: 'id', label: 'oid_precipitation' },
        { name: 'unit', label: 'unit' },
        { name: 'windUnit', label: 'wind_unit' },
        { name: 'days', type: 'number', label: 'forecast_days', min: 0, max: 7, default: 0 },
    ],
    groups: [
        {
            name: 'forecast',
            label: 'group_forecast',
            indexFrom: 1,
            indexTo: 'days',
            fields: [
                { name: 'oidDayIcon', type: 'id', label: 'oid_day_icon' },
                { name: 'oidDayMin', type: 'id', label: 'oid_day_min' },
                { name: 'oidDayMax', type: 'id', label: 'oid_day_max' },
            ],
        },
    ],
    tile: { columns: 'full', rows: 4, minColumns: 4, minRows: 2 },
    markerShape: 'value',
    // a forecast of five days does not fit on a coin
    popup: true,
    render: context => {
        const { data, accents, theme, isFloatComma } = context;

        const temperature = asNumber(context.valueOf('oid'));
        const unit = data.unit || context.commonOf('oid')?.unit || '°C';
        const text = asText(context.valueOf('oidText'));
        const icon = asText(context.valueOf('oidIcon'));

        /** A reading with its unit, or nothing where there is no reading */
        const fact = (
            attr: string,
            symbol: React.ReactNode,
            factUnit: string,
            digits = 0,
        ): React.JSX.Element | null => {
            const value = asNumber(context.valueOf(attr));
            if (value === null) {
                return null;
            }
            const written = value.toFixed(digits);
            return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ display: 'flex', width: 14, height: 14, opacity: 0.7 }}>{symbol}</span>
                    {`${isFloatComma ? written.replace('.', ',') : written}${factUnit}`}
                </span>
            );
        };

        const facts = [
            fact('oidFeelsLike', <WeatherIcon />, unit, 1),
            fact('oidHumidity', <HumidityIcon />, ' %'),
            fact('oidWind', <WindIcon />, ` ${data.windUnit || 'km/h'}`),
            fact('oidPrecipitation', <RainIcon />, ' %'),
        ].filter(one => one);

        const written = temperature === null ? '--' : temperature.toFixed(1);
        const reading = isFloatComma ? written.replace('.', ',') : written;
        const days = forecastOf(context);

        return {
            accent: temperature === null ? accents.off : accents.blue,
            active: false,
            icon: icon ? (
                <Icon
                    src={icon}
                    style={{ width: '100%', height: '100%' }}
                />
            ) : (
                <WeatherIcon style={{ width: '100%', height: '100%' }} />
            ),
            value: `${reading}${unit}`,
            valueColor: theme.palette.text.primary,
            label: text || undefined,
            stateText: text ? `${reading}${unit} · ${text}` : `${reading}${unit}`,
            marker: { text: reading, unit },
            // what is measured besides the temperature, in one quiet row
            body:
                context.layout === 'default' && facts.length ? (
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: 12,
                            fontSize: context.tokens.smallSize,
                            color: theme.palette.text.secondary,
                        }}
                    >
                        {facts.map((one, index) => (
                            <React.Fragment key={index}>{one}</React.Fragment>
                        ))}
                    </div>
                ) : null,
            footer:
                context.layout === 'default' && days.length ? (
                    <div style={{ display: 'flex', width: '100%', gap: 4 }}>
                        {days.map(day => (
                            <div
                                key={day.name}
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 2,
                                }}
                            >
                                <span style={{ fontSize: 11, color: theme.palette.text.secondary }}>{day.name}</span>
                                {day.icon ? (
                                    <Icon
                                        src={day.icon}
                                        style={{ width: 22, height: 22 }}
                                    />
                                ) : null}
                                <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                    {day.max === null ? '' : Math.round(day.max)}
                                    {day.min === null ? (
                                        ''
                                    ) : (
                                        <span style={{ color: theme.palette.text.secondary }}>
                                            {` / ${Math.round(day.min)}`}
                                        </span>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : null,
        };
    },
});

export default weatherDevice;
