/**
 * The contract between an ioBroker web component and the application that shows it (vis-2, devices, admin, ...).
 *
 * PoC: these types belong into a small package of their own that every host and every component imports. They
 * live here until the contract is settled. See `docs/web-components.md` of the adapter package.
 *
 * A web component is an ES module that
 * 1. registers its custom element when it is imported (`customElements.define`, guarded against a second import),
 * 2. exports `manifest` - a JSON-serializable {@link WebComponentManifest} that describes the element and its settings.
 *
 * The host then sets two properties on the element:
 * - `socket`: the connection to ioBroker (`Connection` of `@iobroker/socket-client`), see {@link WebComponentSocket}
 * - `settings`: the values of the settings the manifest describes, a new object on every change
 */

/** A text in one or several languages, like `common.name` of an object */
export type WebComponentText = ioBroker.StringOrTranslated;

/** What a host can show of the settings - a subset of JSON-Config, so admin and devices render it unchanged */
export type WebComponentSettingType =
    | 'text'
    | 'password'
    | 'number'
    | 'slider'
    | 'checkbox'
    | 'color'
    | 'select'
    | 'objectId'
    | 'instance'
    | 'header'
    | 'staticText'
    | 'divider';

export interface WebComponentSettingOption {
    value: string | number | boolean;
    label: WebComponentText;
}

/** One entry of `items` in the JSON-Config panel */
export interface WebComponentSetting {
    type: WebComponentSettingType;
    label?: WebComponentText;
    /** Explanation under the field */
    help?: WebComponentText;
    /** The text of `header` and `staticText` */
    text?: WebComponentText;
    default?: string | number | boolean;
    /** `number`, `slider` */
    min?: number;
    max?: number;
    step?: number;
    /** `text`: more than one line */
    minRows?: number;
    /** `select` */
    options?: WebComponentSettingOption[];
    /** `instance`: instances of this adapter only */
    adapter?: string;
    /** JS expression over `data` (the values of all settings), as in JSON-Config */
    hidden?: string;
    /** JS expression over `data` (the values of all settings), as in JSON-Config */
    disabled?: string;
}

/** A JSON-Config panel: the keys of `items` are the names of the settings */
export interface WebComponentSettingsPanel {
    type: 'panel';
    items: Record<string, WebComponentSetting>;
}

/** A JSON-Config tab panel: each tab becomes a group of settings */
export interface WebComponentSettingsTabs {
    type: 'tabs';
    items: Record<string, WebComponentSettingsPanel & { label?: WebComponentText }>;
}

export interface WebComponentManifest {
    /** Version of this contract, 1 for now */
    manifestVersion: 1;
    /** Name of the custom element, must contain a `-` */
    tag: string;
    /** Name of the component, e.g. for a palette */
    name: WebComponentText;
    description?: WebComponentText;
    /** Picture of the component: a `data:` URL or a URL relative to the module */
    icon?: string;
    /** The size the element looks best in, in px. A host may use it for a new instance */
    size?: { width: number; height: number };
    /** The settings of the component, in JSON-Config */
    settings: WebComponentSettingsPanel | WebComponentSettingsTabs;
}

/**
 * The part of `Connection` (`@iobroker/socket-client`) a web component may rely on. Every host has such a
 * connection anyway: vis-2, admin, devices and the apps built on `@iobroker/gui-components`.
 */
export interface WebComponentSocket {
    systemLang: ioBroker.Languages;
    subscribeState(id: string | string[], cb: ioBroker.StateChangeHandler): Promise<void>;
    unsubscribeState(id: string | string[], cb?: ioBroker.StateChangeHandler): void;
    getState(id: string): Promise<ioBroker.State | null | undefined>;
    setState(id: string, val: ioBroker.StateValue | ioBroker.SettableState, ack?: boolean): Promise<void>;
    getObject(id: string): Promise<ioBroker.Object | null | undefined>;
}

/** The element as the host sees it */
export interface WebComponentElement extends HTMLElement {
    socket?: WebComponentSocket;
    settings?: Record<string, unknown>;
}

/** What the module of a web component exports */
export interface WebComponentModule {
    manifest?: WebComponentManifest;
}

/** A web component that was found and loaded */
export interface LoadedWebComponent {
    manifest: WebComponentManifest;
    /** Absolute URL of the module */
    url: string;
    /** The adapter that brings it, or empty for the ones vis-2 brings itself */
    adapter: string;
    /** Version of that adapter */
    version: string;
}
