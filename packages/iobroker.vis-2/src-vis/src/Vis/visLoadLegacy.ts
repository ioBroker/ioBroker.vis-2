/**
 * On-demand loader for the libraries that only the vis-1 world needs.
 *
 * jQuery, jQuery UI, can.js, the multiselect plugin and quo used to sit as blocking `<script>` tags in
 * `index.html` and `edit.html`, so every runtime paid 474 KB for them before the first pixel. Since vis-2
 * no longer ships a single ejs template of its own, a project that uses nothing but React widgets never
 * touches any of it, and the libraries can be fetched at the moment something actually asks for them:
 *
 * - a widget set from `widgets.html` is about to run (`VisEngine.setInnerHTML`) - those are can.js templates
 *   and their scripts call `$` while they load,
 * - a can.js widget renders (`VisCanWidget`),
 * - a jQui widget has `jquery_style` switched on, which reaches for `.button()` from jQuery UI,
 * - the legacy `control.command` dialogs open or close.
 */

/** Loaded in this order, because each one builds on the one before */
const LEGACY_SCRIPTS = [
    'lib/js/jquery-1.11.2.min.js',
    'lib/js/jquery-ui-1.11.4.full.min.js',
    'lib/js/can.custom.js',
    'lib/js/jquery.multiselect-1.13.min.js',
    'lib/js/quo.standalone.js',
];

const LEGACY_STYLES = ['lib/css/jquery.multiselect-1.13.css'];

/** The one running request. Everybody who asks while it is open waits for the same one. */
let loading: Promise<void> | null = null;

/** Waiting for the libraries without asking for them, see `onLegacyLibsLoaded` */
const waiting: (() => void)[] = [];

function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Cannot load ${src}`));
        document.head.appendChild(script);
    });
}

/** True as soon as can.js is there, which is the last thing a legacy widget waits for */
export function isLegacyLibsLoaded(): boolean {
    return !!window.can && !!window.jQuery;
}

/**
 * Make jQuery, jQuery UI, can.js and the smaller vis-1 helpers available.
 *
 * Calling it more than once is free: the first call does the work and every later one gets the same promise
 * back, so widgets may ask for it as often as they like without ever loading a library twice.
 */
export async function ensureLegacyLibs(): Promise<void> {
    if (isLegacyLibsLoaded()) {
        return;
    }
    loading ||= (async () => {
        LEGACY_STYLES.forEach(href => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = href;
            document.head.appendChild(link);
        });

        // one after another - jQuery UI needs jQuery, and can.js needs both
        for (const src of LEGACY_SCRIPTS) {
            await loadScript(src);
        }

        // jQuery is loaded as a plain script, so it puts itself on `window` under both names. The vis-1 code
        // reads them from there, and `VisEngine` hands them into the widget context.
        window.jQuery ||= window.$;
        window.$ ||= window.jQuery;

        waiting.splice(0).forEach(callback => callback());
    })();

    try {
        await loading;
    } catch (error) {
        // let the next caller try again instead of handing out the failed promise forever
        loading = null;
        throw error;
    }
}

/**
 * Run something once the legacy libraries are there - but do not fetch them for it.
 *
 * This is for the hooks that only vis-1 widgets ever read, such as the file selector on `$.fm`. Loading half
 * a megabyte of jQuery just to hang a property on it would defeat the whole point, so the callback waits for
 * somebody who really needs the libraries to ask for them. If nobody ever does, it simply never runs, and
 * nothing is missing - there is no vis-1 widget around to look for it.
 *
 * @param callback what to do once jQuery and can.js are available
 */
export function onLegacyLibsLoaded(callback: () => void): void {
    if (isLegacyLibsLoaded()) {
        callback();
    } else {
        waiting.push(callback);
    }
}
