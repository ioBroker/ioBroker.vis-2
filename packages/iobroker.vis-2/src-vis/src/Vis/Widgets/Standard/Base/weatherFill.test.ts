import { describe, expect, it } from 'vitest';

import type { Connection } from '@iobroker/gui-components';

import { fillFromInstance, weatherDayName } from './weatherStates';

/** An instance of a weather adapter, as the object view would hand it over */
const OBJECTS: Record<string, any> = {
    'accuweather.0.Current.Temperature': { common: { role: 'value.temperature' } },
    'accuweather.0.Current.WeatherText': { common: { role: 'weather.state' } },
    'accuweather.0.Current.WeatherIcon': { common: { role: 'weather.icon' } },
    'accuweather.0.Current.Humidity': { common: { role: 'value.humidity' } },
    'accuweather.0.Current.WindSpeed': { common: { role: 'value.speed.wind' } },
    'accuweather.0.Daily.Day1.Icon': { common: { role: 'weather.icon.forecast.1' } },
    'accuweather.0.Daily.Day1.Min': { common: { role: 'value.temperature.min.forecast.1' } },
    'accuweather.0.Daily.Day1.Max': { common: { role: 'value.temperature.max.forecast.1' } },
    'accuweather.0.Daily.Day2.Icon': { common: { role: 'weather.icon.forecast.2' } },
    'accuweather.0.Daily.Day2.Min': { common: { role: 'value.temperature.min.forecast.2' } },
    'accuweather.0.Daily.Day2.Max': { common: { role: 'value.temperature.max.forecast.2' } },
    'accuweather.0.info.connection': { common: { role: 'indicator.connected' } },
};

/** As much of a connection as the search uses */
const socket = {
    getObjectViewSystem: (_type: string, start: string): Promise<Record<string, any>> => {
        const inside: Record<string, any> = {};
        Object.keys(OBJECTS).forEach(id => {
            if (id.startsWith(start)) {
                inside[id] = { _id: id, ...OBJECTS[id] };
            }
        });

        return Promise.resolve(inside);
    },
} as unknown as Connection;

/** One that has nothing to say */
const broken = {
    getObjectViewSystem: (): Promise<Record<string, any>> => Promise.reject(new Error('no connection')),
} as unknown as Connection;

describe('fillFromInstance', () => {
    it('fills every field of an instance and counts the days', async () => {
        const data: Record<string, any> = {};
        expect(await fillFromInstance('accuweather.0', data, socket, true)).toBe(true);

        expect(data.oid).toBe('accuweather.0.Current.Temperature');
        expect(data.oidText).toBe('accuweather.0.Current.WeatherText');
        expect(data.oidIcon).toBe('accuweather.0.Current.WeatherIcon');
        expect(data.oidHumidity).toBe('accuweather.0.Current.Humidity');
        expect(data.oidWind).toBe('accuweather.0.Current.WindSpeed');
        expect(data.oidDayMax2).toBe('accuweather.0.Daily.Day2.Max');
        expect(data.days).toBe(2);
    });

    it('leaves what the user chose alone unless it is told to overwrite', async () => {
        const data: Record<string, any> = { oidText: 'my.own.0.text' };
        await fillFromInstance('accuweather.0', data, socket, false);
        expect(data.oidText).toBe('my.own.0.text');
        expect(data.oid).toBe('accuweather.0.Current.Temperature');

        await fillFromInstance('accuweather.0', data, socket, true);
        expect(data.oidText).toBe('accuweather.0.Current.WeatherText');
    });

    it('treats the empty choice of the editor as empty', async () => {
        const data: Record<string, any> = { oidIcon: 'nothing_selected' };
        await fillFromInstance('accuweather.0', data, socket, false);

        expect(data.oidIcon).toBe('accuweather.0.Current.WeatherIcon');
    });

    it('says that nothing changed when it is asked a second time', async () => {
        const data: Record<string, any> = {};
        expect(await fillFromInstance('accuweather.0', data, socket, true)).toBe(true);
        expect(await fillFromInstance('accuweather.0', data, socket, true)).toBe(false);
    });

    it('changes nothing when the server cannot be asked', async () => {
        const data: Record<string, any> = {};
        expect(await fillFromInstance('accuweather.0', data, broken, true)).toBe(false);
        expect(data).toEqual({});
    });
});

describe('weatherDayName', () => {
    /** A Tuesday */
    const tuesday = new Date('2026-03-10T12:00:00').getTime();

    it('reads a unix time in milliseconds, which is what an adapter writes into a date state', () => {
        expect(weatherDayName(tuesday, 1)).toBe(new Date(tuesday).toLocaleDateString(undefined, { weekday: 'short' }));
    });

    it('reads one in seconds as well', () => {
        expect(weatherDayName(Math.round(tuesday / 1000), 1)).toBe(
            new Date(tuesday).toLocaleDateString(undefined, { weekday: 'short' }),
        );
    });

    it('leaves a name that is already a name', () => {
        expect(weatherDayName('Mo', 1)).toBe('Mo');
        expect(weatherDayName('Monday', 3)).toBe('Monday');
    });

    it('names the day itself where the adapter says nothing', () => {
        const expected = new Date();
        expected.setDate(expected.getDate() + 2);
        expect(weatherDayName('', 2)).toBe(expected.toLocaleDateString(undefined, { weekday: 'short' }));
    });
});
