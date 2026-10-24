/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

interface ControlSocket {
    subscribeState(id: string, cb: ioBroker.StateChangeHandler): Promise<void>;
    unsubscribeState(id: string, cb: ioBroker.StateChangeHandler): void;
}

/**
 * Tells the states of the control interface (`control.command`, `control.data`, `control.instance`) that were set
 * now from the values they already had.
 *
 * Subscribing hands over the value a state has before it resolves, and an old command must not run again. That was
 * decided by `Date.now() - state.ts > 5000`, which compares the clock of the browser with the one of the server: a
 * phone or a tablet whose clock is some seconds off ignored every command (#487, #481, #611). No clock decides now:
 * what comes before the subscription resolved is the value the state had, everything after it was set since. A
 * reconnect subscribes again without reading the values.
 */
export class VisControlStates {
    private readonly subscribed = new Set<string>();

    constructor(private readonly socket: ControlSocket) {}

    async subscribe(id: string, cb: ioBroker.StateChangeHandler): Promise<void> {
        await this.socket.subscribeState(id, cb);
        this.subscribed.add(id);
    }

    unsubscribe(id: string, cb: ioBroker.StateChangeHandler): void {
        this.subscribed.delete(id);
        this.socket.unsubscribeState(id, cb);
    }

    /**
     * @param id - the id of the state
     * @returns false for the value the state had when the runtime subscribed
     */
    isNew(id: string): boolean {
        return this.subscribed.has(id);
    }
}
