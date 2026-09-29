import { describe, expect, it } from 'vitest';

import { dayOfState, pickWeatherStates, type WeatherStateObject } from './weatherStates';

/** As many states as it takes to look like the adapter in question */
const state = (id: string, role: string): WeatherStateObject => ({ _id: id, common: { role } });

describe('dayOfState', () => {
    it('reads the day out of the role, which is where the convention puts it', () => {
        expect(dayOfState('a.0.x', 'value.temperature.max.forecast.3')).toEqual({
            day: 3,
            role: 'value.temperature.max',
        });
    });

    it('reads it out of the path where the adapter gives every day a channel', () => {
        expect(dayOfState('open-meteo-weather.0.daily.2.temp_max', 'value.temperature.max')).toEqual({
            day: 2,
            role: 'value.temperature.max',
        });
        expect(dayOfState('daswetter.0.NextDays.Location_1.Day_4.icon', 'weather.icon')).toEqual({
            day: 4,
            role: 'weather.icon',
        });
    });

    it('says nothing for the weather of this minute', () => {
        expect(dayOfState('accuweather.0.Current.Temperature', 'value.temperature')).toEqual({
            day: null,
            role: 'value.temperature',
        });
    });
});

describe('pickWeatherStates', () => {
    it('finds what an adapter of the accuweather kind offers', () => {
        const found = pickWeatherStates([
            state('accuweather.0.Current.Temperature', 'value.temperature'),
            state('accuweather.0.Current.WeatherText', 'weather.state'),
            state('accuweather.0.Current.WeatherIconURL', 'weather.icon'),
            state('accuweather.0.Current.RealFeelTemperature', 'value.temperature.feelslike'),
            state('accuweather.0.Current.RelativeHumidity', 'value.humidity'),
            state('accuweather.0.Current.WindSpeed', 'value.speed.wind'),
            state('accuweather.0.Current.PrecipitationProbability', 'value.precipitation.chance'),
            state('accuweather.0.Daily.Day1.TempMin', 'value.temperature.min.forecast.1'),
            state('accuweather.0.Daily.Day1.TempMax', 'value.temperature.max.forecast.1'),
            state('accuweather.0.Daily.Day1.Icon', 'weather.icon.forecast.1'),
            state('accuweather.0.Daily.Day1.DayOfWeek', 'dayofweek.forecast.1'),
        ]);

        expect(found.temperature).toBe('accuweather.0.Current.Temperature');
        expect(found.text).toBe('accuweather.0.Current.WeatherText');
        expect(found.icon).toBe('accuweather.0.Current.WeatherIconURL');
        expect(found.feelsLike).toBe('accuweather.0.Current.RealFeelTemperature');
        expect(found.humidity).toBe('accuweather.0.Current.RelativeHumidity');
        expect(found.wind).toBe('accuweather.0.Current.WindSpeed');
        expect(found.precipitation).toBe('accuweather.0.Current.PrecipitationProbability');
        expect(found.days[1]).toEqual({
            min: 'accuweather.0.Daily.Day1.TempMin',
            max: 'accuweather.0.Daily.Day1.TempMax',
            icon: 'accuweather.0.Daily.Day1.Icon',
            name: 'accuweather.0.Daily.Day1.DayOfWeek',
        });
    });

    it('finds the same where every day is a channel and the role carries no number', () => {
        const found = pickWeatherStates([
            state('open-meteo-weather.0.current.temperature', 'value.temperature'),
            state('open-meteo-weather.0.daily.1.temperature_min', 'value.temperature.min'),
            state('open-meteo-weather.0.daily.1.temperature_max', 'value.temperature.max'),
            state('open-meteo-weather.0.daily.1.weather_icon', 'weather.icon'),
        ]);

        expect(found.temperature).toBe('open-meteo-weather.0.current.temperature');
        expect(found.days[1]?.max).toBe('open-meteo-weather.0.daily.1.temperature_max');
    });

    it('takes the reading that is not buried when the same role occurs twice', () => {
        const found = pickWeatherStates([
            state('a.0.Hourly.h12.Temperature', 'value.temperature'),
            state('a.0.Current.Temperature', 'value.temperature'),
        ]);

        expect(found.temperature).toBe('a.0.Current.Temperature');
    });

    it('prefers the chance of rain over how much of it there will be', () => {
        const found = pickWeatherStates([
            state('a.0.Current.Precipitation', 'value.precipitation'),
            state('a.0.Current.PrecipitationProbability', 'value.precipitation.chance'),
        ]);

        expect(found.precipitation).toBe('a.0.Current.PrecipitationProbability');
    });

    it('leaves a state nobody can place alone', () => {
        const found = pickWeatherStates([
            state('a.0.info.connection', 'indicator.connected'),
            state('a.0.Current.Ozone', 'value'),
        ]);

        expect(found.temperature).toBeUndefined();
        expect(found.days).toHaveLength(0);
    });

    it('does not read a forecast further out than a card can show', () => {
        const found = pickWeatherStates([state('a.0.Daily.Day30.Icon', 'weather.icon.forecast.30')]);

        expect(found.days).toHaveLength(0);
    });
});
