/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

import type { ThemeType } from '@iobroker/gui-components';

interface ManifestOptions {
    title: string;
    /** The favicon, relative to the page */
    icon: string;
    themeType: ThemeType;
}

/**
 * The web app manifest of the page: a shortcut on the home screen of a phone opens its `start_url`.
 *
 * The manifest is a blob, and a relative address in it is taken relative to the page, so `start_url: '.'` made of
 * `/vis-2/?project#view` just `/vis-2/`: the shortcut opened the default project instead of the one it was made of
 * (#102). The addresses are absolute now, and `start_url` is the page with its project and its view.
 *
 * @param options - title, icon and theme of the project
 * @param href - the address of the page
 * @returns the manifest
 */
export function getManifest(options: ManifestOptions, href: string): Record<string, unknown> {
    return {
        short_name: options.title,
        name: options.title,
        icons: [
            {
                src: new URL(options.icon, href).href,
                sizes: '64x64 32x32 24x24 16x16',
                type: 'image/x-icon',
            },
        ],
        start_url: href,
        display: 'standalone',
        theme_color: options.themeType === 'dark' ? 'rgb(51, 51, 51)' : 'rgb(230, 230, 230)',
        background_color: options.themeType === 'dark' ? '#000' : '#FFF',
    };
}

let manifestOptions: ManifestOptions | null = null;
let manifestUrl: string | null = null;

function writeManifest(): void {
    if (!manifestOptions) {
        return;
    }
    const blob = new Blob([JSON.stringify(getManifest(manifestOptions, window.location.href))], {
        type: 'application/json',
    });
    if (manifestUrl) {
        URL.revokeObjectURL(manifestUrl);
    }
    manifestUrl = URL.createObjectURL(blob);
    document.querySelector('#vis-manifest')?.setAttribute('href', manifestUrl);
}

/**
 * Gives the page the manifest of the project, and keeps its `start_url` on the view that is shown.
 *
 * @param options - title, icon and theme of the project
 */
export function applyManifest(options: ManifestOptions): void {
    if (!manifestOptions) {
        window.addEventListener('hashchange', writeManifest);
    }
    manifestOptions = options;
    writeManifest();
}
