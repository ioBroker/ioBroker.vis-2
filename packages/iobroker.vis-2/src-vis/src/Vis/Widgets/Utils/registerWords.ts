/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

/**
 * Hand the words that name the attributes of a widget set to the legacy dictionary.
 *
 * These words used to be registered by the `widgets/<set>.html` of the vis-1 world. The widgets are React
 * today and only their words were left behind in those files, so they live in an `i18n` folder next to the
 * widgets now. Every field that carries no `label` of its own is named through them: the attribute panel falls
 * back to `window.vis._(field.name)`, which reads this dictionary - a different one from what `I18n.t()` uses.
 *
 * The catalogs are one file per language, as everywhere else in this repository, while `window.addWords` wants
 * one entry per word holding every language. Turning them around is what this does.
 *
 * Only the editor shows attribute names, so this is called from there and not from the widgets: an import in
 * `Vis/Widgets` would carry every catalog into the runtime bundle, which never needs them.
 *
 * @param catalogs - the words of one widget set, keyed by language
 */
export default function registerWords(catalogs: Record<string, Record<string, string>>): void {
    const words: Record<string, Record<string, string>> = {};

    for (const [language, catalog] of Object.entries(catalogs)) {
        for (const [word, text] of Object.entries(catalog)) {
            words[word] ||= {};
            words[word][language] = text;
        }
    }

    (window as unknown as { addWords: (words: Record<string, Record<string, string>>) => void }).addWords(words);
}
