import { describe, expect, it } from 'vitest';

import { VisControlStates } from './visControlState';

const ID = 'vis-2.0.control.command';

/** Hands over the value of the state on subscribing, like the socket of the runtime */
class FakeSocket {
    handlers = new Map<string, ioBroker.StateChangeHandler>();

    subscribeState(id: string, cb: ioBroker.StateChangeHandler): Promise<void> {
        this.handlers.set(id, cb);
        void cb(id, { val: 'reload', ack: false, ts: 1, lc: 1, from: 'system.adapter.javascript.0', q: 0 });
        return Promise.resolve();
    }

    unsubscribeState(id: string): void {
        this.handlers.delete(id);
    }

    set(id: string, val: string, ts: number): void {
        void this.handlers.get(id)?.(id, { val, ack: false, ts, lc: ts, from: 'system.adapter.javascript.0', q: 0 });
    }
}

function listen(): { socket: FakeSocket; states: VisControlStates; seen: [string, boolean][] } {
    const socket = new FakeSocket();
    const states = new VisControlStates(socket);
    const seen: [string, boolean][] = [];
    void states.subscribe(ID, (id, state) => {
        seen.push([state?.val as string, states.isNew(id)]);
    });
    return { socket, states, seen };
}

describe('VisControlStates', () => {
    it('does not run the command the state had when the runtime subscribed', () => {
        expect(listen().seen).toEqual([['reload', false]]);
    });

    // #487: the clock of a phone may be some seconds off the one of the server
    it('runs a command that was set since, whatever its time says', async () => {
        const { socket, seen } = listen();
        await Promise.resolve();
        socket.set(ID, 'changeView', Date.now() - 60_000);
        expect(seen).toEqual([
            ['reload', false],
            ['changeView', true],
        ]);
    });

    it('tells the states apart', async () => {
        const { states } = listen();
        await Promise.resolve();
        expect(states.isNew(ID)).toBe(true);
        expect(states.isNew('vis-2.0.control.data')).toBe(false);
    });

    it('forgets a state it no longer listens to', async () => {
        const { states } = listen();
        await Promise.resolve();
        states.unsubscribe(ID, () => {});
        expect(states.isNew(ID)).toBe(false);
    });
});
