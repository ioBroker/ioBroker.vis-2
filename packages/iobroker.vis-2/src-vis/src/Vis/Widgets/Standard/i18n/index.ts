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

/**
 * The words of the widget sets `relative` and `absolute`.
 *
 * They go into two dictionaries: `I18n`, which names the sets in the palette and the labels of the fields, and
 * the legacy one behind `window.vis._`, which the attribute panel falls back to - see {@link registerWords}.
 */
export default function registerStandardWords(): void {
    const catalogs = { en, de, ru, pt, nl, fr, it, es, pl, uk, 'zh-cn': zhCn };
    I18n.extendTranslations({ ...catalogs, prefix: STANDARD_I18N_PREFIX });
    registerWords(catalogs);
}
