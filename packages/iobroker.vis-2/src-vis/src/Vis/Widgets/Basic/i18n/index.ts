/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

import en from './en.json';
import de from './de.json';
import ru from './ru.json';
import pt from './pt.json';
import nl from './nl.json';
import fr from './fr.json';
import it from './it.json';
import es from './es.json';
import pl from './pl.json';
import uk from './uk.json';
import zhCn from './zh-cn.json';

const CATALOGS: Record<string, Record<string, string>> = {
    en,
    de,
    ru,
    pt,
    nl,
    fr,
    it,
    es,
    pl,
    uk,
    'zh-cn': zhCn,
};

/**
 * The words that name the attributes of the `basic` widgets.
 *
 * They used to be registered by `widgets/basic.html`, which is a file of the vis-1 world; the widgets
 * themselves are React today and only their words were left behind in it. Every field of a `basic` widget
 * that carries no `label` of its own is named through them: the attribute panel falls back to
 * `window.vis._(field.name)`, and that reads what is registered here.
 *
 * `window.addWords` wants them the other way round - one entry per word, holding every language - so the
 * catalogs, which are one file per language like everywhere else in this repository, are turned around here.
 *
 * Only the editor shows attribute names, so this module is imported from the editor and not from the widgets.
 * Pulling it into `Vis/Widgets` would carry eleven catalogs into the runtime bundle, which never needs them.
 */
export default function registerBasicWords(): void {
    const words: Record<string, Record<string, string>> = {};

    for (const [language, catalog] of Object.entries(CATALOGS)) {
        for (const [word, text] of Object.entries(catalog)) {
            words[word] ||= {};
            words[word][language] = text;
        }
    }

    (window as unknown as { addWords: (words: Record<string, Record<string, string>>) => void }).addWords(words);
}
