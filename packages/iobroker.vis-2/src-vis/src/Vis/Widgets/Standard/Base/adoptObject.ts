import type { Connection } from '@iobroker/gui-components';

import type { WidgetData } from '@iobroker/types-vis-2';

import { NOTHING_SELECTED } from '@/Utilities/utils';

/** The text of a name that may be given in several languages */
function getText(text: ioBroker.StringOrTranslated | undefined, language: ioBroker.Languages): string {
    if (!text) {
        return '';
    }
    return typeof text === 'object' ? text[language] || text.en || '' : text;
}

/**
 * The icon of an object as an `img` can show it, or nothing.
 *
 * An icon that is not a data URL is a file of the adapter the object belongs to, so the name of that adapter
 * has to be put in front of it.
 *
 * @param obj - the object whose icon is wanted
 * @param id - the id the object was read under
 */
function iconOf(obj: ioBroker.Object | null | undefined, id: string): string | undefined {
    const icon = obj?.common?.icon;
    if (!icon) {
        return undefined;
    }
    if (icon.startsWith('data:image/')) {
        return icon;
    }
    if (!icon.includes('.')) {
        // a material icon by name, which is not a file the browser could load
        return undefined;
    }
    const adapter = id.split('.', 2)[0];
    return `../../adapter/${adapter}${icon.startsWith('/') ? '' : '/'}${icon}`;
}

/**
 * The name and the symbol an object carries, for a widget that holds a state per row.
 *
 * {@link adoptObject} answers the same question for the one state a widget is about, and writes the answer
 * into the fields that widget has. A list has a row per state and needs the answer under the names of that
 * row, so it asks here and puts it where it belongs itself.
 *
 * As there, the channel or the device above the state is asked where the state itself says nothing: a state
 * is called `LEVEL` and its channel `Kitchen ceiling`, and the second one is the name to put on a row.
 *
 * @param socket - the connection to read the objects with
 * @param id - the state to describe
 * @param language - the language the name is read in
 */
export async function describeObject(
    socket: Connection,
    id: string,
    language: ioBroker.Languages,
): Promise<{ name: string; icon?: string }> {
    if (!id || id === NOTHING_SELECTED) {
        return { name: '' };
    }

    const state = (await socket.getObject(id)) as ioBroker.StateObject | null | undefined;
    let name = getText(state?.common?.name, language);
    let icon = iconOf(state, id);

    if (!name || !icon) {
        const parts = id.split('.');
        for (let up = 0; up < 2 && parts.length > 2; up++) {
            parts.pop();
            const parent = await socket.getObject(parts.join('.'));
            if (parent?.type === 'channel' || parent?.type === 'device' || parent?.type === 'folder') {
                name ||= getText(parent.common?.name, language);
                icon ||= iconOf(parent, id);
            }
        }
    }

    return { name, icon };
}

/**
 * Fill in what the object already knows, when a state is picked for a widget.
 *
 * A state carries its name, its unit and its limits, and the channel or the device above it usually carries
 * the icon and the better name - `Kitchen ceiling` rather than `LEVEL`. Asking the user to type all of that
 * again is what makes building a page tedious, so it is taken over the moment the object is chosen.
 *
 * Only empty fields are filled: whatever the user has already written stays, and a field cleared by hand is
 * filled again on the next pick, which is the only way to say "take it over again".
 *
 * @param data - the data of the widget, which is changed in place
 * @param socket - the connection to read the objects with
 * @param language - the language the names are read in
 * @param attr - which attribute names the state to take it all over from; `oid` in the normal case
 * @returns whether anything was taken over
 */
export async function adoptObject(
    data: WidgetData,
    socket: Connection,
    language: ioBroker.Languages,
    attr = 'oid',
): Promise<boolean> {
    const id: string = data[attr];
    if (!id || id === NOTHING_SELECTED) {
        return false;
    }

    const state = (await socket.getObject(id)) as ioBroker.StateObject | null | undefined;
    const common = state?.common;
    if (!common) {
        return false;
    }

    let changed = false;
    const take = (attr: string, value: unknown): void => {
        if (value === undefined || value === null || value === '') {
            return;
        }
        if (data[attr] === undefined || data[attr] === null || data[attr] === '') {
            data[attr] = value;
            changed = true;
        }
    };

    take('widgetTitle', getText(common.name, language));
    take('unit', common.unit);
    take('min', typeof common.min === 'number' ? common.min : undefined);
    take('max', typeof common.max === 'number' ? common.max : undefined);
    take('step', typeof common.step === 'number' ? common.step : undefined);
    take('icon', iconOf(state, id));

    // the state rarely carries the icon and the good name; its channel and the device above it do
    if (!data.icon || !data.widgetTitle) {
        const parts = id.split('.');
        for (let up = 0; up < 2 && parts.length > 2; up++) {
            parts.pop();
            const parent = await socket.getObject(parts.join('.'));
            if (parent?.type === 'channel' || parent?.type === 'device' || parent?.type === 'folder') {
                take('icon', iconOf(parent, id));
                take('widgetTitle', getText(parent.common?.name, language));
            }
        }
    }

    return changed;
}
