/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

/**
 * Reloads the runtime after the device slept.
 *
 * A tablet on the wall turns its screen off, and the browser stops the page. When it wakes up, the page works off
 * every state change it missed, and is slow for many seconds (#339). After a sleep longer than the time of the
 * project settings, a reload is faster: the page reads the states once.
 */

/** The project setting */
export interface SleepReloadSettings {
    /** After a sleep of how many seconds the runtime reloads; nothing or 0 for never */
    reloadOnSleep?: number | string | null;
}

/** The shortest sleep that reloads: a page that only was busy for some seconds must not reload, nor a slow start */
export const MIN_SLEEP_RELOAD = 30;

/** How often the page looks whether it is awake */
const CHECK_INTERVAL = 2_500;

/** How long it waits until it looks again whether the server answers */
const RETRY_INTERVAL = 5_000;

/**
 * @param settings - the settings of the project
 * @returns after a sleep of how many milliseconds the runtime reloads, or 0 for never
 */
export function getSleepReloadDelay(settings: SleepReloadSettings | null | undefined): number {
    const seconds = parseFloat(settings?.reloadOnSleep as string);
    if (!(seconds > 0)) {
        return 0;
    }
    return Math.max(seconds, MIN_SLEEP_RELOAD) * 1000;
}

/** Whether the server answers: right after waking up, the Wi-Fi may not be there yet, and a reload would end on an error page */
async function isServerReachable(): Promise<boolean> {
    try {
        const response = await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
        return response.ok;
    } catch {
        return false;
    }
}

export interface SleepReloadOptions {
    /** After a sleep of how many milliseconds to reload, read at every check; 0 for never */
    getDelay: () => number;
    reload: () => void;
    isReachable?: () => Promise<boolean>;
    /** Whether the page is not shown: in the background, or with the screen off */
    isHidden?: () => boolean;
    /** Where `visibilitychange` comes from */
    target?: EventTarget;
}

/**
 * Measures how long the page slept: the time since it was last seen awake and shown. A page in the background is
 * not looked at, as the browser runs its timers seldom there; when it is shown again, the whole time counts.
 */
export class SleepReload {
    private readonly options: SleepReloadOptions;

    private interval: ReturnType<typeof setInterval> | null = null;

    private retryTimer: ReturnType<typeof setTimeout> | null = null;

    private lastAwake = Date.now();

    private reloading = false;

    constructor(options: SleepReloadOptions) {
        this.options = options;
    }

    start(): void {
        this.lastAwake = Date.now();
        this.interval ||= setInterval(this.check, CHECK_INTERVAL);
        (this.options.target || document).addEventListener('visibilitychange', this.check);
    }

    stop(): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
        (this.options.target || document).removeEventListener('visibilitychange', this.check);
    }

    private check = (): void => {
        if (this.options.isHidden ? this.options.isHidden() : document.hidden) {
            return;
        }
        const now = Date.now();
        const slept = now - this.lastAwake;
        this.lastAwake = now;
        const delay = this.options.getDelay();
        if (delay && slept > delay) {
            void this.reloadWhenReachable();
        }
    };

    private async reloadWhenReachable(): Promise<void> {
        if (this.reloading) {
            return;
        }
        this.reloading = true;
        if (await (this.options.isReachable || isServerReachable)()) {
            this.options.reload();
            return;
        }
        // try again until the server answers
        this.retryTimer = setTimeout(() => {
            this.retryTimer = null;
            this.reloading = false;
            void this.reloadWhenReachable();
        }, RETRY_INTERVAL);
    }
}
