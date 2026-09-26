/**
 * The prefix every word of the widget sets `relative` and `absolute` is stored under.
 *
 * Their words are their own - `name`, `min`, `unit`, `on` - and would otherwise land in the same pot as the
 * words of the editor and mean something else there. The catalog puts this in front of every label it reads
 * off a widget, see `i18nPrefix` in `visWidgetsCatalog.tsx`.
 *
 * It stands in a module of its own so that the widgets can name it without pulling the eleven catalogs of
 * `../i18n` into the runtime bundle, which never shows an attribute name.
 */
export const STANDARD_I18N_PREFIX = 'vis_2_widgets_standard_';
