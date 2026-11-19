import { describe, expect, it, vi } from 'vitest';

import { legacySocketEmit } from './visLegacySocket';

function createSocket(sendTo: (...args: any[]) => Promise<any> = () => Promise.resolve({ ok: true })): any {
    return {
        getObject: vi.fn((id: string) => Promise.resolve({ _id: id })),
        getState: vi.fn(() => Promise.resolve({ val: 1 })),
        getStates: vi.fn(() => Promise.resolve({})),
        sendTo: vi.fn(sendTo),
    };
}

describe('legacySocketEmit', () => {
    it('forwards sendTo to the connection and calls back with the result (#749)', async () => {
        const socket = createSocket();
        const cb = vi.fn();
        legacySocketEmit(socket, 'sendTo', 'schedule-switcher', 'add-trigger', { a: 1 }, cb);
        expect(socket.sendTo).toHaveBeenCalledWith('schedule-switcher', 'add-trigger', { a: 1 });
        await vi.waitFor(() => expect(cb).toHaveBeenCalledWith({ ok: true }));
    });

    it('works without a callback', () => {
        const socket = createSocket();
        expect(() => legacySocketEmit(socket, 'sendTo', 'schedule-switcher', 'cmd', { a: 1 })).not.toThrow();
        expect(socket.sendTo).toHaveBeenCalledWith('schedule-switcher', 'cmd', { a: 1 });
    });

    it('takes a function as message as the callback', async () => {
        const socket = createSocket();
        const cb = vi.fn();
        legacySocketEmit(socket, 'sendTo', 'admin.0', 'cmd', cb);
        expect(socket.sendTo).toHaveBeenCalledWith('admin.0', 'cmd', undefined);
        await vi.waitFor(() => expect(cb).toHaveBeenCalledWith({ ok: true }));
    });

    it('calls back with the error if sendTo fails', async () => {
        const error = new Error('no instance');
        const socket = createSocket(() => Promise.reject(error));
        const cb = vi.fn();
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        legacySocketEmit(socket, 'sendTo', 'admin.0', 'cmd', {}, cb);
        await vi.waitFor(() => expect(cb).toHaveBeenCalledWith({ error }));
        expect(consoleError).toHaveBeenCalled();
        consoleError.mockRestore();
    });

    it('still answers getObject with (error, result)', async () => {
        const socket = createSocket();
        const cb = vi.fn();
        legacySocketEmit(socket, 'getObject', 'system.config', cb);
        await vi.waitFor(() => expect(cb).toHaveBeenCalledWith(null, { _id: 'system.config' }));
    });

    it('throws on unknown commands, so the fallbacks of the widget sets work (#749)', () => {
        const socket = createSocket();
        expect(() => legacySocketEmit(socket, 'unknownCommand', 'x')).toThrow(
            'Unknown command in _socket.emit: unknownCommand',
        );
    });
});
