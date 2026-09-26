import ChannelDetectorModule, { Types, type DetectOptions } from '@iobroker/type-detector';
import type { Connection } from '@iobroker/gui-components';

/**
 * `@iobroker/type-detector` is CommonJS, and how its default export arrives depends on who bundles it: the
 * class itself, or an object with the class under `default`. Without this, `new ChannelDetector()` says
 * "ChannelDetector is not a constructor" in the dev server. The same trap as `echarts-for-react/lib/core`.
 */
const ChannelDetector =
    (ChannelDetectorModule as unknown as { default?: typeof ChannelDetectorModule }).default || ChannelDetectorModule;

/** How long a read of all objects is reused before the wizard reads them again, in ms */
const CACHE_TTL = 60_000;

/** The id the devices without a room - or without a function - are collected under */
export const NO_GROUP_ID = '';

/** One of the states the detector found for a device, like its `SET` or its `ACTUAL` */
export interface WizardDeviceState {
    id: string;
    /** The name the detector gave the state, like `SET`, `ACTUAL` or `HUMIDITY` */
    name: string;
    /** The role the detector expects here, which is not always the role the object carries */
    role?: string;
    common: ioBroker.StateCommon;
}

/** A device the detector found: plain data, so the planning and its tests need no socket */
export interface WizardDevice {
    /** The id the device was found under: a state, a channel or a device */
    id: string;
    type: Types;
    /** The name shown in the wizard and taken over as the title of the widget */
    name: string;
    /** The icon of the device, as a URL or a data URL */
    icon?: string;
    /** `enum.rooms.*`, or `NO_GROUP_ID` if the device is in no room */
    roomId: string;
    /** `enum.functions.*`, or `NO_GROUP_ID` if the device is in no function */
    functionId: string;
    states: WizardDeviceState[];
}

/** A room or a function, as the wizard groups the devices by it */
export interface WizardEnum {
    /** `enum.rooms.*`, `enum.functions.*`, or `NO_GROUP_ID` for the devices that are in none */
    id: string;
    name: string;
    icon?: string;
    color?: string;
}

export interface WizardDetection {
    devices: WizardDevice[];
    rooms: WizardEnum[];
    functions: WizardEnum[];
}

export interface DetectDevicesOptions {
    socket: Connection;
    /** The language the names are read in */
    language: ioBroker.Languages;
    /** Called with a value from 0 to 1 while the objects are read and the devices are detected */
    onProgress?: (progress: number) => void;
    /** Asked now and then; as soon as it says true, the detection gives up and throws `CANCELLED` */
    isCancelled?: () => boolean;
    /** Read the objects again, even if the last read is still young */
    force?: boolean;
}

/** What `detectDevices` throws when `isCancelled` said so */
export const CANCELLED = 'cancelled';

/** An object as the detection works with it: never the one from the socket, so nothing of it is overwritten */
interface DetectionObject {
    _id: string;
    type: ioBroker.ObjectType;
    common: ioBroker.StateCommon & ioBroker.EnumCommon;
    native?: Record<string, any>;
}

let cache: { ts: number; objects: Record<string, DetectionObject> } | null = null;

/** Forget the objects that were read last, so the next detection reads them again */
export function clearDetectionCache(): void {
    cache = null;
}

/**
 * The icon of an object, as an `img` can show it.
 *
 * An icon that is not a data URL is a file of the adapter the object belongs to, so the name of that adapter -
 * or of that instance - has to be put in front of it.
 *
 * @param obj - the object whose icon is wanted
 * @param id - the id of the object, if it is not the one in the object
 * @param imagePrefix - what stands before `/adapter/...`, which depends on where the page is served from
 */
export function getObjectIcon(
    obj: { common?: { icon?: string; name?: ioBroker.StringOrTranslated }; type?: string } | null | undefined,
    id?: string,
    imagePrefix?: string,
): string | undefined {
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
    imagePrefix ||= '.';
    const name = obj?.common?.name;

    if (obj?.type === 'instance' || obj?.type === 'adapter') {
        return `${imagePrefix}/adapter/${typeof name === 'object' ? name.en : name}/${icon}`;
    }
    if (id?.startsWith('system.adapter.')) {
        const instance = id.split('.', 3);
        instance[2] += icon.startsWith('/') ? icon : `/${icon}`;
        return `${imagePrefix}/adapter/${instance[2]}`;
    }
    const adapter = (id || '').split('.', 2);
    adapter[0] += icon.startsWith('/') ? icon : `/${icon}`;
    return `${imagePrefix}/adapter/${adapter[0]}`;
}

/** The text of a name that may be given in several languages */
export function getText(text: ioBroker.StringOrTranslated | undefined, language: ioBroker.Languages): string {
    if (!text) {
        return '';
    }
    if (typeof text === 'object') {
        return text[language] || text.en || '';
    }
    return text;
}

/**
 * Read every object the detector needs.
 *
 * The five reads are the expensive part of the wizard, so their result is kept for a minute: opening the wizard
 * again, or stepping back and forth in it, does not read them anew.
 *
 * @param socket - the connection to the ioBroker server
 * @param force - read again, even if the last read is still young
 * @param onProgress - called with a value from 0 to 1
 */
async function readAllObjects(
    socket: Connection,
    force?: boolean,
    onProgress?: (progress: number) => void,
): Promise<Record<string, DetectionObject>> {
    if (!force && cache && Date.now() - cache.ts < CACHE_TTL) {
        onProgress?.(1);
        return cache.objects;
    }

    const types: ioBroker.ObjectType[] = ['state', 'channel', 'device', 'folder', 'enum'];
    const objects: Record<string, DetectionObject> = {};

    for (let t = 0; t < types.length; t++) {
        const view = await socket.getObjectViewSystem(types[t] as 'state', '', '\u9999');
        for (const obj of Object.values(view) as ioBroker.Object[]) {
            // the detector writes the role it expects into the objects it is given, so it never gets the ones
            // of the socket: they are its cache, and every other part of the editor reads them too
            objects[obj._id] = {
                _id: obj._id,
                type: obj.type,
                common: { ...obj.common } as ioBroker.StateCommon & ioBroker.EnumCommon,
                native: obj.native,
            };
        }
        onProgress?.((t + 1) / types.length);
    }

    cache = { ts: Date.now(), objects };

    return objects;
}

/** The ids an enum holds, and the ids of the channels and devices above them, so a state of them counts too */
function buildEnums(
    objects: Record<string, DetectionObject>,
    prefix: string,
    language: ioBroker.Languages,
): { list: WizardEnum[]; members: Record<string, string> } {
    const list: WizardEnum[] = [];
    const members: Record<string, string> = {};

    for (const id of Object.keys(objects)) {
        if (objects[id].type !== 'enum' || !id.startsWith(prefix)) {
            continue;
        }
        const common = objects[id].common;
        list.push({
            id,
            name: getText(common.name, language) || id.substring(prefix.length),
            icon: getObjectIcon(objects[id], id, '../..'),
            color: common.color,
        });
        for (const member of common.members || []) {
            // the first enum a member is in wins, as a device is normally in one room
            members[member] ||= id;
        }
    }

    list.sort((a, b) => a.name.localeCompare(b.name));

    return { list, members };
}

/** The channel and the device above a state, as far as they exist */
function getParents(id: string, objects: Record<string, DetectionObject>): { channelId?: string; deviceId?: string } {
    const type = objects[id]?.type;
    if (type !== 'state' && type !== 'channel') {
        return {};
    }
    const parts = id.split('.');
    parts.pop();
    const channelId = parts.join('.');
    const channel = objects[channelId];
    if (!channel || (channel.type !== 'channel' && channel.type !== 'folder')) {
        return {};
    }
    parts.pop();
    const deviceId = parts.join('.');
    const device = objects[deviceId];
    if (!device || (device.type !== 'device' && device.type !== 'folder')) {
        return { channelId };
    }
    return { channelId, deviceId };
}

/** The name and the icon a device is shown with: the ones of its channel or device, if it has one */
function getNameAndIcon(
    id: string,
    objects: Record<string, DetectionObject>,
    language: ioBroker.Languages,
): { name: string; icon?: string } {
    const own = objects[id];
    let name = getText(own?.common?.name, language);
    let icon = getObjectIcon(own, id, '../..');

    const { channelId, deviceId } = getParents(id, objects);
    for (const parentId of [channelId, deviceId]) {
        const parent = parentId ? objects[parentId] : undefined;
        if (!parent) {
            continue;
        }
        name = getText(parent.common?.name, language) || name;
        icon = getObjectIcon(parent, parentId, '../..') || icon;
    }

    return { name, icon };
}

/**
 * Find every device of the ioBroker installation and the rooms and functions they are in.
 *
 * What comes back is plain data: the planning of the pages and its tests work on it without a connection. The
 * objects of the socket are not touched on the way, unlike in the wizard of the widget set `material`, which
 * wrote the role it expected into the cache of the socket.
 *
 * @param options - the connection, the language, and how the caller follows and stops the detection
 */
export async function detectDevices(options: DetectDevicesOptions): Promise<WizardDetection> {
    const { socket, language, onProgress, isCancelled, force } = options;

    // reading the objects is about half of the work
    const objects = await readAllObjects(socket, force, progress => onProgress?.(progress * 0.5));

    if (isCancelled?.()) {
        throw new Error(CANCELLED);
    }

    const rooms = buildEnums(objects, 'enum.rooms.', language);
    const functions = buildEnums(objects, 'enum.functions.', language);

    const keys = Object.keys(objects).sort();

    // what is worth looking at: everything an enum holds, and everything that carries a smart name
    const seenCandidates = new Set<string>();
    for (const id of keys) {
        if (objects[id].type === 'enum') {
            for (const member of objects[id].common.members || []) {
                if (objects[member]) {
                    seenCandidates.add(member);
                }
            }
        } else if (objects[id].common?.smartName) {
            seenCandidates.add(id);
        }
    }
    const candidates = [...seenCandidates];

    const detector = new ChannelDetector();
    const detectOptions: DetectOptions = {
        id: '',
        objects: objects as unknown as Record<string, ioBroker.Object>,
        _keysOptional: keys,
        _usedIdsOptional: [],
        ignoreIndicators: ['UNREACH_STICKY'],
        excludedTypes: [Types.info],
    };

    const devices: WizardDevice[] = [];
    const seen = new Set<string>();

    for (let c = 0; c < candidates.length; c++) {
        if (!(c % 50)) {
            if (isCancelled?.()) {
                throw new Error(CANCELLED);
            }
            onProgress?.(0.5 + (0.5 * c) / candidates.length);
        }

        detectOptions.id = candidates[c];
        const controls = detector.detect(detectOptions);
        if (!controls) {
            continue;
        }

        for (const control of controls) {
            const mainId = control.states.find(state => state.id)?.id;
            if (!mainId || seen.has(mainId)) {
                continue;
            }
            seen.add(mainId);

            const { channelId, deviceId } = getParents(mainId, objects);
            const inEnum = (members: Record<string, string>): string =>
                members[mainId] || (channelId && members[channelId]) || (deviceId && members[deviceId]) || NO_GROUP_ID;

            const roomId = inEnum(rooms.members);
            const { name, icon } = getNameAndIcon(mainId, objects, language);
            const roomName = rooms.list.find(room => room.id === roomId)?.name;

            devices.push({
                id: mainId,
                type: control.type,
                // "Living room.Ceiling lamp" is the lamp of the living room, and the room is written above it
                name: cleanName(name, roomName) || mainId,
                icon,
                roomId,
                functionId: inEnum(functions.members),
                states: control.states
                    .filter(state => state.id)
                    .map(state => ({
                        id: state.id,
                        name: state.name,
                        role: state.defaultRole,
                        common: objects[state.id].common,
                    })),
            });
        }
    }

    onProgress?.(1);

    return { devices, rooms: rooms.list, functions: functions.list };
}

/** `Living room.Ceiling lamp` in the living room is simply `Ceiling lamp` */
export function cleanName(name: string, roomName?: string): string {
    let result = (name || '').replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
    if (roomName) {
        result = result.replace(roomName, '').replace(/\s+/g, ' ').trim();
    }
    return result;
}
