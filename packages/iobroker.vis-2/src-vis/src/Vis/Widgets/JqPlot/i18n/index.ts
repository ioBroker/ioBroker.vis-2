/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

import registerWords from '../../Utils/registerWords';

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

/** The words that name the attributes of the `jqplot` gauge, see {@link registerWords} */
export default function registerJqPlotWords(): void {
    registerWords({ en, de, ru, pt, nl, fr, it, es, pl, uk, 'zh-cn': zhCn });
}
