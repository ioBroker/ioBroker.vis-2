/**
 * The arithmetic of the energy flow: where the power of a house comes from and where it goes.
 *
 * An inverter, a meter and a battery each say one number - what the panels make, what goes over the meter,
 * what goes in or out of the battery - and the arrows between them are not measured anywhere. They follow from
 * those numbers the way every inverter app works them out: the sun is used first, in the house, then for the
 * battery, and what is left goes to the grid.
 */

/** Below this many watts a line is not drawn as a flow: a meter is never quite at zero */
export const FLOW_THRESHOLD = 5;

/** What the three sources say, in watts, with the signs of the field descriptions */
export interface EnergyReadings {
    /** What the panels make; a negative reading - the inverter at night - is nothing */
    solar: number | null;
    /** What goes over the meter: positive is bought from the grid, negative is fed into it */
    grid: number | null;
    /** What goes over the battery: positive is taken out of it, negative is put into it */
    battery: number | null;
    /** What the house uses, where a state says it; otherwise it is worked out */
    home: number | null;
}

/** The six arrows between the four circles, in watts, never negative */
export interface EnergyFlows {
    solarToHome: number;
    solarToGrid: number;
    solarToBattery: number;
    gridToHome: number;
    gridToBattery: number;
    batteryToHome: number;
    batteryToGrid: number;
    /** What the house uses: the state that says it, or the sum of what flows into it */
    home: number;
}

/**
 * A reading in watts, out of the value of a state and the unit its object gives it.
 *
 * Inverters disagree about units: one says `2.4` in kW, the next `2400` in W. The object says which, and a
 * state without a unit is taken as watts, which is what most of them send.
 *
 * @param value - the value of the state
 * @param unit - the unit out of its object
 */
export function toWatts(value: unknown, unit: string | undefined): number | null {
    if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
        return null;
    }
    const number = typeof value === 'number' ? value : parseFloat(`${value as string}`.replace(',', '.'));
    if (!isFinite(number)) {
        return null;
    }
    switch ((unit || '').trim().toLowerCase()) {
        case 'kw':
            return number * 1000;
        case 'mw':
            return number * 1_000_000;
        default:
            return number;
    }
}

/**
 * The arrows, out of what the sources say.
 *
 * The sun goes to the grid only with what the grid takes, and to the battery only with what the battery takes;
 * the rest of it is used in the house. What the battery takes beyond the sun comes from the grid, and what the
 * grid takes beyond the sun comes out of the battery - which some batteries do on purpose, at a price.
 *
 * @param readings - what the states say, in watts
 */
export function splitFlows(readings: EnergyReadings): EnergyFlows {
    const positive = (value: number | null): number => (value !== null && value > FLOW_THRESHOLD ? value : 0);

    const solar = positive(readings.solar);
    const gridImport = positive(readings.grid);
    const gridExport = positive(readings.grid === null ? null : -readings.grid);
    const batteryOut = positive(readings.battery);
    const batteryIn = positive(readings.battery === null ? null : -readings.battery);

    const solarToGrid = Math.min(gridExport, solar);
    const solarToBattery = Math.min(batteryIn, solar - solarToGrid);
    const solarToHome = Math.max(0, solar - solarToGrid - solarToBattery);
    const gridToBattery = Math.min(gridImport, Math.max(0, batteryIn - solarToBattery));
    const gridToHome = Math.max(0, gridImport - gridToBattery);
    const batteryToGrid = Math.min(batteryOut, Math.max(0, gridExport - solarToGrid));
    const batteryToHome = Math.max(0, batteryOut - batteryToGrid);

    const sum = solarToHome + gridToHome + batteryToHome;
    const home = readings.home !== null && readings.home >= 0 ? readings.home : sum;

    return { solarToHome, solarToGrid, solarToBattery, gridToHome, gridToBattery, batteryToHome, batteryToGrid, home };
}

/**
 * A power as a card writes it: `850 W`, `2.45 kW`, `12.3 kW`.
 *
 * @param watts - the power
 * @param isFloatComma - the system writes a number with a comma
 */
export function formatPower(watts: number, isFloatComma: boolean): string {
    const absolute = Math.abs(watts);
    let text: string;
    if (absolute < 1000) {
        text = `${Math.round(watts)} W`;
    } else if (absolute < 1_000_000) {
        text = `${(watts / 1000).toFixed(absolute < 10_000 ? 2 : 1)} kW`;
    } else {
        text = `${(watts / 1_000_000).toFixed(2)} MW`;
    }
    return isFloatComma ? text.replace('.', ',') : text;
}

/**
 * How long a dot takes from one end of a line to the other: the more power, the faster.
 *
 * Measured against the largest flow on the card rather than against a fixed number, so a balcony plant and a
 * roof full of panels both show which line carries the most.
 *
 * @param watts - the power on this line
 * @param largest - the largest power on the card
 */
export function flowDuration(watts: number, largest: number): number {
    if (watts <= 0 || largest <= 0) {
        return 0;
    }
    const share = Math.min(1, watts / largest);
    return Math.round((4.5 - 3 * share) * 10) / 10;
}
