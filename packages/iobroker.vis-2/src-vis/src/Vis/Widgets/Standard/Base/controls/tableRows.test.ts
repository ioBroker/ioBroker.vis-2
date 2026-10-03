import { describe, expect, it } from 'vitest';

import { tableCell, tableColumns, tableRows } from './tableRows';

describe('tableRows', () => {
    it('reads the usual case: a list of objects, as text or already parsed', () => {
        const rows = [{ name: 'a', value: 1 }];
        expect(tableRows(rows)).toEqual(rows);
        expect(tableRows(JSON.stringify(rows))).toEqual(rows);
    });

    it('reads a list of lists, where the position is the column', () => {
        expect(tableRows([['a', 1]])).toEqual([{ 0: 'a', 1: 1 }]);
    });

    it('reads a list of plain values', () => {
        expect(tableRows(['a', 'b'])).toEqual([{ value: 'a' }, { value: 'b' }]);
    });

    it('reads an object of objects, with the key as a column of its own', () => {
        expect(tableRows({ x: { value: 1 }, y: { value: 2 } })).toEqual([
            { id: 'x', value: 1 },
            { id: 'y', value: 2 },
        ]);
    });

    it('gives no rows rather than an error for what is not a table', () => {
        // a state that is empty while the adapter starts up is normal
        for (const nothing of ['', '   ', 'not json', null, undefined, 42, true]) {
            expect(tableRows(nothing)).toEqual([]);
        }
    });
});

describe('tableColumns', () => {
    it('keeps the order the columns first turn up in', () => {
        expect(tableColumns([{ b: 1, a: 2 }])).toEqual(['b', 'a']);
    });

    it('asks every row, because a row may leave a column out', () => {
        expect(tableColumns([{ a: 1 }, { a: 2, b: 3 }])).toEqual(['a', 'b']);
    });
});

describe('tableCell', () => {
    it('writes a number the way the system writes numbers', () => {
        expect(tableCell(21.5, true)).toBe('21,5');
        expect(tableCell(21.5, false)).toBe('21.5');
        expect(tableCell(3, true)).toBe('3');
        // six places after the point are a wall of digits in a table
        expect(tableCell(1 / 3, false)).toBe('0.333');
    });

    it('writes what is empty as nothing at all', () => {
        expect(tableCell(null, false)).toBe('');
        expect(tableCell(undefined, false)).toBe('');
    });

    it('writes a boolean as a mark', () => {
        expect(tableCell(true, false)).toBe('✓');
        expect(tableCell(false, false)).toBe('–');
    });

    it('does not let an object become [object Object]', () => {
        expect(tableCell({ a: 1 }, false)).toBe('{"a":1}');
    });
});
