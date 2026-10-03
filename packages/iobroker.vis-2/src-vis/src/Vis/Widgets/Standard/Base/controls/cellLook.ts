/** How a cell is compared with the value of a rule */
export type CellOperator = '>' | '>=' | '<' | '<=' | '=' | '!=' | '*';

/** One rule: a condition and what the cell looks like when it holds */
export interface CellRule {
    op: CellOperator;
    /** What the cell is compared with; nothing for `*`, which is everything that is left */
    value?: string;
    color?: string;
    background?: string;
}

/** What a rule makes of a cell */
export interface CellLook {
    color?: string;
    background?: string;
}

/**
 * The rules of a column, out of what the widget carries.
 *
 * They are stored as JSON because the dialog that edits them writes them that way, and a setting that cannot
 * be read back gives no rules rather than an error - a widget that was saved by an older version, or whose
 * field somebody cleared by hand, keeps working and simply has no colours.
 *
 * @param stored - what stands in the field of the widget
 */
export function cellRules(stored: unknown): CellRule[] {
    if (!stored || typeof stored !== 'string') {
        return Array.isArray(stored) ? (stored as CellRule[]) : [];
    }
    try {
        const parsed: unknown = JSON.parse(stored);
        return Array.isArray(parsed) ? (parsed as CellRule[]) : [];
    } catch {
        return [];
    }
}

/** A number the comparison can work with, or null */
function asNumber(value: unknown): number | null {
    if (typeof value === 'number') {
        return isFinite(value) ? value : null;
    }
    if (typeof value === 'string' && value.trim()) {
        const parsed = parseFloat(value.replace(',', '.'));
        return isFinite(parsed) ? parsed : null;
    }
    return null;
}

/** The value of a cell as text, for comparing it with what a rule says */
function asText(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'object') {
        return '';
    }
    return `${value as string | number | boolean}`;
}

/**
 * Whether a rule holds for this value.
 *
 * Two numbers are compared as numbers, anything else as text and without looking at upper and lower case -
 * `=OK` is meant to match `ok`, and asking the user to get that right is asking for a bug report. `>` and
 * its three siblings only hold between numbers: `> abc` is not a question with an answer.
 *
 * @param value - what the cell holds
 * @param rule - the rule to try
 */
export function cellRuleHolds(value: unknown, rule: CellRule): boolean {
    if (rule.op === '*') {
        return true;
    }

    const left = asNumber(value);
    const right = asNumber(rule.value);
    const numeric = left !== null && right !== null;

    switch (rule.op) {
        case '>':
            return numeric && left > right;
        case '>=':
            return numeric && left >= right;
        case '<':
            return numeric && left < right;
        case '<=':
            return numeric && left <= right;
        case '=':
            return numeric
                ? left === right
                : asText(value).toLowerCase() === `${rule.value ?? ''}`.trim().toLowerCase();
        case '!=':
            return numeric
                ? left !== right
                : asText(value).toLowerCase() !== `${rule.value ?? ''}`.trim().toLowerCase();
        default:
            return false;
    }
}

/**
 * What a cell looks like: the first rule that holds decides.
 *
 * First and not last, because that is how such a list is read aloud - "over 25 red, over 20 yellow, the rest
 * green" - and a list where the last one wins quietly turns that order around.
 *
 * @param value - what the cell holds
 * @param rules - the rules of its column
 */
export function cellLook(value: unknown, rules: CellRule[]): CellLook {
    for (const rule of rules) {
        if (cellRuleHolds(value, rule)) {
            return { color: rule.color || undefined, background: rule.background || undefined };
        }
    }
    return {};
}
