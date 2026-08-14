/**
 * Packages that may exist more than once in the browser.
 *
 * React must never be duplicated - widgets extend the `VisRxWidget` of vis-2 and render into its tree, so a
 * second React means a second context registry and nothing works anymore. MUI is different: two MUI majors can
 * live side by side in one React tree. A widget set built against an older MUI major therefore keeps its own
 * copy instead of being given the one of vis-2, where removed or changed components (`Grid`, `@mui/styles`,
 * dropped props) would break it.
 *
 * `@mui/system` and `@mui/icons-material` belong to the same major as `@mui/material` and must follow it -
 * material of one major with the system of another is broken.
 *
 * The theme survives the split because it does not travel through MUI: `styled()` reads it from the
 * ThemeContext of `@emotion/react` and `useTheme()` from `@mui/private-theming` - both stay singletons, so the
 * `ThemeProvider` of vis-2 also reaches a widget that brought its own MUI.
 *
 * Only widget sets that are BUILT AGAIN with this version profit from it. An already published widget set has
 * its shared configuration baked into its remoteEntry, still asks for a singleton and is therefore still given
 * the MUI of vis-2. For those the error boundary around every widget remains the only safety net.
 */
const VERSIONED_PACKAGES = ['@mui/icons-material', '@mui/material', '@mui/styles', '@mui/system'];
function makeShared(pkgs) {
    const result = {};
    pkgs.forEach(packageName => {
        result[packageName] = VERSIONED_PACKAGES.includes(packageName)
            ? { singleton: false }
            : { requiredVersion: '*', singleton: true };
    });
    return result;
}
/**
 * Package a shared entry belongs to.
 *
 * Some entries of the list are sub-paths (`react/jsx-runtime`, `react-dom/client`, the i18n JSONs of
 * adapter-react-v5). They never appear in a package.json on their own, so filtering the list against the
 * dependencies of a component has to compare the package they belong to - otherwise exactly those entries that
 * MUST be shared would silently be dropped for every component that passes its package.json.
 *
 * @param sharedEntry - entry of the list, e.g. `react/jsx-runtime` or `@mui/material`
 * @returns Name of the package, e.g. `react` or `@mui/material`
 */
function getPackageName(sharedEntry) {
    const parts = sharedEntry.split('/');
    return sharedEntry.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}
/**
 * Entries that no component depends on directly - they are installed together with another package and have to
 * be shared whenever that package is used.
 */
const IMPLIED_BY = {
    '@mui/private-theming': '@mui/material',
};
/**
 * Is a shared entry used by a component?
 *
 * @param sharedEntry - entry of the list, e.g. `react/jsx-runtime` or `@mui/private-theming`
 * @param isUsed - tells whether the component uses a package
 * @returns true if the entry has to be shared for this component
 */
function isSharedEntryUsed(sharedEntry, isUsed) {
    return (isUsed(sharedEntry) ||
        isUsed(getPackageName(sharedEntry)) ||
        (!!IMPLIED_BY[sharedEntry] && isUsed(IMPLIED_BY[sharedEntry])));
}
/**
 * Admin shares these modules for all components
 *
 * @param packageJson - package.json or list of modules that used in component
 * @returns Object with shared modules for "federation"
 */
export function moduleFederationShared(packageJson) {
    const list = [
        '@emotion/react',
        '@emotion/styled',
        '@iobroker/adapter-react-v5',
        '@iobroker/adapter-react-v5/i18n/de.json',
        '@iobroker/adapter-react-v5/i18n/en.json',
        '@iobroker/adapter-react-v5/i18n/es.json',
        '@iobroker/adapter-react-v5/i18n/fr.json',
        '@iobroker/adapter-react-v5/i18n/it.json',
        '@iobroker/adapter-react-v5/i18n/nl.json',
        '@iobroker/adapter-react-v5/i18n/pl.json',
        '@iobroker/adapter-react-v5/i18n/pt.json',
        '@iobroker/adapter-react-v5/i18n/ru.json',
        '@iobroker/adapter-react-v5/i18n/uk.json',
        '@iobroker/adapter-react-v5/i18n/zh-cn.json',
        '@iobroker/vis-2-widgets-react-dev',
        '@mui/icons-material',
        '@mui/material',
        // Holds the ThemeContext that `useTheme()` reads. It stays a singleton on purpose although the MUI
        // packages around it are versioned: that is what lets the `ThemeProvider` of vis-2 still reach a widget
        // set that brought its own MUI major. Without it such a widget would silently fall back to the default
        // MUI theme, which is always the light one
        '@mui/private-theming',
        '@mui/styles',
        '@mui/system',
        'prop-types',
        'react',
        'react-dom',
        'react-dom/client',
        // The JSX runtime must be shared together with react itself. A component that bundles its own copy
        // creates its elements with the element symbol of ITS react version, and since React 19 renamed that
        // symbol (`react.element` -> `react.transitional.element`) to detect exactly this situation, the host
        // does not accept those elements anymore. Sharing it makes every component use the JSX runtime of the
        // host, no matter which react version it was built against.
        'react/jsx-runtime',
        // Development builds of a component (the widget development mode loads them from localhost:4173) use
        // the dev variant instead
        'react/jsx-dev-runtime',
    ];
    if (Array.isArray(packageJson)) {
        return makeShared(list.filter(sharedEntry => isSharedEntryUsed(sharedEntry, name => packageJson.includes(name))));
    }
    if (packageJson && (packageJson.dependencies || packageJson.devDependencies)) {
        return makeShared(list.filter(sharedEntry => isSharedEntryUsed(sharedEntry, name => !!(packageJson.dependencies?.[name] || packageJson.devDependencies?.[name]))));
    }
    return makeShared(list);
}
//# sourceMappingURL=modulefederation.vis.config.js.map