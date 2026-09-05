export interface VisSharedModuleConfig {
    /**
     * Left out for the versioned packages: the bundler then fills in the range declared in the package.json of
     * the component, which is exactly what decides whether the copy of vis-2 fits or not
     */
    requiredVersion?: '*';
    singleton: boolean;
}

/**
 * Every shared module is a singleton that accepts any version.
 *
 * React must never be duplicated - widgets extend the `VisRxWidget` of vis-2 and render into its tree, so a
 * second React means a second context registry and nothing works anymore.
 *
 * MUI used to be exempt from that: `@mui/material` and `@mui/system` were shared with the version range of the
 * consumer, so a widget set only got the copy of vis-2 while the two ranges overlapped. That is too narrow in
 * practice - a set built against 9.1.0 while vis-2 ships 9.1.2 already carried its own copy - and it also costs
 * size, because a bundled share is bundled as a whole namespace. They are singletons with `requiredVersion: '*'`
 * now, so a widget set always renders with the MUI of vis-2, whatever patch or minor it was built against.
 *
 * The price is that a widget set built against an OLDER MUI MAJOR is handed a MUI it was not compiled for, where
 * removed or changed components (`Grid`, `@mui/styles`, dropped props) can break it. That is acceptable because
 * such a set cannot run here anyway: every widget set of MUI 5 or 6 is a react 18 build, and those are already
 * recognized and skipped by `visWidgetSetCompatibility.ts` before a single module of them is evaluated.
 *
 * `@mui/styles` is deliberately absent: it does not exist beyond MUI 6, so vis-2 has nothing to provide and the
 * plugin would abort the build over a shared module it cannot resolve.
 *
 * The theme reaches a widget either way, because it does not travel through MUI: `styled()` reads it from the
 * ThemeContext of `@emotion/react` and `useTheme()` from `@mui/private-theming`.
 */
function makeShared(pkgs: string[]): { [packageName: string]: VisSharedModuleConfig } {
    const result: { [packageName: string]: VisSharedModuleConfig } = {};
    pkgs.forEach(packageName => {
        result[packageName] = { requiredVersion: '*', singleton: true };
    });
    return result;
}

/**
 * Package a shared entry belongs to.
 *
 * Some entries of the list are sub-paths (`react/jsx-runtime`, `react-dom/client`, the i18n JSONs of
 * gui-components). They never appear in a package.json on their own, so filtering the list against the
 * dependencies of a component has to compare the package they belong to - otherwise exactly those entries that
 * MUST be shared would silently be dropped for every component that passes its package.json.
 *
 * @param sharedEntry - entry of the list, e.g. `react/jsx-runtime` or `@mui/material`
 * @returns Name of the package, e.g. `react` or `@mui/material`
 */
function getPackageName(sharedEntry: string): string {
    const parts = sharedEntry.split('/');
    return sharedEntry.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/**
 * Entries that no component depends on directly - they are installed together with another package and have to
 * be shared whenever that package is used.
 */
const IMPLIED_BY: Record<string, string> = {
    '@mui/private-theming': '@mui/material',
};

/**
 * Is a shared entry used by a component?
 *
 * @param sharedEntry - entry of the list, e.g. `react/jsx-runtime` or `@mui/private-theming`
 * @param isUsed - tells whether the component uses a package
 * @returns true if the entry has to be shared for this component
 */
function isSharedEntryUsed(sharedEntry: string, isUsed: (packageName: string) => boolean): boolean {
    return (
        isUsed(sharedEntry) ||
        isUsed(getPackageName(sharedEntry)) ||
        (!!IMPLIED_BY[sharedEntry] && isUsed(IMPLIED_BY[sharedEntry]))
    );
}

/**
 * Admin shares these modules for all components
 *
 * @param packageJson - package.json or list of modules that used in component
 * @returns Object with shared modules for "federation"
 */
/**
 * Every entry has to be resolvable from vis-2 itself: the federation plugin reads the package.json of each
 * shared module while it builds the host, and a name that is not installed aborts the build with
 * `Cannot find module '<name>/package.json'`. So a package that vis-2 dropped has to leave this list, even if
 * old widget sets still use it - they simply keep their own copy, which is what happens anyway once the host
 * stops providing it.
 */
export function moduleFederationShared(packageJson?: Record<string, any> | string[]): {
    [packageName: string]: VisSharedModuleConfig;
} {
    const list = [
        // Holds the ThemeContext that `styled()` reads, so it has to be shared for the theme of vis-2 to reach
        // a widget set that brought its own MUI major.
        //
        // `@emotion/styled` on the other hand must NOT be shared: prebundled by @module-federation/vite it
        // reaches `@mui/system` with the wrong interop shape, and MUI 9 dies while it builds its `Box` with
        // `(0 , import_styled.default) is not a function` - the whole editor stays black. It is only the styled
        // factory, every MUI copy may have its own as long as they all read the theme from the shared
        // `@emotion/react` above.
        '@emotion/react',
        // `@iobroker/gui-components` is deliberately NOT shared, for the same reason as the icons below: a
        // shared entry is bundled as a whole namespace, and the package is 2.8 MB - 518 KB of it images
        // embedded as base64, 158 KB icon paths, 1562 words in nine languages - while vis-2 uses 24 of its
        // exports and the runtime far fewer. Sharing it cost the runtime 313 KB that tree-shaking now takes
        // out. It carries no state that would mind a second copy: `I18n` keeps the dictionary and the
        // language on `window` on purpose, and the theme reaches a widget set through the shared MUI below.
        // `@iobroker/vis-2-widgets-react-dev` is deliberately NOT in this list. It is a build helper of the
        // widget sets whose runtime part is only a dummy `VisRxWidget` for their stand-alone demo page - the
        // real class reaches a widget set via `window.visRxWidget`. vis-2 never imports it, and since
        // @module-federation/vite 1.21 bundles every shared entry, the dummy would drag its undeclared
        // `@iobroker/adapter-react-v5` (built for MUI 6, `Grid2`) into the host build and break it.
        '@mui/material',
        // `@mui/icons-material` is deliberately NOT shared. An icon is a stateless SVG component - no context,
        // no singleton, two copies in one page are harmless - but a shared entry is bundled as a whole
        // namespace, so the host had to carry all ~10700 icons (13683 SVG paths, 3.1 MB of raw path data)
        // although vis-2 uses 83 of them. And being a versioned package, only a widget set of the SAME MUI
        // major was ever given that copy; every set of an older major kept its own anyway. A set now bundles
        // the handful it uses, tree-shaken - for the sets in this repository that is around 50 icons each.
        // Measured: the build of vis-2 goes from 11 MB to 6.3 MB by this entry alone.
        //
        // The i18n JSONs of `@iobroker/gui-components` (and of `@iobroker/adapter-react-v5` before them) are
        // gone for the same reason: no widget set ever imported them, vis-2 does not either, and as shared
        // entries they were bundled a second time next to the copy inside gui-components (444 kB).
        //
        // `moment` on the other hand is used by vis-2 itself (visEngine, visFormatUtils, WidgetBindingField)
        // and by half of the widget sets, so sharing it costs the host nothing - a package the host already
        // bundles is free as a share, one it does not use costs its full size (`echarts` was measured at
        // +1.7 MB and vis-2 never imports it).
        'moment',
        // Holds the ThemeContext that `useTheme()` reads. It stays a singleton on purpose although the MUI
        // packages around it are versioned: that is what lets the `ThemeProvider` of vis-2 still reach a widget
        // set that brought its own MUI major. Without it such a widget would silently fall back to the default
        // MUI theme, which is always the light one
        '@mui/private-theming',
        '@mui/system',
        'react',
        'react-dom',
        'react-dom/client',
        // The JSX runtime must be shared together with react itself. A component that bundles its own copy
        // creates its elements with the element symbol of ITS React version, and since React 19 renamed that
        // symbol (`react.element` -> `react.transitional.element`) to detect exactly this situation, the host
        // does not accept those elements anymore. Sharing it makes every component use the JSX runtime of the
        // host, no matter which React version it was built against.
        'react/jsx-runtime',
        // Development builds of a component (the widget development mode loads them from localhost:4173) use
        // the dev variant instead
        'react/jsx-dev-runtime',
    ];
    if (Array.isArray(packageJson)) {
        return makeShared(
            list.filter(sharedEntry => isSharedEntryUsed(sharedEntry, name => packageJson.includes(name))),
        );
    }
    if (packageJson && (packageJson.dependencies || packageJson.devDependencies)) {
        return makeShared(
            list.filter(sharedEntry =>
                isSharedEntryUsed(
                    sharedEntry,
                    name => !!(packageJson.dependencies?.[name] || packageJson.devDependencies?.[name]),
                ),
            ),
        );
    }
    return makeShared(list);
}
