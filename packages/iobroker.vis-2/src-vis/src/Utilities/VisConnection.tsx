import { LegacyConnection } from '@iobroker/adapter-react-v5';

/** What the ioBroker cloud answers to every request while the ioBroker of the user is not connected to it */
const CLOUD_NOT_CONNECTED = 'ioBroker is not connected';
/** How often the version is asked again while the ioBroker of the user is not connected to the cloud */
const CLOUD_RETRY_INTERVAL = 5000;

type VersionInfo = { version: string; serverName: string };

/**
 * The connection of vis-2.
 *
 * On every connect, LegacyConnection asks for the version of the server and authenticates only after the answer. It
 * keeps the promise of this request even if it failed, and it does not catch its rejection. The ioBroker cloud answers
 * every request with "ioBroker is not connected" while the ioBroker of the user is away from it, e.g. during a restart.
 * vis-2 opened in that moment logged `Uncaught (in promise) Error: ioBroker is not connected`, and as every later
 * connect got the same failed promise, it stayed on the loading screen until the page was reloaded.
 */
export default class VisConnection extends LegacyConnection {
    private versionRequest: Promise<VersionInfo> | null = null;

    /**
     * Gets the version of the server.
     *
     * While the ioBroker of the user is not connected to the cloud, the version is asked again every few seconds.
     * A failed request is not kept, so the next call asks anew. A request still open when the socket disconnects
     * never settles: its answer is lost with the connection, and LegacyConnection asks anew after the reconnect.
     *
     * @param update ask the server even if the version was already requested
     */
    getVersion(update?: boolean): Promise<VersionInfo> {
        if (!update && this.versionRequest instanceof Promise) {
            return this.versionRequest;
        }

        const socket = this.getRawSocket();

        const request = new Promise<VersionInfo>((resolve, reject) => {
            let retryTimer: ReturnType<typeof setTimeout> | null = null;
            let dropped = false;
            let warned = false;

            const forget = (): void => {
                if (this.versionRequest === request) {
                    this.versionRequest = null;
                }
            };

            const onDisconnect = (): void => {
                dropped = true;
                if (retryTimer) {
                    clearTimeout(retryTimer);
                    retryTimer = null;
                }
                // Not at once: the ws client of ioBroker runs the handlers directly from its array,
                // removing one of them during the run would skip the next one
                setTimeout(() => socket.off('disconnect', onDisconnect), 0);
                forget();
            };

            const ask = (): void => {
                retryTimer = null;
                socket.emit('getVersion', (err: string | null | undefined, version: string, serverName: string) => {
                    if (dropped) {
                        return;
                    }
                    if (err === CLOUD_NOT_CONNECTED) {
                        if (!warned) {
                            warned = true;
                            console.warn('ioBroker is not connected to the cloud. Waiting for it...');
                        }
                        retryTimer = setTimeout(ask, CLOUD_RETRY_INTERVAL);
                        return;
                    }

                    socket.off('disconnect', onDisconnect);

                    // Old socket.io had no error parameter
                    if (err && !version && typeof err === 'string' && err.match(/\d+\.\d+\.\d+/)) {
                        resolve({ version: err, serverName: 'socketio' });
                    } else if (err) {
                        forget();
                        reject(new Error(err));
                    } else {
                        resolve({ version, serverName });
                    }
                });
            };

            socket.on('disconnect', onDisconnect);
            ask();
        });

        this.versionRequest = request;

        return request;
    }
}
