/** One row of a table, as the widget works with it */
export type TableRow = Record<string, unknown>;

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
 * @param value - what the state holds
 */
export function tableRows(value: unknown): TableRow[] {
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
