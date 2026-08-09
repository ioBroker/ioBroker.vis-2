# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`ioBroker.vis-2` is the visualization adapter for the ioBroker home-automation platform: a drag-and-drop
editor plus a runtime that renders user-built dashboards ("projects" of "views" of "widgets") bound to
ioBroker states.

It is a Lerna / npm-workspaces monorepo with two packages:

| Path | What it is |
| --- | --- |
| `packages/iobroker.vis-2` | The adapter itself: Node.js backend (`src/main.ts`) + browser app (`src-vis/`) |
| `packages/types-vis-2` | Published `@iobroker/types-vis-2` — types and the module-federation shared-deps config consumed by third-party widget adapters |

`packages/iobroker.vis-2/src-vis` is **not** a workspace; it has its own `package.json` and `node_modules`
and is installed separately.

## Commands

### Setup

```bash
npm run install-monorepo    # Install all deps (root + packages + src-vis)
```

A plain `npm i` is not enough — `src-vis` would be left without dependencies.

### Development

```bash
npm run start               # Vite dev server on :3000 (proxies to a running ioBroker web on :8082)
```

An ioBroker instance with `web` on port **8082** must already be running (see `src-vis/vite.config.ts`
`server.proxy`). In the dev server, `http://localhost:3000/` serves the **runtime** and
`http://localhost:3000/edit.html` serves the **editor**. HMR works.

### Build

```bash
npm run build                             # root: clean + lerna run build
npm run build -w packages/iobroker.vis-2  # same thing for the adapter package only
```

The build pipeline for the main package: `npm run tsc` (TypeScript backend) → `node tasks` (build frontend,
copy artifacts, patch HTML). Full builds are memory-hungry; CI sets `NODE_OPTIONS=--max_old_space_size=8192`
and `tasks.js` passes `ramSize: 7000` to `buildReact`.

Individual build steps (useful to skip the slow icon generation while iterating):

```bash
node tasks --0-clean        # rm src-vis/build
node tasks --1-npm          # install src-vis deps if missing
node tasks --2-svg-icons    # generate material-icons + knx-uf iconset JSON into src-vis/public
node tasks --3-build        # sync i18n, run the Vite build
node tasks --4-copy         # src-vis/build -> www
node tasks --5-patch        # patch socket.io script tag, copy www/main.js/lib/io-package.json to repo root
node tasks --build-editor   # 0..5 in one pass
node tasks --copy-backend   # refresh lib/states.js + non-TS backend assets after a backend change
```

### Type checking and lint

```bash
npm run check-ts -w packages/iobroker.vis-2   # src-vis (tsc --noEmit) then backend (tsc --noEmit)
npm run check-ts -w packages/types-vis-2
npx eslint -c eslint.config.mjs               # run inside a package dir; each has its own config
```

### Tests

```bash
npm run test     -w packages/iobroker.vis-2   # mocha test/*.engine.js  (starts js-controller)
npm run test-gui -w packages/iobroker.vis-2   # mocha test/*.gui.js     (puppeteer; what CI runs)
```

Single test: `cd packages/iobroker.vis-2 && npx mocha ./test/testAdapter.gui.js --exit --grep "Check runtime"`.
The GUI test installs js-controller + `web`, builds a project, walks every widget in the palette, and writes
screenshots to `packages/iobroker.vis-2/tmp/screenshots/` (uploaded as a CI artifact).

## Architecture

### Two entry points, one source tree

The Vite build is multi-entry (`src-vis/vite.config.ts` → `build.rollupOptions.input`):

- `src-vis/index.html` → `src/indexRuntime.tsx` → `src/Runtime.tsx` — the end-user **runtime**, slim bundle
- `src-vis/edit.html` → `src/index.tsx` → `src/Editor.tsx` — the **editor**, full bundle

`Editor extends Runtime`. The runtime bundle stays slim only because `indexRuntime.tsx` never pulls in the
editor import graph — **do not add static editor-only imports to `Runtime.tsx`, `visEngine.tsx`, `visView.tsx`
or the widget files**; use dynamic `import()` for editor-only dialogs. This replaced an older build that
copied the source tree into `runtime/` and substituted imports; `tasks.js clean()` still deletes leftover
`runtime/` trees defensively.

### Rendering engine — `src-vis/src/Vis/`

- `visEngine.tsx` — the heart: builds the `VisContext`, subscribes to ioBroker states, evaluates bindings,
  exposes the legacy global `vis` object (`VisLegacy`) that vis-1 widgets still use, handles the
  `control.command` interface.
- `visView.tsx` — renders one view and its widgets; selection/drag/resize in edit mode.
- `visBaseWidget.tsx` — base class for every widget (position, style, signals, resize handles, gestures).
  - `visCanWidget.tsx` — renders **legacy vis-1 widgets** through can.js templates
    (`Vis/lib/can.custom.min.js`, HTML widget sets served from `www/widgets/*.html`).
  - `visRxWidget.tsx` — React base class for **vis-2 widgets**; also the module-federation export.
- `visWidgetsCatalog.tsx` — merges `getWidgetInfo()` from built-in and remote widgets into the model the
  palette and the attributes panel render from.
- `visLoadWidgets.tsx` — loads remote widget sets at runtime via `@module-federation/runtime`.
- `visUtils.tsx` / `visFormatUtils.tsx` — binding parsing and the `{id;operation;…}` format operations
  documented in `README.md`.
- `Vis/Widgets/{Basic,JQui,Tabs,Swipe}/` — built-in widgets. A new built-in widget must be added to the
  `WIDGETS` array in `Vis/Widgets/index.tsx`; each widget is a `VisRxWidget` subclass exposing a
  `static getWidgetInfo(): RxWidgetInfo` (see `Widgets/Basic/BasicBulb.tsx` for the canonical shape).

### Module federation (easy to break)

`federation({ name: 'iobroker_vis' })` in `src-vis/vite.config.ts` and `init({ name: 'iobroker_vis' })` in
`Vis/visLoadWidgets.tsx` **must stay identical**. A mismatch creates a second, empty host instance, shared
React/MUI stops being shared, remote widgets load their own React, and you get
`Cannot read properties of null (reading 'useContext')`. `@module-federation/vite` and
`@module-federation/runtime` are pinned to exact versions on purpose because this behaviour has changed
between releases.

The shared-dependency list lives in `packages/types-vis-2/modulefederation.vis.config.ts` and is imported by
both this repo and third-party widget adapters — changing it is a cross-repo contract change.

### State

`src-vis/src/Store.tsx` is a Redux Toolkit store holding the whole project under `visProject`, keyed by view
name, with `___settings` as a pseudo-view carrying project settings. Mutations go through
`updateProject` / `updateView` / `updateWidget` / `updateGroupWidget`. The project is persisted to the
ioBroker file storage as `vis-2.0/<project>/vis-views.json` via socket `readFile` / `writeFile64`, and
external changes to that file are picked up by a file subscription in `Runtime.tsx`.

Widget IDs are template-literal types: `SingleWidgetId` = `` `w${string}` ``, `GroupWidgetId` = `` `g${string}` ``
(`packages/types-vis-2/index.d.ts`).

### Backend adapter — `packages/iobroker.vis-2/src/`

- `main.ts` — scans the possible node_modules locations for installed `iobroker.*` adapters that ship a
  `widgets/` folder (`collectWidgetSets` / `readAdapterList`), copies them into `www/widgets/`
  (`lib/install.ts` → `syncWidgetSets`), generates `config.js` and the aggregated `widgets.html`, then calls
  `uploadAdapter()` and stamps `info.uploaded`. It re-runs on any relevant `system.adapter.*` object change.
  It also performs the ioBroker license check at startup.
- `lib/states.ts` — referenced from `io-package.json` as `common.serviceStates`; it counts the datapoints
  used per project. Its **compiled output `packages/iobroker.vis-2/lib/states.js` is committed** (js-controller
  loads it directly), so run `npm run copy-backend` after editing it.
- `lib/convert.ts` — vis-1 → vis-2 project conversion.

### Generated files — never edit by hand

`tasks.js patchEditor()` copies build output into the **repository root** so the checkout can be used
directly as an ioBroker adapter directory. These are all gitignored:

```
/main.js  /io-package.json  /lib/  /www/  packages/iobroker.vis-2/www/  packages/iobroker.vis-2/build/
packages/iobroker.vis-2/README.md   src-vis/build/   src-vis/src/version.json
```

Sources of truth: `packages/iobroker.vis-2/src/**`, `packages/iobroker.vis-2/io-package.json`, and the root
`README.md` (the package README is generated from it with the `packages/iobroker.vis-2/` path prefix stripped).
The one committed build artifact is `packages/iobroker.vis-2/lib/states.js`.

### i18n

Two catalogs under `src-vis/src/`: `i18nRuntime/*.json` (runtime words) and `i18n/*.json` (editor words).
`tasks.js buildEditor()` copies every key present in `i18nRuntime/en.json` but missing from `i18n/en.json`
into all editor languages — so **add shared words to `i18nRuntime` only** and let the build propagate them.
Words used by legacy can.js widgets live in `Vis/visWords.tsx`.

## Conventions

- Formatting/lint come from `@iobroker/eslint-config` (prettier: 4 spaces, 120 columns, single quotes,
  `singleAttributePerLine`, arrow parens avoided). Each package has its own `eslint.config.mjs`;
  `src-vis` additionally enables the React config.
- Import aliases in `src-vis`: `@/` → `src-vis/src`, and `@iobroker/types-vis-2` → the local
  `packages/types-vis-2` source (configured in both `vite.config.ts` and `tsconfig.json`).
- Releases go through `@alcalzone/release-script` (`npm run release-patch|minor|major`), which bumps
  `packages/iobroker.vis-2/io-package.json`, runs a full build, and publishes via Lerna. The changelog lives
  in the root `README.md` under `## Changelog`; older entries are in `CHANGELOG_OLD.md`.
- Adapter user documentation (bindings syntax, filters, control interface, permissions) is in the root
  `README.md`; jQui widget specifics in `packages/iobroker.vis-2/docs/widgets-jQui.md`.
