/**
 * What a weather adapter offers, found by the roles of its states.
 *
 * Every adapter arranges its states differently - `accuweather.0.Current.Temperature`,
 * `open-meteo-weather.0.daily.1.temperature_max`, `weatherunderground.0.forecast.1.tempMax` - and a widget
 * that knew the paths of each of them would be a list of thirty adapters that is wrong for the thirty-first.
 * What they do agree on is the role: ioBroker writes `value.temperature`, `weather.icon.forecast.2` and
 * `value.temperature.max.forecast.2`, and the type detector reads exactly these. So does this.
 */

import type { Connection } from '@iobroker/gui-components';

import { asTime } from './applianceTime';
import { asText } from './controls/stateValue';

/** The states of the weather, by what they are */
export interface WeatherStates {
    /** What the thermometer says now */
    temperature?: string;
    /** What the sky is doing, in words */
    text?: string;
    /** The picture the adapter serves for it */
    icon?: string;
    /** What it feels like, which is not what the thermometer says */
    feelsLike?: string;
    humidity?: string;
    wind?: string;
    precipitation?: string;
    /** The days of the forecast, by the number the adapter gives them; 0 is usually today */
    days: WeatherDay[];
}

/** One day of the forecast */
export interface WeatherDay {
    icon?: string;
    min?: string;
    max?: string;
    /** The name of the day, where the adapter writes one */
    name?: string;
}

/** As much of an object as this needs */
export interface WeatherStateObject {
    _id: string;
    common?: { role?: string };
}

/** The roles of the weather right now */
const CURRENT: [keyof Omit<WeatherStates, 'days'>, RegExp][] = [
    ['temperature', /^value\.temperature$/],
    ['text', /^weather\.(state|title)$/],
    ['icon', /^weather\.icon$/],
    ['feelsLike', /^value\.temperature\.(feelslike|windchill)$/],
    ['humidity', /^value\.humidity$/],
    ['wind', /^value\.speed\.wind$/],
    ['precipitation', /^value\.precipitation\.chance$/],
    ['precipitation', /^value\.precipitation$/],
];

/** The roles of one day of the forecast, with the day already taken off the end */
const FORECAST: [keyof WeatherDay, RegExp][] = [
    ['icon', /^weather\.icon$/],
    ['min', /^value\.temperature\.min$/],
    ['max', /^value\.temperature\.max$/],
    ['name', /^dayofweek$/],
    ['name', /^date$/],
];

/** How far a forecast is read; a card has no room for more and no adapter promises it */
export const MAX_FORECAST_DAYS = 7;

/**
 * Which day of the forecast a state belongs to, and its role without that day.
 *
 * The day stands in the role where the adapter followed the convention - `value.temperature.max.forecast.2` -
 * and otherwise in the path, because an adapter that gives every day a channel of its own writes the plain
 * role into it: `daily.2.temperature_max` with the role `value.temperature.max`.
 *
 * @param id - the id of the state
 * @param role - what its object says it is
 */
export function dayOfState(id: string, role: string): { day: number | null; role: string } {
    const inRole = /^(.*)\.forecast\.(\d+)$/.exec(role);
    if (inRole) {
        return { day: parseInt(inRole[2], 10), role: inRole[1] };
    }

    // `...forecast.2...`, `...daily.2...`, `...Day_2...`; the first number of the path wins
    const inPath = /(?:forecast|daily|days?|tag)[._]?(\d+)(?:\W|$)/i.exec(id);
    if (inPath) {
        return { day: parseInt(inPath[1], 10), role };
    }

    return { day: null, role };
}

/**
 * The shorter of two ids, or rather the one that is nearer the top of the tree.
 *
 * An adapter writes `value.temperature` more than once - the station, the forecast of the hour, the average of
 * the day - and the one that is meant is the one that is not buried: `accuweather.0.Current.Temperature`
 * rather than `accuweather.0.Hourly.h12.Temperature`.
 *
 * @param a - the id that was found first
 * @param b - the one that was found after it
 */
function nearer(a: string, b: string): string {
    const depth = (id: string): number => id.split('.').length;

    return depth(b) < depth(a) || (depth(b) === depth(a) && b.length < a.length) ? b : a;
}

/**
 * The states of a weather adapter, out of its objects.
 *
 * @param objects - every state of the instance, as the object view gives them
 */
export function pickWeatherStates(objects: WeatherStateObject[]): WeatherStates {
    const found: WeatherStates = { days: [] };

    /*
     * How good a match was, by the place of its pattern in the list.
     *
     * The order of the patterns is an order of preference - the chance of rain is a better answer than how
     * many millimetres of it there will be - and a state that arrives first must not win over a better role
     * that arrives after it.
     */
    const rank: Record<string, number> = {};

    /**
     * Keep this state for that part of the weather, where it is the better answer.
     *
     * @param key - what is being filled in, with the day in front of it where there is one
     * @param id - the state that was found
     * @param place - where its pattern stands in the list
     * @param kept - what is there so far
     */
    const keep = (key: string, id: string, place: number, kept: string | undefined): string => {
        if (!kept) {
            rank[key] = place;
            return id;
        }
        if (place < rank[key]) {
            rank[key] = place;
            return id;
        }

        return place === rank[key] ? nearer(kept, id) : kept;
    };

    for (const object of objects) {
        const role = object.common?.role;
        if (!role) {
            continue;
        }
        const { day, role: plain } = dayOfState(object._id, role);

        if (day === null) {
            CURRENT.forEach(([what, pattern], place) => {
                if (pattern.test(plain)) {
                    found[what] = keep(what, object._id, place, found[what]);
                }
            });
            continue;
        }

        if (day > MAX_FORECAST_DAYS) {
            continue;
        }
        FORECAST.forEach(([what, pattern], place) => {
            if (pattern.test(plain)) {
                found.days[day] ||= {};
                const entry = found.days[day];
                entry[what] = keep(`${day}.${what}`, object._id, place, entry[what]);
            }
        });
    }

    // a day nobody wrote anything about is still a place in the list, so the numbers keep their meaning
    for (let index = 0; index < found.days.length; index++) {
        found.days[index] ||= {};
    }

    return found;
}

/** The fields the search fills in, by what it found */
const FILLED: [string, keyof WeatherStates | 'days'][] = [
    ['oid', 'temperature'],
    ['oidText', 'text'],
    ['oidIcon', 'icon'],
    ['oidFeelsLike', 'feelsLike'],
    ['oidHumidity', 'humidity'],
    ['oidWind', 'wind'],
    ['oidPrecipitation', 'precipitation'],
];

/**
 * Fill the fields of the widget from the states of an instance.
 *
 * Both ways of setting this widget up end here: choosing an instance asks for everything it has, and choosing
 * the temperature by hand asks the instance that state belongs to. What is found is matched by role, see
 * `pickWeatherStates` above.
 *
 * @param instance - the instance to read, like `accuweather.0`
 * @param data - the settings of the widget, which are changed in place
 * @param socket - the connection to the ioBroker server
 * @param overwrite - replace what is there; without it only the empty fields are filled
 */
export async function fillFromInstance(
    instance: string,
    data: Record<string, any>,
    socket: Connection,
    overwrite: boolean,
): Promise<boolean> {
    let objects: Record<string, ioBroker.AnyObject>;
    try {
        objects = await socket.getObjectViewSystem('state', `${instance}.`, `${instance}.\u9999`);
    } catch {
        return false;
    }

    const found = pickWeatherStates(
        Object.keys(objects).map(id => ({ _id: id, common: objects[id]?.common as { role?: string } })),
    );
    let changed = false;

    /** Write one field, where it may be written */
    const put = (field: string, id: string | undefined): void => {
        const empty = !data[field] || data[field] === 'nothing_selected';
        if (id && (overwrite || empty) && data[field] !== id) {
            data[field] = id;
            changed = true;
        }
    };

    FILLED.forEach(([field, what]) => put(field, found[what] as string | undefined));

    // the days of the forecast: the list is as long as the adapter has days, and a day that brought nothing
    // is left out of the count
    const days = Math.min(found.days.length - 1, MAX_FORECAST_DAYS);
    for (let day = 1; day <= days; day++) {
        put(`oidDayIcon${day}`, found.days[day]?.icon);
        put(`oidDayMin${day}`, found.days[day]?.min);
        put(`oidDayMax${day}`, found.days[day]?.max);
        put(`oidDayName${day}`, found.days[day]?.name);
    }
    if (days > 0 && (overwrite || !data.days) && `${data.days || 0}` !== `${days}`) {
        data.days = days;
        changed = true;
    }

    return changed;
}

/**
 * What a day of the forecast is called.
 *
 * The browser knows what tomorrow is called in the language of the user, so nothing has to be asked for -
 * but an adapter whose first day is today rather than tomorrow would be a day out, and those exist. Where
 * a state says which day it is, that state wins, and a date is turned into the name of its weekday.
 *
 * @param value - what the state of the day says, where there is one
 * @param index - which day of the forecast it is, counted from tomorrow
 */
export function weatherDayName(value: unknown, index: number): string {
    const text = asText(value);
    if (text) {
        // adapters write the day as a unix time, as a date or as the name of the weekday; the first two are
        // numbers and dates that nobody wants to read off a card
        const moment = asTime(value);
        if (moment !== null) {
            return new Date(moment).toLocaleDateString(undefined, { weekday: 'short' });
        }

        return text;
    }
    const date = new Date();
    date.setDate(date.getDate() + index);

    return date.toLocaleDateString(undefined, { weekday: 'short' });
}
