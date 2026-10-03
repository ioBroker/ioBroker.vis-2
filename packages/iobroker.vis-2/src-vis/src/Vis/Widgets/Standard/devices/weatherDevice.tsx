import React from 'react';

import {
    Air as WindIcon,
    Thermostat as FeelsLikeIcon,
    Umbrella as RainIcon,
    WaterDrop as HumidityIcon,
    WbSunny as WeatherIcon,
} from '@mui/icons-material';

import { alpha } from '@mui/material/styles';

import { Types } from '@iobroker/type-detector';

import { Icon } from '@iobroker/gui-components';

import type { RxWidgetInfoAttributesField } from '@iobroker/types-vis-2';

import { fillFromInstance, weatherDayName } from '../Base/weatherStates';

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
    /** Where the states come from: an instance of a weather adapter, or one field at a time */
    source?: 'instance' | 'manual';
    /** Draw it like every other card of the set, without the tiles and the picture behind it */
    plain?: boolean | 'true';
    /** The instance the states are taken from, like `accuweather.0` */
    instance?: string;
    [key: string]: any;
}

/**
 * The adapters that are offered as a source.
 *
 * They are the entries of the ioBroker repository with `type: weather` that report a reading - the ones that
 * only warn about hail, pollen or high water have nothing this card could show, and a list of thirty in which
 * two thirds are useless is a list nobody reads. An adapter that is missing here is no loss: its states can be
 * chosen by hand, and the fields fill themselves from the roles all the same.
 */
const WEATHER_ADAPTERS = [
    'accuweather',
    'brightsky',
    'daswetter',
    'drops-weather',
    'dwd',
    'knmi-weather',
    'meteonomiqs',
    'meteoswiss',
    'netatmo',
    'netatmo-crawler',
    'open-meteo-weather',
    'openweathermap',
    'pirate-weather',
    'sainlogic',
    'swiss-weather-api',
    'weatherflow-tempest-api',
    'weatherflow_udp',
    'weatherunderground',
    'yr',
];

/*
 * How big the forecast is drawn.
 *
 * A card of four rows in a wide section is three times the size of one in a narrow one, and a row of days in
 * eleven pixels is unreadable on the first and right on the second. `cqw` and `cqh` are hundredths of the
 * width and the height of the card, so the days grow with it - up to a size beyond which a weather card
 * starts to look like a poster. Nothing measures itself for this: the browser does the arithmetic.
 */
const TILE_SIZE = 'clamp(40px, min(9cqw, 26cqh), 104px)';
const VALUE_SIZE = 'clamp(22px, min(5.5cqw, 18cqh), 72px)';
const LABEL_SIZE = 'clamp(12px, min(2.6cqw, 8cqh), 30px)';
const FACT_SIZE = 'clamp(12px, min(2.6cqw, 8cqh), 28px)';
const DAY_SIZE = 'clamp(12px, min(3cqw, 9cqh), 34px)';
const DAY_ICON_SIZE = 'clamp(24px, min(9cqw, 30cqh), 120px)';
const DAY_TEMP_SIZE = 'clamp(13px, min(3.4cqw, 11cqh), 40px)';

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
        days.push({ icon, min, max, name: weatherDayName(context.valueOf(`oidDayName${index}`), index) });
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
    wizard: {
        // the forecast is a state per day, which the widget asks of an instance rather than of single ids
        types: [Types.weatherCurrent],
        states: {
            oid: 'ACTUAL',
            oidIcon: 'ICON',
            oidText: 'WEATHER',
            oidFeelsLike: 'REAL_FEEL_TEMPERATURE',
            oidHumidity: 'HUMIDITY',
            oidPrecipitation: 'PRECIPITATION_CHANCE',
        },
    },
    fields: [
        {
            name: 'source',
            type: 'select',
            label: 'weather_source',
            default: 'manual',
            tooltip: 'weather_source_tooltip',
            options: [
                { value: 'manual', label: 'weather_source_manual' },
                { value: 'instance', label: 'weather_source_instance' },
            ],
        },
        {
            name: 'instance',
            type: 'instance',
            label: 'weather_instance',
            tooltip: 'weather_instance_tooltip',
            hidden: "data.source !== 'instance'",
            // the editor filters the instances by this list; it wants an array, whatever the type says
            adapters: WEATHER_ADAPTERS as unknown as string,
            onChange: async (_field, data, changeData, socket): Promise<void> => {
                const instance = (data.instance || '').toString();
                if (instance && (await fillFromInstance(instance, data, socket, true))) {
                    changeData(data);
                }
            },
        },
        {
            name: 'oid',
            type: 'id',
            label: 'oid_temperature',
            hidden: "data.source === 'instance'",
            // the first state says which instance the weather comes from, and the rest of it follows by role
            onChange: async (_field, data, changeData, socket): Promise<void> => {
                const id = (data.oid || '').toString();
                const instance = id.split('.').slice(0, 2).join('.');
                if (id && id !== 'nothing_selected' && instance) {
                    if (await fillFromInstance(instance, data, socket, false)) {
                        changeData(data);
                    }
                }
            },
        },
        { name: 'oidText', type: 'id', label: 'oid_weather_text', hidden: "data.source === 'instance'" },
        { name: 'oidIcon', type: 'id', label: 'oid_weather_icon', hidden: "data.source === 'instance'" },
        { name: 'oidFeelsLike', type: 'id', label: 'oid_feels_like', hidden: "data.source === 'instance'" },
        { name: 'oidHumidity', type: 'id', label: 'oid_humidity', hidden: "data.source === 'instance'" },
        { name: 'oidWind', type: 'id', label: 'oid_wind', hidden: "data.source === 'instance'" },
        {
            name: 'oidPrecipitation',
            type: 'id',
            label: 'oid_precipitation',
            hidden: "data.source === 'instance'",
        },
        { name: 'unit', label: 'unit' },
        { name: 'windUnit', label: 'wind_unit' },
        { name: 'days', type: 'number', label: 'forecast_days', min: 0, max: 7, default: 0 },
        { name: 'plain', type: 'checkbox', label: 'weather_plain', tooltip: 'weather_plain_tooltip' },
    ] as RxWidgetInfoAttributesField[],
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
                { name: 'oidDayName', type: 'id', label: 'oid_day_name', tooltip: 'oid_day_name_tooltip' },
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
        const accent = temperature === null ? accents.off : accents.blue;
        const quiet = theme.palette.text.secondary;

        /*
         * The card of a weather app: the picture of the sky behind it, the reading large on the right, and
         * every day of the forecast on a tile of its own. `plain` is the way back to a card like all the
         * others, for a dashboard that wants one look and not one card that shouts.
         */
        const plain = data.plain === true || data.plain === 'true';
        const rich = !plain && context.layout === 'default';

        /** A reading with its unit, or nothing where there is no reading */
        const fact = (
            attr: string,
            symbol: React.ReactNode,
            factUnit: string,
            colour: string,
            digits = 0,
        ): React.JSX.Element | null => {
            const value = asNumber(context.valueOf(attr));
            if (value === null) {
                return null;
            }
            const written = value.toFixed(digits);

            return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35em' }}>
                    <span
                        style={{
                            display: 'flex',
                            width: '1.2em',
                            height: '1.2em',
                            flexShrink: 0,
                            color: rich ? colour : undefined,
                            opacity: rich ? 1 : 0.7,
                        }}
                    >
                        {symbol}
                    </span>
                    {`${isFloatComma ? written.replace('.', ',') : written}${factUnit}`}
                </span>
            );
        };

        // an icon of the set sizes itself by its font size, which is not what a box of one em wants
        const factIcon = { width: '100%', height: '100%' };
        const facts = [
            fact('oidFeelsLike', <FeelsLikeIcon style={factIcon} />, unit, accents.yellow, 1),
            fact('oidHumidity', <HumidityIcon style={factIcon} />, ' %', accents.blue),
            fact('oidWind', <WindIcon style={factIcon} />, ` ${data.windUnit || 'km/h'}`, quiet),
            fact('oidPrecipitation', <RainIcon style={factIcon} />, ' %', accents.blue),
        ].filter(one => one);

        const written = temperature === null ? '--' : temperature.toFixed(1);
        const reading = isFloatComma ? written.replace('.', ',') : written;
        const days = forecastOf(context);

        const iconNode = icon ? (
            <Icon
                src={icon}
                style={{ width: '100%', height: '100%' }}
            />
        ) : (
            <WeatherIcon style={{ width: '100%', height: '100%' }} />
        );

        /** The readings in one row, with a hairline between them */
        const factsRow = facts.length ? (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.7em',
                    fontSize: FACT_SIZE,
                    color: quiet,
                }}
            >
                {facts.map((one, index) => (
                    <React.Fragment key={index}>
                        {index && rich ? (
                            <span style={{ width: 1, height: '1.3em', background: theme.palette.divider }} />
                        ) : null}
                        {one}
                    </React.Fragment>
                ))}
            </div>
        ) : null;

        /** The days of the forecast; on the rich card each of them stands on a tile of its own */
        const daysRow = days.length ? (
            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    alignItems: rich ? 'stretch' : 'center',
                    width: '100%',
                    gap: rich ? '0.6em' : 4,
                }}
            >
                {days.map((day, index) => (
                    <div
                        key={day.name}
                        style={{
                            flex: 1,
                            minWidth: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.3em',
                            ...(rich
                                ? {
                                      padding: '0.5em 0.2em',
                                      boxSizing: 'border-box' as const,
                                      borderRadius: 'min(2.4cqw, 20px)',
                                      // the day that is coming next is the one being planned around
                                      border: `1px solid ${index ? theme.palette.divider : accent}`,
                                      background: alpha(index ? theme.palette.text.primary : accent, 0.06),
                                  }
                                : undefined),
                        }}
                    >
                        <span
                            style={{
                                fontSize: DAY_SIZE,
                                fontWeight: rich ? 600 : 400,
                                color: rich ? undefined : quiet,
                            }}
                        >
                            {day.name}
                        </span>
                        {day.icon ? (
                            <Icon
                                src={day.icon}
                                style={{ width: DAY_ICON_SIZE, height: DAY_ICON_SIZE }}
                            />
                        ) : null}
                        <span style={{ fontSize: DAY_TEMP_SIZE, whiteSpace: 'nowrap' }}>
                            {day.max === null ? '' : `${Math.round(day.max)}${rich ? '°' : ''}`}
                            {day.min === null ? (
                                ''
                            ) : (
                                <span style={{ color: quiet }}>{` / ${Math.round(day.min)}${rich ? '°' : ''}`}</span>
                            )}
                        </span>
                    </div>
                ))}
            </div>
        ) : null;

        /** The head of the rich card: the picture in its tile, what the sky is doing, and how warm it is */
        const header = (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7em', flexShrink: 0 }}>
                <div
                    style={{
                        width: TILE_SIZE,
                        height: TILE_SIZE,
                        flexShrink: 0,
                        boxSizing: 'border-box',
                        padding: '0.5em',
                        borderRadius: 'min(2.6cqw, 22px)',
                        border: `1px solid ${theme.palette.divider}`,
                        background: alpha(theme.palette.text.primary, 0.05),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {iconNode}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: '0.25em' }}>
                    {text ? (
                        <span
                            style={{
                                fontSize: LABEL_SIZE,
                                fontWeight: 700,
                                lineHeight: 1.1,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {text}
                        </span>
                    ) : null}
                    {factsRow}
                </div>
                <span
                    style={{
                        marginLeft: 'auto',
                        fontSize: VALUE_SIZE,
                        fontWeight: 700,
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                    }}
                >
                    {`${reading}${unit}`}
                </span>
            </div>
        );

        return {
            accent,
            active: false,
            // on the rich card the picture stands in its own tile inside the card, not in the corner of it
            icon: rich ? undefined : iconNode,
            value: rich ? undefined : `${reading}${unit}`,
            valueColor: theme.palette.text.primary,
            label: rich ? undefined : text || undefined,
            stateText: text ? `${reading}${unit} · ${text}` : `${reading}${unit}`,
            marker: { text: reading, unit },
            // What is drawn follows the size of the card rather than a number of pixels: `cqw` and `cqh` are
            // the width and the height of the card itself, which the frame makes a container for exactly this.
            container: true,
            valueOnTop: true,
            // the picture of the sky, blown up and blurred into the right edge, the way a weather app does it
            background:
                rich && icon ? (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            overflow: 'hidden',
                            pointerEvents: 'none',
                            // it belongs to the corner above the reading and has to fade out before it
                            // reaches the days, which are read and not looked at
                            maskImage: 'linear-gradient(to bottom left, #000 5%, transparent 55%)',
                            WebkitMaskImage: 'linear-gradient(to bottom left, #000 5%, transparent 55%)',
                        }}
                    >
                        <Icon
                            src={icon}
                            style={{
                                position: 'absolute',
                                right: '-4%',
                                top: '-30%',
                                width: 'min(85cqh, 32cqw)',
                                opacity: context.themeType === 'dark' ? 0.22 : 0.15,
                                filter: 'blur(3px)',
                            }}
                        />
                    </div>
                ) : null,
            body:
                context.layout !== 'default' || (!facts.length && !days.length) ? null : rich ? (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.7em',
                            width: '100%',
                            height: '100%',
                            minHeight: 0,
                        }}
                    >
                        {header}
                        {daysRow}
                    </div>
                ) : (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            width: '100%',
                            height: '100%',
                            minHeight: 0,
                        }}
                    >
                        {factsRow}
                        {daysRow}
                    </div>
                ),
        };
    },
});

export default weatherDevice;
