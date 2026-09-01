// Placeholder remote for @module-federation/vite - see the `remotes` comment in vite.config.ts.
// vis-2 registers its real remotes (the widget sets) at runtime with `registerRemotes()`. This module only exists so
// that the one remote the plugin needs to see resolves without a failing request: `init` has nothing to do and
// `get` hands out an empty module.
export function init() {}
export function get() {
    return Promise.resolve(() => ({}));
}
