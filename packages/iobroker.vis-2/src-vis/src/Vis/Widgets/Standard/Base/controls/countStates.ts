/**
 * Whether a state counts as on, for the status tile.
 *
 * A window contact says `true`, a window handle says `1` for tilted and `2` for open, a light says `on` - all of
 * them count. Zero, `false`, `off`, `closed` and nothing at all do not.
 *
 * @param raw - the value of the state
 */
export function countsAsOn(raw: unknown): boolean {
    if (raw === true) {
        return true;
    }
    if (typeof raw === 'number') {
        return raw !== 0 && !isNaN(raw);
    }
    if (typeof raw === 'string') {
        const text = raw.trim().toLowerCase();
        if (!text) {
            return false;
        }
        const number = Number(text);
        if (!isNaN(number)) {
            return number !== 0;
        }
        return !['false', 'off', 'closed', 'close', 'no', 'none', 'null', 'undefined'].includes(text);
    }
    return false;
}

/**
 * What the status tile says about how many are on.
 *
 * The text is the user's sentence - `%s windows open` - with the number put where `%s` stands; a text without
 * `%s` gets the number in front of it. With none on, the text for that is said instead, and without one the
 * number, which is still an answer.
 *
 * @param count - how many are on
 * @param countText - the sentence for some
 * @param zeroText - the sentence for none
 */
export function countSentence(count: number, countText: string | undefined, zeroText: string | undefined): string {
    if (!count && zeroText) {
        return zeroText;
    }
    if (!countText) {
        return `${count}`;
    }
    return countText.includes('%s') ? countText.replace(/%s/g, `${count}`) : `${count} ${countText}`;
}

/**
 * What stands in the circle of a person without a photo: the first letters of the name, at most two.
 *
 * @param name - the name of the widget
 */
export function initialsOf(name: string | undefined): string {
    const words = (name || '').trim().split(/\s+/).filter(Boolean);
    return words
        .slice(0, 2)
        .map(word => Array.from(word)[0].toLocaleUpperCase())
        .join('');
}
