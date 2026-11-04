/**
 * <iob-state-tile> - demo of an ioBroker web component (PoC)
 *
 * Plain JavaScript, no framework, no build step: the same file runs in vis-2, admin, devices or any other page
 * that has a connection to ioBroker. The host only has to
 *
 *   1. import this module,
 *   2. set `element.socket` - a `Connection` of @iobroker/socket-client,
 *   3. set `element.settings` - the values of the settings described in `manifest.settings` (JSON-Config).
 *
 * The element shows the value of a state, with its name and unit taken from the object, and toggles a boolean
 * state on click.
 */

export const manifest = {
    manifestVersion: 1,
    tag: 'iob-state-tile',
    name: { en: 'State tile', de: 'Zustandskachel' },
    description: {
        en: 'Shows the value of a state; toggles a boolean on click',
        de: 'Zeigt den Wert eines Datenpunkts; schaltet einen Boolean beim Klick um',
    },
    icon: 'iob-state-tile.svg',
    size: { width: 180, height: 110 },
    settings: {
        type: 'panel',
        items: {
            _stateHeader: { type: 'header', text: { en: 'State', de: 'Datenpunkt' } },
            oid: { type: 'objectId', label: { en: 'State', de: 'Datenpunkt' } },
            title: {
                type: 'text',
                label: { en: 'Title', de: 'Titel' },
                help: { en: 'Empty: the name of the object', de: 'Leer: der Name des Objekts' },
            },
            unit: {
                type: 'text',
                label: { en: 'Unit', de: 'Einheit' },
                help: { en: 'Empty: the unit of the object', de: 'Leer: die Einheit des Objekts' },
            },
            decimals: {
                type: 'number',
                label: { en: 'Decimals', de: 'Nachkommastellen' },
                min: 0,
                max: 6,
                default: 1,
            },
            _lookDivider: { type: 'divider' },
            _lookHeader: { type: 'header', text: { en: 'Appearance', de: 'Darstellung' } },
            variant: {
                type: 'select',
                label: { en: 'Layout', de: 'Aufbau' },
                options: [
                    { value: 'tile', label: { en: 'Tile', de: 'Kachel' } },
                    { value: 'compact', label: { en: 'One row', de: 'Eine Zeile' } },
                ],
                default: 'tile',
            },
            color: { type: 'color', label: { en: 'Accent color', de: 'Akzentfarbe' }, default: '#2196f3' },
            toggle: {
                type: 'checkbox',
                label: { en: 'Toggle a boolean on click', de: 'Boolean beim Klick umschalten' },
                default: true,
            },
            textTrue: {
                type: 'text',
                label: { en: 'Text for true', de: 'Text für wahr' },
                help: { en: 'Empty: ON', de: 'Leer: AN' },
            },
            textFalse: {
                type: 'text',
                label: { en: 'Text for false', de: 'Text für falsch' },
                help: { en: 'Empty: OFF', de: 'Leer: AUS' },
            },
        },
    },
};

const WORDS = {
    on: { en: 'ON', de: 'AN' },
    off: { en: 'OFF', de: 'AUS' },
    noState: { en: 'No state selected', de: 'Kein Datenpunkt gewählt' },
    noSocket: { en: 'Not connected', de: 'Nicht verbunden' },
};

const template = document.createElement('template');
template.innerHTML = `
<style>
    :host {
        display: block;
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        container-type: size;
        font: inherit;
        color: inherit;
        --accent: #2196f3;
    }
    .tile {
        box-sizing: border-box;
        position: relative;
        width: 100%;
        height: 100%;
        padding: 8px 10px 8px 14px;
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 4px;
        background: rgba(127, 127, 127, 0.08);
        transition: background-color 0.2s;
        user-select: none;
    }
    .tile.on {
        background: color-mix(in srgb, var(--accent) 22%, transparent);
    }
    .tile.clickable {
        cursor: pointer;
    }
    .tile.clickable:active {
        filter: brightness(0.92);
    }
    .bar {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 5px;
        background: var(--accent);
    }
    .title {
        font-size: clamp(11px, 13cqmin, 18px);
        opacity: 0.75;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .value {
        font-size: clamp(16px, 32cqmin, 56px);
        font-weight: 600;
        line-height: 1.1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .unit {
        font-size: 0.55em;
        font-weight: 400;
        margin-left: 0.2em;
        opacity: 0.75;
    }
    .hint {
        font-size: clamp(10px, 10cqmin, 14px);
        opacity: 0.6;
    }
    .hint:empty {
        display: none;
    }
    .tile.compact {
        flex-direction: row;
        align-items: center;
    }
    .tile.compact .value {
        flex: none;
        font-size: clamp(14px, min(40cqh, 14cqw), 36px);
    }
    .tile.compact .title {
        flex: 1 1 auto;
        min-width: 0;
        font-size: clamp(11px, min(25cqh, 9cqw), 20px);
    }
</style>
<div class="tile" part="tile">
    <div class="bar"></div>
    <div class="title" part="title"></div>
    <div class="value" part="value"><span class="text"></span><span class="unit"></span></div>
    <div class="hint" part="hint"></div>
</div>`;

class IobStateTile extends HTMLElement {
    #socket = null;
    #settings = {};
    /** what is subscribed right now: { socket, oid } or null */
    #subscribed = null;
    #state = null;
    #object = null;
    #elements;

    #onStateChange = (id, state) => {
        if (id === this.#subscribed?.oid) {
            this.#state = state || null;
            this.#render();
        }
    };

    constructor() {
        super();
        const root = this.attachShadow({ mode: 'open' });
        root.appendChild(template.content.cloneNode(true));
        this.#elements = {
            tile: root.querySelector('.tile'),
            title: root.querySelector('.title'),
            text: root.querySelector('.text'),
            unit: root.querySelector('.unit'),
            hint: root.querySelector('.hint'),
        };
        this.#elements.tile.addEventListener('click', () => this.#toggle());
    }

    /** @returns the connection to ioBroker */
    get socket() {
        return this.#socket;
    }

    set socket(socket) {
        this.#socket = socket || null;
        this.#sync();
    }

    /** @returns the values of the settings of `manifest.settings` */
    get settings() {
        return this.#settings;
    }

    set settings(settings) {
        this.#settings = settings || {};
        this.#sync();
    }

    connectedCallback() {
        this.#sync();
    }

    disconnectedCallback() {
        this.#unsubscribe();
    }

    get #lang() {
        return this.#socket?.systemLang || 'en';
    }

    #word(key) {
        return WORDS[key][this.#lang] || WORDS[key].en;
    }

    /** Subscribe what the settings name now, if it is not subscribed already; then draw */
    #sync() {
        const oid = this.#settings.oid || '';
        const wanted = this.isConnected && this.#socket && oid ? { socket: this.#socket, oid } : null;
        const current = this.#subscribed;
        if (wanted?.socket !== current?.socket || wanted?.oid !== current?.oid) {
            this.#unsubscribe();
            if (wanted) {
                this.#subscribe(wanted);
            }
        }
        this.#render();
    }

    #subscribe(wanted) {
        this.#subscribed = wanted;
        this.#state = null;
        this.#object = null;
        wanted.socket
            .subscribeState(wanted.oid, this.#onStateChange)
            .catch(e => console.warn(`<iob-state-tile>: cannot subscribe ${wanted.oid}: ${e}`));
        // the socket delivers the value on subscription; ask once more in case this host's socket does not
        wanted.socket
            .getState(wanted.oid)
            .then(state => {
                if (this.#subscribed === wanted && !this.#state) {
                    this.#state = state || null;
                    this.#render();
                }
            })
            .catch(() => {});
        wanted.socket
            .getObject(wanted.oid)
            .then(obj => {
                if (this.#subscribed === wanted) {
                    this.#object = obj || null;
                    this.#render();
                }
            })
            .catch(() => {});
    }

    #unsubscribe() {
        if (this.#subscribed) {
            this.#subscribed.socket.unsubscribeState(this.#subscribed.oid, this.#onStateChange);
            this.#subscribed = null;
        }
    }

    #isBoolean() {
        return this.#object?.common?.type === 'boolean' || typeof this.#state?.val === 'boolean';
    }

    #canToggle() {
        return (
            this.#settings.toggle !== false &&
            !!this.#subscribed &&
            this.#isBoolean() &&
            this.#object?.common?.write !== false
        );
    }

    #toggle() {
        if (this.#canToggle()) {
            const val = this.#state?.val;
            this.#subscribed.socket.setState(this.#subscribed.oid, !(val === true || val === 'true'));
        }
    }

    #text(value) {
        if (value && typeof value === 'object') {
            return value[this.#lang] || value.en || '';
        }
        return value == null ? '' : String(value);
    }

    #formatValue() {
        const val = this.#state?.val;
        if (val === undefined || val === null) {
            return '-';
        }
        if (this.#isBoolean()) {
            const on = val === true || val === 'true';
            return on ? this.#settings.textTrue || this.#word('on') : this.#settings.textFalse || this.#word('off');
        }
        const states = this.#object?.common?.states;
        if (states && typeof states === 'object' && !Array.isArray(states) && states[val] !== undefined) {
            return this.#text(states[val]);
        }
        if (typeof val === 'number') {
            const decimals = Number.isFinite(this.#settings.decimals) ? this.#settings.decimals : 1;
            return val.toLocaleString(this.#lang, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        }
        return String(val);
    }

    #render() {
        const { tile, title, text, unit, hint } = this.#elements;
        const settings = this.#settings;
        const oid = settings.oid || '';

        this.style.setProperty('--accent', settings.color || '#2196f3');
        tile.classList.toggle('compact', settings.variant === 'compact');

        title.textContent = settings.title || this.#text(this.#object?.common?.name) || oid;

        if (!oid) {
            text.textContent = '';
            unit.textContent = '';
            hint.textContent = this.#word('noState');
        } else if (!this.#socket) {
            text.textContent = '';
            unit.textContent = '';
            hint.textContent = this.#word('noSocket');
        } else {
            text.textContent = this.#formatValue();
            unit.textContent = this.#isBoolean() ? '' : settings.unit || this.#object?.common?.unit || '';
            hint.textContent = '';
        }

        const on = this.#isBoolean() && (this.#state?.val === true || this.#state?.val === 'true');
        tile.classList.toggle('on', on);
        tile.classList.toggle('clickable', this.#canToggle());
    }
}

if (!customElements.get(manifest.tag)) {
    customElements.define(manifest.tag, IobStateTile);
}

export default IobStateTile;
