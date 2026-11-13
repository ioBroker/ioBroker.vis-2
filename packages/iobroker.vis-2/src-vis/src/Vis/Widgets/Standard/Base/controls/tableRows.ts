/** One row of a table, as the widget works with it */
export type TableRow = Record<string, unknown>;

/**
 * What lies at a path in a value: `articles`, `data.items`, `list.0.entries`.
 *
 * @param data - the parsed value
 * @param path - names separated by points; nothing or an empty one is the value itself
 */
function atPath(data: unknown, path: string | undefined): unknown {
    const names = (path || '')
        .split('.')
        .map(name => name.trim())
        .filter(name => name);
    let at = data;
    for (const name of names) {
        if (!at || typeof at !== 'object') {
            return undefined;
        }
        at = (at as Record<string, unknown>)[name];
    }
    return at;
}

/**
 * The paths to the lists inside a value, for the field that picks one: `articles`, `data.items`.
 *
 * Looked for no deeper than three levels - a list buried deeper than that is not what anyone builds a table
 * from - and not inside the lists themselves.
 *
 * @param value - what the state holds
 * @returns the paths with how many entries the list has, the longest list first
 */
export function tableListPaths(value: unknown): { path: string; count: number }[] {
    let data = value;
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch {
            return [];
        }
    }
    const found: { path: string; count: number }[] = [];
    const walk = (at: unknown, prefix: string, depth: number): void => {
        if (!at || typeof at !== 'object' || Array.isArray(at) || depth > 3) {
            return;
        }
        for (const [name, one] of Object.entries(at)) {
            const path = prefix ? `${prefix}.${name}` : name;
            if (Array.isArray(one)) {
                found.push({ path, count: one.length });
            } else {
                walk(one, path, depth + 1);
            }
        }
    };
    walk(data, '', 1);
    return found.sort((a, b) => b.count - a.count);
}

/**
 * The rows a state holds, whatever shape the adapter chose for them.
 *
 * A state that carries a table carries it as JSON, and there is no agreement on what that JSON looks like.
 * Four shapes turn up in practice and all four are read here, because the alternative is a widget that works
 * with one adapter:
 *
 * - a list of objects, `[{ name: 'a', value: 1 }]` - the usual case
 * - a list of lists, `[['a', 1]]` - then the columns are called `0`, `1`, ...
 * - a list of plain values, `['a', 'b']` - one column called `value`
 * - an object of objects, `{ x: { value: 1 } }` - the key becomes the column `id`
 *
 * Anything that is not JSON at all gives no rows rather than an error: a state that is empty while the
 * adapter starts up is normal, and a card that shouts about it is not.
 *
 * Many adapters do not hand over the list itself but an object with the list in one of its fields - the RSS
 * adapter writes `{ meta: …, articles: [ … ] }`. `path` names that field, `articles` or `data.items`; read as an
 * object of objects, that would be two rows called `meta` and `articles`.
 *
 * @param value - what the state holds
 * @param path - where in it the list is, as names separated by points; nothing is the whole value
 */
export function tableRows(value: unknown, path?: string): TableRow[] {
    let data = value;

    if (typeof data === 'string') {
        const text = data.trim();
        if (!text) {
            return [];
        }
        try {
            data = JSON.parse(text);
        } catch {
            return [];
        }
    }

    data = atPath(data, path);

    if (!data || typeof data !== 'object') {
        return [];
    }

    const list = Array.isArray(data)
        ? data
        : Object.entries(data).map(([id, one]) =>
              one && typeof one === 'object' && !Array.isArray(one) ? { id, ...one } : { id, value: one },
          );

    return list.map(one => {
        if (Array.isArray(one)) {
            const row: TableRow = {};
            one.forEach((cell, index) => (row[`${index}`] = cell));
            return row;
        }
        if (one && typeof one === 'object') {
            return one as TableRow;
        }
        return { value: one };
    });
}

/**
 * The columns of these rows, in the order they first turn up.
 *
 * Asked of every row and not only of the first: adapters leave out what they have nothing for, and a column
 * that exists in the second row only would otherwise never be shown.
 *
 * @param rows - the rows to look at
 */
export function tableColumns(rows: TableRow[]): string[] {
    const found: string[] = [];
    for (const row of rows) {
        for (const key of Object.keys(row)) {
            if (!found.includes(key)) {
                found.push(key);
            }
        }
    }
    return found;
}

/**
 * A cell as it is written out.
 *
 * @param value - what the row holds under that column
 * @param isFloatComma - the system writes a number with a comma
 */
export function tableCell(value: unknown, isFloatComma: boolean): string {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'number') {
        // a measured value with six places is a wall of digits; three is already generous for a table
        const written = Number.isInteger(value) ? `${value}` : `${Math.round(value * 1000) / 1000}`;
        return isFloatComma ? written.replace('.', ',') : written;
    }
    if (typeof value === 'boolean') {
        return value ? '✓' : '–';
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    // a symbol or a function in a cell is nothing anybody put there on purpose, and `${}` of one throws
    return typeof value === 'string' || typeof value === 'bigint' ? `${value}` : '';
}

/**
 * What a cell is sorted by: a number as a number, a moment as a moment, and words as words.
 *
 * Adapters write a moment in every way there is - `1731488400000`, `2026-11-13T10:00:00Z`, the
 * `Thu, 13 Nov 2026 10:00:00 GMT` of a feed - and a table of news sorted by the letters of that is sorted by the
 * day of the week.
 *
 * @param value - what the row holds under that column
 */
function sortValue(value: unknown): { number: number } | { text: string } | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? { number: value } : null;
    }
    if (typeof value === 'boolean') {
        return { number: value ? 1 : 0 };
    }
    const text = typeof value === 'string' ? value.trim() : JSON.stringify(value);
    const number = Number(text.replace(',', '.'));
    if (text && Number.isFinite(number)) {
        return { number };
    }
    // a moment is written with digits and something between them; a word that parses by accident is not
    if (/\d/.test(text) && /[-:/.]/.test(text)) {
        const moment = Date.parse(text);
        if (!Number.isNaN(moment)) {
            return { number: moment };
        }
    }
    return { text };
}

/**
 * The rows in the order of one of their columns.
 *
 * Rows without a value in that column go to the end either way: a news item without a date is neither the newest
 * nor the oldest. Rows that are equal keep the order the adapter gave them.
 *
 * @param rows - the rows
 * @param key - the column; without one the order of the adapter stays
 * @param descending - the largest, the latest or the last word first
 */
export function sortRows(rows: TableRow[], key: string | undefined, descending?: boolean): TableRow[] {
    if (!key) {
        return rows;
    }
    const keyed = rows.map((row, index) => ({ row, index, value: sortValue(row[key]) }));
    keyed.sort((a, b) => {
        if (!a.value || !b.value) {
            return a.value ? -1 : b.value ? 1 : a.index - b.index;
        }
        let order: number;
        if ('number' in a.value && 'number' in b.value) {
            order = a.value.number - b.value.number;
        } else {
            // a number among words is written as one for the comparison
            const left = 'number' in a.value ? `${a.value.number}` : a.value.text;
            const right = 'number' in b.value ? `${b.value.number}` : b.value.text;
            order = left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
        }
        return (descending ? -order : order) || a.index - b.index;
    });
    return keyed.map(one => one.row);
}
