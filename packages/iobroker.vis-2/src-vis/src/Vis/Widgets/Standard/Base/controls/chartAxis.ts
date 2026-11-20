/** Characters that take about a third of the font size: points, commas, colons, thin letters and the space */
const NARROW = new Set(['.', ',', ':', ';', '!', '|', "'", 'i', 'l', 'j', 'I', ' ', 'f', 't', 'r', '(', ')', '/']);

/** Characters that take most of it */
const WIDE = new Set(['m', 'w', 'M', 'W', '%', '@']);

/**
 * The share of the font size one character takes.
 *
 * Measured on Arial and Roboto and rounded up, so that a wider font (Verdana) still fits: a digit is 0.56 there
 * and every digit is as wide as the others, a capital is about 0.7.
 *
 * @param char - the character
 */
function charEms(char: string): number {
    if (NARROW.has(char)) {
        return 0.32;
    }
    if (char === '°') {
        return 0.42;
    }
    if (WIDE.has(char)) {
        return 0.9;
    }
    return char >= 'A' && char <= 'Z' ? 0.72 : 0.62;
}

/**
 * About how wide a line of text is, without asking the page.
 *
 * Generous on purpose: a margin that is a few pixels too wide costs the chart nothing, one that is too narrow
 * cuts the label off - which is what this is for.
 *
 * @param text - the text
 * @param fontSize - the size of the font in pixels
 * @returns the width in pixels
 */
export function estimateTextWidth(text: string, fontSize: number): number {
    let ems = 0;
    for (const char of text) {
        ems += charEms(char);
    }
    return ems * fontSize;
}

/**
 * The room beside the plot that the labels of an axis need.
 *
 * The labels stood in a fixed 52 px. `35,0 km/h` is wider than that, and the label of the top tick, which is the
 * one carrying the unit, lost its beginning: the axis said `5,0 km/h`.
 *
 * @param labels - what the axis writes out
 * @param fontSize - the size of their font in pixels
 * @param least - the room the axis takes anyway
 * @param most - the room it may take at most, so a long word of a state does not eat the plot
 * @returns the room in pixels, gap to the plot included
 */
export function axisMargin(labels: string[], fontSize: number, least: number, most: number): number {
    const widest = labels.reduce((max, label) => Math.max(max, estimateTextWidth(label, fontSize)), 0);
    // 6 px between the label and the plot, 4 px of air at the edge of the card
    return Math.round(Math.min(Math.max(least, widest + 10), Math.max(least, most)));
}
