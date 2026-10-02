import { describe, it, expect, afterEach } from 'vitest';

import { devBackend, devSocketAddress, isDevServer } from './devServer';

/** Pretend the page is served from `url`, with `visDevBackend` written into it or not */
function page(url: string, visDevBackend?: string): void {
    const { protocol, hostname, port } = new URL(url);
    (globalThis as any).window = { location: { protocol, hostname, port }, visDevBackend };
}

afterEach(() => {
    delete (globalThis as any).window;
});

describe('devServer', () => {
    it('says nothing where the web adapter serves the page itself', () => {
        page('http://192.168.178.45:8082/vis-2/index.html');

        expect(devBackend()).toBe('');
        expect(isDevServer()).toBe(false);
        expect(devSocketAddress()).toBe(null);
    });

    it('takes the address the dev server wrote into the page, whatever port either runs on', () => {
        page('http://localhost:3005/edit.html', 'http://localhost:8081');

        expect(devBackend()).toBe('http://localhost:8081');
        expect(isDevServer()).toBe(true);
        expect(devSocketAddress()).toEqual({ host: 'localhost', port: '8081' });
    });

    it('asks the machine the dev server runs on, not the tablet that looks at the page', () => {
        page('http://192.168.178.45:3000/edit.html', 'http://127.0.0.1:8082');

        expect(devSocketAddress()).toEqual({ host: '192.168.178.45', port: '8082' });
    });

    it('leaves an address that names a machine alone', () => {
        page('http://localhost:3000/edit.html', 'http://192.168.178.10:8082');

        expect(devSocketAddress()).toEqual({ host: '192.168.178.10', port: '8082' });
    });

    it('fills in the port of https, which the address may leave out', () => {
        page('http://localhost:3000/edit.html', 'https://iobroker.example.com');

        expect(devSocketAddress()).toEqual({ host: 'iobroker.example.com', port: '443' });
    });

    it('falls back to the web adapter for a preview, which has no server to say it', () => {
        page('http://localhost:4173/edit.html');

        expect(devBackend()).toBe('http://localhost:8082');
        expect(isDevServer()).toBe(true);
    });
});
