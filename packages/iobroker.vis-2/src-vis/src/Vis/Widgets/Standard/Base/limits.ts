import { asNumber } from './controls/stateValue';
import type { DeviceContext, StandardRxData } from './defineDeviceWidget';

/** What a state counts in */
export interface Limits {
    min: number;
    max: number;
    step: number | undefined;
}

/**
 * The scale of a state: what the widget was told, and otherwise what the object says.
 *
 * ioBroker has no one scale for anything: a blind counts from 0 to 100 or from 0 to 255, a dimmer likewise, a
 * volume up to 11. The object knows, so it is asked; the fields of the widget are there to overrule it where
 * it says nothing or says it wrong.
 *
 * @param context - the widget, its states and its settings
 * @param attr - the attribute that names the state whose scale is wanted
 * @param fallback - what to assume when neither the widget nor the object says anything
 * @param fallback.min - the bottom of that assumption
 * @param fallback.max - the top of it
 */
export function limitsOf<RxData extends StandardRxData>(
    context: DeviceContext<RxData>,
    attr: string,
    fallback: { min: number; max: number } = { min: 0, max: 100 },
): Limits {
    const common = context.commonOf(attr);
    const typed = (value: unknown, instead: number | undefined): number | undefined => {
        const number = asNumber(value);
        return number === null ? instead : number;
    };

    return {
        min: typed(context.data.min, typed(common?.min, fallback.min)) ?? fallback.min,
        max: typed(context.data.max, typed(common?.max, fallback.max)) ?? fallback.max,
        step: typed(context.data.step, typed(common?.step, undefined)),
    };
}

/**
 * Where a value stands between its limits, from 0 to 100.
 *
 * @param value - the value, in what the state counts in
 * @param limits - the scale of that state
 */
export function toPercent(value: number, limits: Limits): number {
    const span = limits.max - limits.min || 100;
    return Math.max(0, Math.min(100, ((value - limits.min) / span) * 100));
}

/**
 * The other way round: what to write into the state for this share of its scale.
 *
 * @param percent - from 0 to 100
 * @param limits - the scale of that state
 */
export function fromPercent(percent: number, limits: Limits): number {
    const value = limits.min + (Math.max(0, Math.min(100, percent)) / 100) * (limits.max - limits.min);
    // a state that counts in whole numbers is not written a fraction of one
    return limits.step && limits.step >= 1 ? Math.round(value / limits.step) * limits.step : Math.round(value);
}
