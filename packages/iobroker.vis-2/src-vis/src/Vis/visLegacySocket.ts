import type { Connection } from '@iobroker/gui-components';

/**
 * `servConn._socket.emit` of vis-1 for the widget sets and scripts written for vis-1.
 * Unknown commands throw, so widget sets that fall back to another path on an error keep working (#749).
 */
export function legacySocketEmit(
    socket: Pick<Connection, 'getObject' | 'getState' | 'getStates' | 'sendTo'>,
    cmd: string,
    ...args: any[]
): void {
    if (cmd === 'sendTo') {
        // emit('sendTo', instance, command, message, cb) - message may be omitted: emit('sendTo', instance, command, cb)
        const [instance, command] = args as [string, string];
        let [, , message, cb] = args as [string, string, any, ((result: any) => void) | undefined];
        if (typeof message === 'function') {
            cb = message;
            message = undefined;
        }
        socket
            .sendTo(instance, command, message)
            .then(result => cb?.(result))
            .catch(error => {
                console.error(`Cannot send "${command}" to "${instance}": ${error}`);
                cb?.({ error });
            });
        return;
    }

    const [data, cb] = args as [any, ((error: Error | null, result?: any) => void) | undefined];
    let promise: Promise<any>;
    if (cmd === 'getObject') {
        promise = socket.getObject(data);
    } else if (cmd === 'getState') {
        promise = socket.getState(data);
    } else if (cmd === 'getStates') {
        promise = socket.getStates(data);
    } else {
        throw new Error(`Unknown command in _socket.emit: ${cmd}`);
    }
    promise.then(obj => cb?.(null, obj)).catch(error => cb?.(error));
}
