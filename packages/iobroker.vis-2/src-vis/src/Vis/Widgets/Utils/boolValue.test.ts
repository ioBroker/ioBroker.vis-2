import { describe, expect, it } from 'vitest';

import { isFalse } from './boolValue';

/**
 * These are the readings of `vis.binds.basic.isFalse` of the can.js widgets. Which value counts as off decides
 * what a widget shows in projects that have been running for years, so the cases are written down rather than
 * left to the next reader to derive from the code.
 */
describe('isFalse', () => {
    describe('without min and max', () => {
        it('takes the empty ones as off', () => {
            expect(isFalse(undefined)).toBe(true);
            expect(isFalse(null)).toBe(true);
            expect(isFalse('')).toBe(true);
        });

        it('takes false, however it is spelled, as off', () => {
            expect(isFalse(false)).toBe(true);
            for (const spelling of ['false', 'FALSE', 'False']) {
                expect(isFalse(spelling), spelling).toBe(true);
            }
        });

        it('takes "off", however it is spelled, as off', () => {
            for (const spelling of ['OFF', 'Off', 'off']) {
                expect(isFalse(spelling), spelling).toBe(true);
            }
        });

        it('takes zero as off and any other number as on', () => {
            expect(isFalse(0)).toBe(true);
            expect(isFalse('0')).toBe(true);
            expect(isFalse(1)).toBe(false);
            expect(isFalse('1')).toBe(false);
            expect(isFalse(-1)).toBe(false);
            expect(isFalse(0.5)).toBe(false);
        });

        it('takes true and any text that is not a number as on', () => {
            expect(isFalse(true)).toBe(false);
            expect(isFalse('true')).toBe(false);
            expect(isFalse('on')).toBe(false);
            expect(isFalse('anything')).toBe(false);
        });
    });

    describe('with min only', () => {
        it('is off exactly when the value is the min', () => {
            expect(isFalse('CLOSED', 'CLOSED')).toBe(true);
            expect(isFalse('OPEN', 'CLOSED')).toBe(false);
        });

        it('reads the words false and true as the booleans on both sides', () => {
            expect(isFalse(false, 'false')).toBe(true);
            expect(isFalse('false', 'false')).toBe(true);
            expect(isFalse(true, 'false')).toBe(false);
        });

        it('compares loosely, so 0 and "0" mean the same', () => {
            expect(isFalse(0, '0')).toBe(true);
            expect(isFalse('0', '0')).toBe(true);
            expect(isFalse(1, '0')).toBe(false);
        });
    });

    describe('with min and max', () => {
        it('is on exactly when the value is the max, and off otherwise', () => {
            expect(isFalse('HIGH', 'LOW', 'HIGH')).toBe(false);
            expect(isFalse('LOW', 'LOW', 'HIGH')).toBe(true);
            // anything that is neither counts as off, because only the max means on
            expect(isFalse('MIDDLE', 'LOW', 'HIGH')).toBe(true);
        });

        it('reads the words false and true as the booleans', () => {
            expect(isFalse(true, 'false', 'true')).toBe(false);
            expect(isFalse(false, 'false', 'true')).toBe(true);
        });
    });

    it('ignores an empty min, so the plain reading applies', () => {
        expect(isFalse('off', '')).toBe(true);
        expect(isFalse('anything', '')).toBe(false);
    });
});
