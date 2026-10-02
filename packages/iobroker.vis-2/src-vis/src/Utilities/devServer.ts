/**
 * Whether this page comes from the development server, and which ioBroker it was started against.
 *
 * In production the app is served by the web adapter, beside the data it works with: everything is a
 * relative path and the socket needs no address. On the development server vite serves the page and
 * ioBroker serves everything else, so the two have to be told apart - and that is not the same question as
 * "is this a build", because `vite preview` serves a build the very same way.
 *
 * Which ioBroker is asked is said once, when the server is started:
 *
 * ```
 * npm run start                                        # web on 8082
 * IOB_URL=http://localhost:8081 npm run start          # the admin instead, e.g. where web wants a login
 * VIS_PORT=3005 npm run start                          # on another port, if 3000 is taken
 * ```
 *
 * `vite.config.ts` writes that address into the page as `window.visDevBackend`; a preview, which has no
 * server to write it, falls back to the port it is usually started on.
 */

/** The ports the development server and its preview are started on */
const DEV_PORTS = /^(3\d{3}|4173|5173)$/;

/** Where ioBroker is, as `http://host:port`, or an empty string where the page comes from it anyway */
export function devBackend(): string {
    const configured =
        window.visDevBackend ||
        // a preview serves the build without a server of its own to say it, so the usual web adapter is assumed
        (DEV_PORTS.test(window.location.port) ? `${window.location.protocol}//${window.location.hostname}:8082` : '');

    if (!configured) {
        return '';
    }

    const url = new URL(configured);
    // a loopback address says where ioBroker is as seen from the dev server, and the page is not always looked
    // at there: a tablet that opens the editor over the network has to ask that machine, not itself
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        url.hostname = window.location.hostname;
    }

    return url.origin;
}

/** The page is served by the development server or its preview, not by the web adapter */
export function isDevServer(): boolean {
    return !!devBackend();
}

/** The host and the port of that ioBroker, for the socket, or null where there is nothing to say */
export function devSocketAddress(): { host: string; port: string } | null {
    const backend = devBackend();
    if (!backend) {
        return null;
    }
    const url = new URL(backend);

    return { host: url.hostname, port: url.port || (url.protocol === 'https:' ? '443' : '80') };
}
