# ioBroker web components (PoC)

A web component is a custom element that any ioBroker UI can show: vis-2, devices, aura, admin. The component
brings its own description of its settings, the host renders that description as its own settings UI and hands
the component two things - a connection to ioBroker and the values of the settings.

Status: proof of concept in vis-2. The demo component is
[`src-vis/public/demo-components/iob-state-tile.js`](../src-vis/public/demo-components/iob-state-tile.js),
the host side is in [`src-vis/src/Vis/WebComponents/`](../src-vis/src/Vis/WebComponents/).

## The module

One ES module per component. When it is imported it

1. registers its custom element (`customElements.define`, guarded: `if (!customElements.get(tag))`),
2. exports `manifest`, a plain JSON-serializable object.

```js
export const manifest = {
    manifestVersion: 1,
    tag: 'iob-state-tile',                       // name of the custom element, must contain a "-"
    name: { en: 'State tile', de: 'Zustandskachel' },
    description: { en: '...', de: '...' },        // optional
    icon: 'iob-state-tile.svg',                  // optional, relative to the module or a data: URL
    size: { width: 180, height: 110 },           // optional, the size the element looks best in
    settings: {                                   // JSON-Config: a panel, or tabs of panels
        type: 'panel',
        items: {
            oid: { type: 'objectId', label: { en: 'State', de: 'Datenpunkt' } },
            decimals: { type: 'number', label: 'Decimals', min: 0, max: 6, default: 1 },
            toggle: { type: 'checkbox', label: 'Toggle on click', default: true },
            textTrue: { type: 'text', label: 'Text for true', hidden: '!data.toggle' },
        },
    },
};
```

`settings` is [JSON-Config](https://github.com/ioBroker/ioBroker.admin/blob/master/packages/jsonConfig/README.md),
so admin and devices (`@iobroker/json-config`) can render it without any extra code. A host that does not
render JSON-Config itself, like vis-2, maps a subset onto its own fields:

| JSON-Config  | vis-2 field   | Notes                                             |
|--------------|---------------|---------------------------------------------------|
| `text`       | `text`        | `minRows > 1` gives a multi-line editor           |
| `password`   | `password`    |                                                   |
| `number`     | `number`      | `min`, `max`, `step`                              |
| `slider`     | `slider`      | `min`, `max`, `step`                              |
| `checkbox`   | `checkbox`    |                                                   |
| `color`      | `color`       |                                                   |
| `select`     | `select`      | `options: [{ value, label }]`                     |
| `objectId`   | `id`          |                                                   |
| `instance`   | `instance`    | `adapter`                                         |
| `header`     | `help` (bold) | `text`, no value                                  |
| `staticText` | `help`        | `text`, no value                                  |
| `divider`    | `delimiter`   | no value                                          |

Every text (`name`, `label`, `help`, `text`, option labels) is a string or `{ en, de, ... }`. `hidden` and
`disabled` are JS expressions over `data` - the values of all settings - in JSON-Config and in vis-2 alike.
Any other type is shown as a text field. vis-2 leaves out a setting whose name it uses for every widget itself
(`name`, `class`, `comment`, `filterkey`, `locked`, `multi-views`, `visibility*`, `signals-*`, `lc-*`, `g_*`).

## The element

The host sets two **properties** (not attributes):

| Property   | What                                                                                       |
|------------|--------------------------------------------------------------------------------------------|
| `socket`   | `Connection` of `@iobroker/socket-client` - every host already has one                     |
| `settings` | the values of the settings, keyed by the names in `items`; a **new object** on every change |

Rules for the component:

- It must work in any order: `settings` before `socket`, `socket` before `settings`, both changing at any time.
- It subscribes in `connectedCallback` / when the properties arrive, and unsubscribes in `disconnectedCallback`.
  It uses only `subscribeState(id, cb)`, `unsubscribeState(id, cb)`, `getState`, `setState`, `getObject` and
  `systemLang` of the socket (`WebComponentSocket` in `webComponentTypes.ts`).
- A value in `settings` has the type its setting declares (a number for `number`, a boolean for `checkbox`). A
  setting that has no value is missing from the object. The host converts: vis-2 keeps values typed into a field,
  and what a binding delivers, as text.
- It fills the box the host gives it (`:host { display: block; width: 100%; height: 100% }`) and never measures
  itself - scale with container queries (`container-type: size`, `cqmin`).
- It inherits `color` and `font` from the host, so it follows the theme of the host. Shadow DOM keeps its own
  styles in and the styles of the host out.
- It brings everything it needs, no framework from the host: a component built with React, Lit or Svelte
  bundles its framework into the module.

## How a host finds the components

An adapter lists its components in `common.webComponents` of its `io-package.json`, as module URLs relative to
its admin folder. Admin and web both serve that folder as `/adapter/<adapter>/`, so every host loads them from
the same place:

```json
"common": {
    "webComponents": ["webcomponents/my-tile.js"]
}
```

vis-2 reads it from the instance objects (in the runtime from `config.js`, which the adapter now writes with
`webComponents`). For the PoC vis-2 also brings the demo component itself (`DEMO_WEB_COMPONENTS` in
`visLoadWebComponents.ts`).

## In vis-2

Every component becomes a widget type `tplWc_<tag>` in the palette set *Web components*. The attributes panel
shows its settings; bindings work in every field, because the widget hands over the values after vis-2 resolved
them. The runtime loads the components only when the project uses that set.

## Open points

- The contract types (`webComponentTypes.ts`) belong into a small package of their own that hosts and
  components import.
- Size in grid sections (`visDefaultGrid`), and whether a component can ask its host for another size.
- Optional host properties: language and theme beyond `socket.systemLang` and inherited CSS, edit mode.
- Events from the component to the host (e.g. "open my dialog", "navigate").
- Versioning: two adapters bringing the same tag, an older module still cached by the browser.
