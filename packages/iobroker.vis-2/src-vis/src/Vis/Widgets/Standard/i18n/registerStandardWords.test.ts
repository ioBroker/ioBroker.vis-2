import { beforeEach, describe, expect, it } from 'vitest';

import registerStandardWords from './index';
import de from './de.json';
import en from './en.json';

/**
 * Only the language of the page is loaded, with English next to it. Two languages in one object are exactly what
 * `I18n.extendTranslations` does not recognize as "all languages" (it wants en, de and ru), so the words have to
 * arrive one language at a time - this is what the palette showed as raw keys when they did not.
 */
describe('registerStandardWords', () => {
    const dictionary = (): Record<string, Record<string, string>> =>
        (window as unknown as { i18nTranslations: Record<string, Record<string, string>> }).i18nTranslations;

    beforeEach(() => {
        const translations = dictionary();
        Object.keys(translations).forEach(lang => delete translations[lang]);
    });

    it('registers the language of the page and English, with the prefix of the set', async () => {
        await registerStandardWords('de');

        expect(dictionary().de.vis_2_widgets_standard_appliance_done).toBe(
            (de as Record<string, string>).appliance_done,
        );
        expect(dictionary().en.vis_2_widgets_standard_appliance_done).toBe(
            (en as Record<string, string>).appliance_done,
        );
        // nothing of the other languages
        expect(dictionary().ru).toBeUndefined();
    });

    it('registers English alone for English and for a language without a catalog', async () => {
        await registerStandardWords('xx');

        expect(Object.keys(dictionary())).toEqual(['en']);
        expect(dictionary().en.vis_2_widgets_standard_appliance_done).toBe(
            (en as Record<string, string>).appliance_done,
        );
    });
});
