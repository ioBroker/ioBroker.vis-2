import { describe, expect, it } from 'vitest';

import { sortRows, tableCell, tableColumns, tableListPaths, tableRows } from './tableRows';

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

describe('tableRows with a path', () => {
    const feed = JSON.stringify({ meta: { title: 'News' }, articles: [{ title: 'a' }, { title: 'b' }] });

    it('reads the list out of the field it lies in', () => {
        expect(tableRows(feed, 'articles')).toEqual([{ title: 'a' }, { title: 'b' }]);
    });

    it('follows a path of several names', () => {
        expect(tableRows({ data: { items: [1, 2] } }, 'data.items')).toEqual([{ value: 1 }, { value: 2 }]);
        expect(tableRows({ list: [{ entries: ['x'] }] }, 'list.0.entries')).toEqual([{ value: 'x' }]);
    });

    it('gives no rows where the path leads nowhere, and the whole value without a path', () => {
        expect(tableRows(feed, 'items')).toEqual([]);
        expect(tableRows(feed, 'meta.title.x')).toEqual([]);
        expect(tableRows(feed, ' ').map(row => row.id)).toEqual(['meta', 'articles']);
    });
});

describe('tableListPaths', () => {
    it('finds the lists inside a value, the longest first', () => {
        const value = { meta: { tags: ['x'] }, articles: [1, 2, 3], deep: { a: { b: { c: { d: [1] } } } } };
        expect(tableListPaths(JSON.stringify(value))).toEqual([
            { path: 'articles', count: 3 },
            { path: 'meta.tags', count: 1 },
        ]);
    });

    it('finds nothing in a value that is a list itself or no JSON', () => {
        expect(tableListPaths('[1, 2]')).toEqual([]);
        expect(tableListPaths('not json')).toEqual([]);
    });
});

describe('sortRows', () => {
    const news = [
        { title: 'b', date: 'Wed, 12 Nov 2026 10:00:00 GMT' },
        { title: 'a', date: 'Thu, 13 Nov 2026 09:00:00 GMT' },
        { title: 'c' },
        { title: 'd', date: 'Mon, 10 Nov 2026 08:00:00 GMT' },
    ];

    it('sorts moments as moments, the newest first, and rows without a value last', () => {
        expect(sortRows(news, 'date', true).map(row => row.title)).toEqual(['a', 'b', 'd', 'c']);
        expect(sortRows(news, 'date').map(row => row.title)).toEqual(['d', 'b', 'a', 'c']);
    });

    it('sorts numbers as numbers, also where they are written as text', () => {
        const rows = [{ n: '10' }, { n: 9 }, { n: '1,5' }];
        expect(sortRows(rows, 'n').map(row => row.n)).toEqual(['1,5', 9, '10']);
    });

    it('sorts words as words, and keeps equal rows in the order they came', () => {
        const rows = [
            { w: 'Banane', i: 1 },
            { w: 'apfel', i: 2 },
            { w: 'Apfel', i: 3 },
        ];
        expect(sortRows(rows, 'w').map(row => row.i)).toEqual([2, 3, 1]);
    });

    it('keeps the order of the adapter without a column', () => {
        expect(sortRows(news, undefined)).toBe(news);
    });
});
