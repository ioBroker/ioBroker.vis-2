/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

/** The project settings that send the runtime back to a view after a time without input (#13) */
export interface IdleViewSettings {
    /** The view to go back to */
    idleView?: string;
    /** After how many seconds without input */
    idleTimeout?: number | string | null;
}

/**
 * What counts as input. Every one of them starts the time anew: a key, a click or a touch, and the wheel.
 * Moving the mouse alone does not, so a panel on the wall goes back even if the mouse lies on its edge.
 */
export const IDLE_INPUT_EVENTS = ['pointerdown', 'keydown', 'wheel'] as const;

/**
 * After how many milliseconds without input the runtime goes back to the view of the settings.
 *
 * @param settings - the settings of the project
 * @param view - the view that is open
 * @param views - the views of the project
 * @returns the time, or 0 if it does not go back: nothing set, the view does not exist, or it is open already
 */
export function getIdleDelay(settings: IdleViewSettings | null | undefined, view: string, views: string[]): number {
    const seconds = parseFloat(settings?.idleTimeout as string);
    const idleView = settings?.idleView;
    if (!(seconds > 0) || !idleView || idleView === view || !views.includes(idleView)) {
        return 0;
    }
    return seconds * 1000;
}

export interface IdleViewOptions {
    /** What decides the time, read anew at every start: so a changed setting counts from the next input */
    getState: () => {
        settings: IdleViewSettings | null | undefined;
        view: string;
        views: string[];
        /** The runtime only: the editor does not change the view by itself */
        active: boolean;
    };
    /** Opens the view */
    onIdle: (view: string) => void;
    /** Where the input is listened to */
    target?: EventTarget;
}

/** Goes back to a view after a time without input. Every input starts the time anew. */
export class IdleView {
    private timer: ReturnType<typeof setTimeout> | null = null;

    private readonly options: IdleViewOptions;

    private readonly target: EventTarget;

    constructor(options: IdleViewOptions) {
        this.options = options;
        this.target = options.target || window;
    }

    /** Listens to the input and starts the time */
    start(): void {
        // in the capture phase: a widget that stops the event must not hide the input
        IDLE_INPUT_EVENTS.forEach(event =>
            this.target.addEventListener(event, this.restart, { capture: true, passive: true }),
        );
        this.restart();
    }

    stop(): void {
        IDLE_INPUT_EVENTS.forEach(event => this.target.removeEventListener(event, this.restart, { capture: true }));
        this.clear();
    }

    /** Starts the time anew: at every input, and when another view was opened */
    restart = (): void => {
        this.clear();
        const { settings, view, views, active } = this.options.getState();
        const delay = active ? getIdleDelay(settings, view, views) : 0;
        if (delay) {
            this.timer = setTimeout(() => {
                this.timer = null;
                this.options.onIdle(settings!.idleView!);
            }, delay);
        }
    };

    private clear(): void {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}
