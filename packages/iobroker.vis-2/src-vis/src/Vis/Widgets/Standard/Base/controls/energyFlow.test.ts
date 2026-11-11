import { describe, expect, it } from 'vitest';

import { flowDuration, formatPower, splitFlows, toWatts } from './energyFlow';

describe('toWatts', () => {
    it('takes the unit of the object', () => {
        expect(toWatts(2.4, 'kW')).toBe(2400);
        expect(toWatts('2,4', 'kW')).toBe(2400);
        expect(toWatts(850, undefined)).toBe(850);
        expect(toWatts(850, 'W')).toBe(850);
    });

    it('has no reading for what is no number', () => {
        expect(toWatts('abc', 'W')).toBeNull();
        expect(toWatts(true, 'W')).toBeNull();
        expect(toWatts(null, 'W')).toBeNull();
        expect(toWatts('', 'W')).toBeNull();
    });
});

describe('splitFlows', () => {
    it('uses the sun in the house first, then for the battery, and sells the rest', () => {
        const flows = splitFlows({ solar: 3000, grid: -1000, battery: -500, home: null });
        expect(flows.solarToGrid).toBe(1000);
        expect(flows.solarToBattery).toBe(500);
        expect(flows.solarToHome).toBe(1500);
        expect(flows.gridToHome).toBe(0);
        expect(flows.home).toBe(1500);
    });

    it('runs the house from the battery and the grid at night', () => {
        const flows = splitFlows({ solar: 0, grid: 400, battery: 600, home: null });
        expect(flows.batteryToHome).toBe(600);
        expect(flows.gridToHome).toBe(400);
        expect(flows.home).toBe(1000);
    });

    it('charges the battery from the grid where the sun does not', () => {
        const flows = splitFlows({ solar: 0, grid: 2000, battery: -1500, home: null });
        expect(flows.gridToBattery).toBe(1500);
        expect(flows.gridToHome).toBe(500);
        expect(flows.home).toBe(500);
    });

    it('sells out of the battery what the sun does not cover', () => {
        const flows = splitFlows({ solar: 0, grid: -800, battery: 1000, home: null });
        expect(flows.batteryToGrid).toBe(800);
        expect(flows.batteryToHome).toBe(200);
        expect(flows.home).toBe(200);
    });

    it('believes a state that says what the house uses', () => {
        expect(splitFlows({ solar: 1000, grid: 0, battery: null, home: 1234 }).home).toBe(1234);
    });

    it('does not draw the noise of a meter as a flow', () => {
        const flows = splitFlows({ solar: null, grid: 3, battery: null, home: null });
        expect(flows.gridToHome).toBe(0);
        expect(flows.home).toBe(0);
    });

    it('takes an inverter that says less than nothing at night as nothing', () => {
        expect(splitFlows({ solar: -12, grid: 300, battery: null, home: null }).solarToHome).toBe(0);
    });
});

describe('formatPower', () => {
    it('writes watts below a kilowatt and kilowatts above', () => {
        expect(formatPower(850, false)).toBe('850 W');
        expect(formatPower(2450, false)).toBe('2.45 kW');
        expect(formatPower(12345, false)).toBe('12.3 kW');
        expect(formatPower(-500, false)).toBe('-500 W');
    });

    it('writes a comma where the system does', () => {
        expect(formatPower(2450, true)).toBe('2,45 kW');
    });
});

describe('flowDuration', () => {
    it('has no dots where nothing flows', () => {
        expect(flowDuration(0, 1000)).toBe(0);
        expect(flowDuration(100, 0)).toBe(0);
    });

    it('runs the largest flow fastest', () => {
        expect(flowDuration(1000, 1000)).toBe(1.5);
        expect(flowDuration(500, 1000)).toBe(3);
        expect(flowDuration(10, 1000)).toBeGreaterThan(flowDuration(500, 1000));
    });
});
