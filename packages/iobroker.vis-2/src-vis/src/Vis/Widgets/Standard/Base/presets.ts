import type { Mode } from './controls/ModeButtons';

/**
 * The values a widget offers as buttons, out of what the user typed.
 *
 * Four temperatures on four buttons are a better thermostat than a dial for most people: nobody wants
 * 21.5 degrees, they want "night", "morning", "comfortable" - and those are numbers that everybody in
 * the house knows by heart. They are written as `12;18;22;24`, and a comma does as well as a
 * semicolon, because that is what one types first.
 *
 * @param text - what stands in the field
 */
export function parsePresets(text: string | undefined): number[] {
    if (!text) {
        return [];
    }
    return text
        .split(/[;,]/)
        .map(part => parseFloat(part.trim().replace(',', '.')))
        .filter(value => isFinite(value));
}

/**
 * Those values as buttons.
 *
 * @param presets - the values
 * @param unit - what they are measured in, which is written on the button
 * @param isFloatComma - the system writes a number with a comma, not a point
 */
export function presetModes(presets: number[], unit: string, isFloatComma: boolean): Mode[] {
    return presets.map(value => {
        // a whole number is written without a nought behind the point: `22°`, not `22.0°`
        const text = Number.isInteger(value) ? `${value}` : value.toFixed(1);
        return { value, label: `${isFloatComma ? text.replace('.', ',') : text}${unit}` };
    });
}
