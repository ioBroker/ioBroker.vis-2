# ioBroker web components in vis-2 (preview)

A web component is a custom element that any ioBroker UI can show: vis-2, devices, aura, admin. The component
brings its own description of its settings, the host renders that description as its own settings UI and hands
the component a connection to ioBroker and the values of the settings.

The contract - the module, the manifest, the properties of the element, the events, the dialogs - and the base
class for components are in [`@iobroker/web-components`](https://github.com/ioBroker/web-components). This page
only describes what vis-2 does as a host. The host side is in
[`src-vis/src/Vis/WebComponents/`](../src-vis/src/Vis/WebComponents/), the demo component vis-2 brings itself is
[`src-vis/public/demo-components/iob-state-tile.js`](../src-vis/public/demo-components/iob-state-tile.js) - offered
in the palette on the dev server only.

## How vis-2 finds the components

An adapter lists its components in `common.webComponents` of its `io-package.json`: the manifest files, relative
to its admin folder. Admin and web both serve that folder as `/adapter/<adapter>/`. The manifest names the ES module
of the element as `module`, relative to itself:

```json
"common": {
    "webComponents": ["webcomponents/my-tile.json"]
}
```

vis-2 reads it from the instance objects (in the runtime from `config.js`, which the adapter writes with
`webComponents`) and resolves the URLs with `getWebComponentSources()` of the package, so vis-2 under
`/vis-2/` and behind a reverse proxy finds the same files. A manifest that is not valid is left out with an error
in the console; a tag that two components bring is taken from the first.

The palette and the attributes come from the manifest alone. vis-2 imports the module of a component when a widget
of it is shown for the first time (`importWebComponent()` of the package), once for all widgets of it, and creates
the element after that. If the module cannot be loaded or does not define the tag of its manifest, the widget stays
empty; the editor shows why.

A module that exports its manifest (`@iobroker/web-components` 0.2) still works: vis-2 imports it at once to read
the manifest. The demo component is such a module.

A React component does not bundle React: web and admin serve one copy per major as `/lib/esm/react-19.js` and
`/lib/esm/react-18.js`, see `REACT_19_URL` of the package.

## The widget

Every component becomes a widget type `tplWc_<tag>` in the palette set *Web components*, with the size of
`manifest.size` for a new widget; `size.noResize` makes the widget not resizable. The runtime loads the
components only when the project uses that set.

The element gets these properties:

| Property   | In vis-2                                                                                        |
|------------|-------------------------------------------------------------------------------------------------|
| `socket`   | the connection of vis-2                                                                         |
| `settings` | the values of the attributes, typed as the manifest declares them; a new object only on a change |
| `theme`    | `dark` or `light`, after the theme of vis-2                                                      |
| `editMode` | true in the editor - the element then writes nothing and opens no dialogs                       |
| `dialogs`  | MUI dialogs of vis-2, see below                                                                 |

Bindings work in every field: the widget hands over the values after vis-2 resolved them.

## The settings

vis-2 does not render JSON-Config. It maps the settings of the manifest onto fields of its attributes panel:

| JSON-Config  | vis-2 field   | Notes                                                                    |
|--------------|---------------|--------------------------------------------------------------------------|
| `text`       | `text`        | `minRows > 1` gives a multi-line editor                                  |
| `password`   | `password`    |                                                                          |
| `number`     | `number`      | `min`, `max`, `step`                                                     |
| `slider`     | `slider`      | `min`, `max`, `step`                                                     |
| `checkbox`   | `checkbox`    |                                                                          |
| `color`      | `color`       |                                                                          |
| `select`     | `select`      | `options: [{ value, label }]`                                            |
| `objectId`   | `id`          | `types` limits the object browser (e.g. `config`); `root` is ignored     |
| `instance`   | `instance`    | `adapter`                                                                |
| `header`     | `help` (bold) | `text`, no value                                                         |
| `staticText` | `help`        | `text`, no value                                                         |
| `divider`    | `delimiter`   | no value                                                                 |

Tabs become groups of the attributes panel. `hidden` and `disabled` are JS expressions over `data`, as in
JSON-Config. Any other type is shown as a text field. vis-2 leaves out a setting whose name it uses for every
widget itself (`name`, `class`, `comment`, `filterkey`, `locked`, `multi-views`, `visibility*`, `signals-*`,
`lc-*`, `g_*`).

## Events and dialogs

- `iob-navigate` with `detail: { view }`: vis-2 shows that view and cancels the event. Not in the editor.
- `dialogs.open()` with an element: vis-2 frames it in a MUI dialog; the element closes it with
  `iob-dialog-close`, whose `detail` is the result. Closing the dialog otherwise gives `null`.
- `dialogs.open()` with a form: vis-2 renders the JSON-Config panel with the field types of the table above and
  gives back the values, or `null` on cancel.

The dialogs are loaded on demand: a page whose components never open one does not fetch them. A dialog still open
when the widget goes away answers `null`.

## Open points

- Size in grid sections (`visDefaultGrid`), and whether a component can ask its host for another size.
- Versioning: an older module still cached by the browser after an update of the adapter.
