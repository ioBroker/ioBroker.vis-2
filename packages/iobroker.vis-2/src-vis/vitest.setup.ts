/**
 * The little of a browser that a module may touch while it is being loaded.
 *
 * The tests run without a DOM, which is right for the pure functions they are about. A few of those functions
 * live in a file that also imports `@iobroker/gui-components`, and its `I18n` puts its dictionary on `window`
 * at module scope - so merely reaching such a file needs a `window` to exist. This is that `window` and no
 * more: a test that wants a DOM says so itself.
 */
const store: Record<string, string> = {};

(globalThis as any).window ||= {
    i18nTranslations: {},
    sysLang: 'en',
    location: { hostname: 'localhost', pathname: '/', href: 'http://localhost/' },
    addEventListener: () => {},
    removeEventListener: () => {},
    matchMedia: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }),
    localStorage: {
        getItem: (key: string): string | null => store[key] ?? null,
        setItem: (key: string, value: string): void => {
            store[key] = value;
        },
        removeItem: (key: string): void => {
            delete store[key];
        },
    },
    addWords: () => {},
};
