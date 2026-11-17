import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getHashOfPageLink, getViewOfHash, isViewHash, setLocationHash, type HashWindow } from './visLocationHash';

const PAGE = 'http://192.168.68.10:8082/vis-2/index.html?main#Main';

/** A window whose address changes with pushState, and which records what it was sent */
function createWindow(href = PAGE): HashWindow & { events: Event[]; pushes: string[] } {
    const win = {
        events: [] as Event[],
        pushes: [] as string[],
        location: { href },
        history: {
            state: { idx: 1 } as unknown,
            pushState(_data: unknown, _unused: string, url?: string | null): void {
                win.pushes.push(url as string);
                win.location.href = url as string;
            },
        },
        dispatchEvent(event: Event): boolean {
            win.events.push(event);
            return true;
        },
    };
    return win;
}

describe('setLocationHash', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    // #743: location.hash = ... is a navigation, which made Safari load the whole page again
    it('changes the address with pushState, not with a navigation', () => {
        const win = createWindow();
        setLocationHash('#KG', win);
        expect(win.pushes).toEqual(['http://192.168.68.10:8082/vis-2/index.html?main#KG']);
        expect(win.location.href).toBe('http://192.168.68.10:8082/vis-2/index.html?main#KG');
    });

    it('sends hashchange afterwards, like the browser does', () => {
        const win = createWindow();
        setLocationHash('#KG', win);
        expect(win.events).toEqual([]);

        vi.runAllTimers();
        expect(win.events).toHaveLength(1);
        const event = win.events[0] as Event & { oldURL: string; newURL: string };
        expect(event.type).toBe('hashchange');
        expect(event.oldURL).toBe(PAGE);
        expect(event.newURL).toBe('http://192.168.68.10:8082/vis-2/index.html?main#KG');
    });

    it('does nothing if the hash is already there, also when written another way', () => {
        const win = createWindow('http://host:8082/vis-2/#B%C3%BCro');
        setLocationHash('#B%C3%BCro', win);
        setLocationHash('#Büro', win);
        vi.runAllTimers();
        expect(win.pushes).toEqual([]);
        expect(win.events).toEqual([]);
    });

    it('takes a hash without "#" and a path in the view', () => {
        const win = createWindow();
        setLocationHash('Cupra%20Born/settings', win);
        expect(win.location.href).toBe('http://192.168.68.10:8082/vis-2/index.html?main#Cupra%20Born/settings');
    });

    it('keeps the state of the history entry', () => {
        const win = createWindow();
        const pushState = vi.spyOn(win.history, 'pushState');
        setLocationHash('#KG', win);
        expect(pushState).toHaveBeenCalledWith({ idx: 1 }, '', 'http://192.168.68.10:8082/vis-2/index.html?main#KG');
    });

    it('navigates if the history may not be changed', () => {
        const win = createWindow();
        win.history.pushState = () => {
            throw new Error('SecurityError');
        };
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        setLocationHash('#KG', win);
        vi.runAllTimers();
        expect(win.location.href).toBe('http://192.168.68.10:8082/vis-2/index.html?main#KG');
        expect(win.events).toEqual([]);
        warn.mockRestore();
    });
});

describe('getHashOfPageLink', () => {
    it('gives the hash of a link to this page', () => {
        expect(getHashOfPageLink('http://192.168.68.10:8082/vis-2/index.html?main#EG', PAGE)).toBe('#EG');
    });

    it('gives nothing for a link to the hash the page already has', () => {
        expect(getHashOfPageLink(PAGE, PAGE)).toBeNull();
    });

    it('gives nothing for a link to another page, project, server or without a hash', () => {
        expect(getHashOfPageLink('http://192.168.68.10:8082/vis-2/edit.html?main#EG', PAGE)).toBeNull();
        expect(getHashOfPageLink('http://192.168.68.10:8082/vis-2/index.html?other#EG', PAGE)).toBeNull();
        expect(getHashOfPageLink('http://192.168.68.11:8082/vis-2/index.html?main#EG', PAGE)).toBeNull();
        expect(getHashOfPageLink('http://192.168.68.10:8082/vis-2/index.html?main', PAGE)).toBeNull();
        expect(getHashOfPageLink('mailto:me@example.com', PAGE)).toBeNull();
    });
});

describe('getViewOfHash / isViewHash', () => {
    const project = { ___settings: {}, Main: {}, 'Cupra Born': {}, Büro: {} };

    it('reads the view out of the hash', () => {
        expect(getViewOfHash('#Cupra%20Born/settings')).toBe('Cupra Born');
        expect(getViewOfHash('#B%C3%BCro')).toBe('Büro');
        expect(getViewOfHash('#%E0%A4%A')).toBe('%E0%A4%A');
    });

    it('knows the views of the project', () => {
        expect(isViewHash('#Main', project)).toBe(true);
        expect(isViewHash('#Cupra%20Born', project)).toBe(true);
        expect(isViewHash('#B%C3%BCro/x', project)).toBe(true);
    });

    // a link to a place on the page stays a link of the browser
    it('leaves other hashes alone', () => {
        expect(isViewHash('#top', project)).toBe(false);
        expect(isViewHash('#___settings', project)).toBe(false);
        expect(isViewHash('#', project)).toBe(false);
        expect(isViewHash('Main', project)).toBe(false);
        expect(isViewHash('#Main', null)).toBe(false);
    });
});
