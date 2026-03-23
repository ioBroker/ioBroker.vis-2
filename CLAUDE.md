# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ioBroker.vis-2 is a web-based visualization adapter for the ioBroker home automation platform. It provides a visual editor (drag-and-drop dashboard builder) and a runtime (viewer mode for end users). Licensed under CC BY-NC 4.0.

## Monorepo Structure

Yarn workspaces monorepo with Lerna for versioning. Two packages:

- **`packages/iobroker.vis-2`** — Main adapter: Node.js backend (`src/main.ts`) + React frontend (`src-vis/`)
- **`packages/types-vis-2`** — Shared TypeScript types published as `@iobroker/types-vis-2`

The frontend (`src-vis/`) has its own `package.json` and `node_modules`, separate from the main package.

## Build & Development Commands

### Setup
```bash
npm run install-monorepo    # Install all deps (root + packages + src-vis)
```

### Development
```bash
npm run start               # Vite dev server on port 3000 (proxies to ioBroker on :8082)
```

### Build
```bash
npm run build               # Full clean + build all packages
NODE_OPTIONS=--max_old_space_size=8192 npm run build  # If OOM during build
```

The build pipeline for the main package: `npm run tsc` (TypeScript backend) → `node tasks` (build frontend, copy artifacts, patch HTML, generate runtime).

### Type Checking
```bash
npm run check-ts -w packages/iobroker.vis-2   # Check both backend and frontend TS
npm run check-ts -w packages/types-vis-2      # Check types package
```

### Linting
```bash
npm run lint -w packages/iobroker.vis-2       # ESLint (extends @iobroker/eslint-config)
```

### Testing
```bash
npm run test -w packages/iobroker.vis-2       # Mocha engine tests
npm run test-gui -w packages/iobroker.vis-2   # Mocha GUI tests (Puppeteer screenshots)
```

### Release
```bash
npm run release-patch       # Bump patch, build, publish all packages
npm run release-minor
npm run release-major
```

## Architecture

### Backend (`packages/iobroker.vis-2/src/`)

Entry point: `src/main.ts` — `VisAdapter` class extending ioBroker's Adapter. Handles:
- WebSocket server (delegates to ioBroker web adapter)
- Project/view file I/O
- Widget set discovery and synchronization (`src/lib/install.ts`)
- License verification
- HTML page generation for `www/` and `runtime/`

Supporting files in `src/lib/`: `install.ts` (widget sync), `states.ts` (state management), `convert.ts` (legacy conversion).

### Frontend (`packages/iobroker.vis-2/src-vis/`)

Vite + React 18 + TypeScript. Built with Module Federation to allow external widget sets to be loaded dynamically at runtime.

Key entry points:
- `src/Editor.tsx` — Full editor with toolbar, palette, attribute panels, drag-and-drop
- `src/Runtime.tsx` — Stripped-down viewer mode (no editor controls)
- `src/Store.tsx` — Redux Toolkit store (`visProject`, `activeUser`, actions like `updateWidget`)

Core rendering engine in `src/Vis/`:
- `visEngine.tsx` — Main rendering engine
- `visView.tsx` — View renderer
- `visRxWidget.tsx` — Module Federation entry point; base class for reactive widgets
- `visBaseWidget.tsx` — Base widget class
- `visLoadWidgets.tsx` — Dynamic widget loading via Module Federation
- `visUtils.tsx` / `visFormatUtils.tsx` — Binding resolution, data formatting
- `Widgets/` — Built-in widgets organized by category (Basic, JQui, Swipe, Tabs)

UI structure: `Attributes/` (property editors), `Toolbar/`, `Palette/`, `Marketplace/`, `Components/`

### Module Federation

Configured in `src-vis/vite.config.ts`. The app exposes `./visRxWidget` and shares React, Redux, MUI dependencies. External widget adapters provide their own `remoteEntry.js` files loaded at runtime via ioBroker discovery.

### Data Binding System

Widgets bind to ioBroker object states with syntax `{objectId}` or `{objectId;operation1;operation2}`. Operations include arithmetic (`*(4)`, `+(5)`), formatting (`round(2)`, `date(format)`), and JS expressions (`{h:obj1;w:obj2;Math.sqrt(h*h+w*w)}`). Binding logic lives in `visUtils.tsx`.

### Key Types (`@iobroker/types-vis-2`)

- `Project` — Map of view IDs to `View` objects
- `View` — Contains `widgets` map and `settings`
- `SingleWidget` / `GroupWidget` — Widget definitions with `tpl`, `data`, `style`
- `VisRxWidgetStateValues`, `RxWidgetInfo` — Widget interface types
- `VisBaseWidgetProps` — Props passed to widget components

### Widget Communication

Widgets communicate with views via `askView(command, ...)` and receive commands through `onCommand()`. Commands include `register`/`unregister`, `startMove`/`stopMove`, `startResize`/`stopResize`, `collectFilters`/`changeFilter`.

## CI/CD

GitHub Actions (`.github/workflows/test-and-release.yml`):
- Runs GUI tests on Ubuntu with Node 20.x
- Deploys to npm from macOS with Node 22.x
- Build uses `NODE_OPTIONS=--max_old_space_size=8192`

## Key Configuration

- Vite dev server proxies API calls to `http://localhost:8082` (ioBroker backend must be running)
- Build target: `chrome81`
- Path alias: `@` → `src-vis/src/`, `@iobroker/types-vis-2` → local `types-vis-2` package
- Lerna `forcePublish: true` — all packages version together
