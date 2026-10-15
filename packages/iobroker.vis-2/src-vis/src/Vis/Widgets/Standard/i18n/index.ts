/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

import { I18n } from '@iobroker/gui-components';

// `registerWords` hands its words to `window.addWords`, and this is the module that puts it there. The editor
// pulls it in early enough through `visEngine`; these sets are loaded from the widget catalog, which is
// evaluated before that line, so they say for themselves what they need.
import '../../../visWords';
import registerWords from '../../Utils/registerWords';
import { STANDARD_I18N_PREFIX } from '../Base/prefix';

type Catalog = Record<string, string>;

// One chunk per language: all eleven together are 440 KB, and a page only ever shows one of them
const CATALOGS: Record<string, () => Promise<{ default: Catalog }>> = {
    en: () => import('./en.json'),
    de: () => import('./de.json'),
    ru: () => import('./ru.json'),
    pt: () => import('./pt.json'),
    nl: () => import('./nl.json'),
    fr: () => import('./fr.json'),
    it: () => import('./it.json'),
    es: () => import('./es.json'),
    pl: () => import('./pl.json'),
    uk: () => import('./uk.json'),
    'zh-cn': () => import('./zh-cn.json'),
};

/**
 * The words of the widget sets `relative` and `absolute`.
 *
 * They go into two dictionaries: `I18n`, which names the sets in the palette and the labels of the fields, and
 * the legacy one behind `window.vis._`, which the attribute panel falls back to - see {@link registerWords}.
 *
 * Only the language of the page is loaded, and English next to it, because `I18n.t()` falls back to English for
 * a word that is missing. A language that is switched while the page is open shows these words in English until
 * the page is reloaded.
 *
 * @param language - the language of the system, as `I18n` uses it
 */
export default async function registerStandardWords(language: string): Promise<void> {
    const languages = language !== 'en' && CATALOGS[language] ? [language, 'en'] : ['en'];
    const loaded = await Promise.all(languages.map(lang => CATALOGS[lang]()));

    const catalogs: Record<string, Catalog> = {};
    languages.forEach((lang, i) => {
        catalogs[lang] = loaded[i].default;

        // One language at a time: `extendTranslations` takes an object as "all languages" only if it holds en, de
        // and ru - with two of them it reads the language codes as words, and nothing is registered
        const words: Catalog = {};
        Object.entries(catalogs[lang]).forEach(([word, text]) => {
            words[word.startsWith(STANDARD_I18N_PREFIX) ? word : `${STANDARD_I18N_PREFIX}${word}`] = text;
        });
        I18n.extendTranslations(words, lang as ioBroker.Languages);
    });

    registerWords(catalogs);
}
