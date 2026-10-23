import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getIdleDelay, IdleView, type IdleViewSettings } from './visIdleView';

const VIEWS = ['home', 'kitchen', 'garden'];

describe('getIdleDelay', () => {
    it('gives the time in milliseconds', () => {
        expect(getIdleDelay({ idleView: 'home', idleTimeout: 60 }, 'kitchen', VIEWS)).toBe(60_000);
        // the dialog of the settings saves the number as text
        expect(getIdleDelay({ idleView: 'home', idleTimeout: '1.5' }, 'kitchen', VIEWS)).toBe(1_500);
    });

    it('does not go back if the view is open already', () => {
        expect(getIdleDelay({ idleView: 'home', idleTimeout: 60 }, 'home', VIEWS)).toBe(0);
    });

    it('does not go back without a view, without a time, or to a view that does not exist', () => {
        expect(getIdleDelay({ idleTimeout: 60 }, 'kitchen', VIEWS)).toBe(0);
        expect(getIdleDelay({ idleView: 'home' }, 'kitchen', VIEWS)).toBe(0);
        expect(getIdleDelay({ idleView: 'home', idleTimeout: 0 }, 'kitchen', VIEWS)).toBe(0);
        expect(getIdleDelay({ idleView: 'home', idleTimeout: -5 }, 'kitchen', VIEWS)).toBe(0);
        expect(getIdleDelay({ idleView: 'home', idleTimeout: '' }, 'kitchen', VIEWS)).toBe(0);
        expect(getIdleDelay({ idleView: 'cellar', idleTimeout: 60 }, 'kitchen', VIEWS)).toBe(0);
        expect(getIdleDelay(undefined, 'kitchen', VIEWS)).toBe(0);
    });
});

describe('IdleView', () => {
    let target: EventTarget;
    let view: string;
    let active: boolean;
    let settings: IdleViewSettings;
    let opened: string[];
    let idle: IdleView;

    beforeEach(() => {
        vi.useFakeTimers();
        target = new EventTarget();
        view = 'kitchen';
        active = true;
        settings = { idleView: 'home', idleTimeout: 30 };
        opened = [];
        idle = new IdleView({
            getState: () => ({ settings, view, views: VIEWS, active }),
            onIdle: newView => {
                opened.push(newView);
                view = newView;
            },
            target,
        });
    });

    afterEach(() => {
        idle.stop();
        vi.useRealTimers();
    });

    it('goes back to the view after the time without input', () => {
        idle.start();
        vi.advanceTimersByTime(29_999);
        expect(opened).toEqual([]);
        vi.advanceTimersByTime(1);
        expect(opened).toEqual(['home']);
    });

    // #13: every key press starts the time anew
    it('starts the time anew at every input', () => {
        idle.start();
        for (const event of ['keydown', 'pointerdown', 'wheel', 'keydown']) {
            vi.advanceTimersByTime(20_000);
            target.dispatchEvent(new Event(event));
        }
        vi.advanceTimersByTime(29_999);
        expect(opened).toEqual([]);
        vi.advanceTimersByTime(1);
        expect(opened).toEqual(['home']);
    });

    it('does not count moving the mouse as input', () => {
        idle.start();
        vi.advanceTimersByTime(20_000);
        target.dispatchEvent(new Event('pointermove'));
        vi.advanceTimersByTime(10_000);
        expect(opened).toEqual(['home']);
    });

    it('does not go back once it is there, until another view is opened', () => {
        idle.start();
        vi.advanceTimersByTime(30_000);
        target.dispatchEvent(new Event('keydown'));
        vi.advanceTimersByTime(60_000);
        expect(opened).toEqual(['home']);

        view = 'garden';
        idle.restart();
        vi.advanceTimersByTime(30_000);
        expect(opened).toEqual(['home', 'home']);
    });

    it('does nothing in the editor', () => {
        active = false;
        idle.start();
        vi.advanceTimersByTime(60_000);
        expect(opened).toEqual([]);
    });

    it('takes a changed setting from the next input on', () => {
        idle.start();
        settings = { idleView: 'garden', idleTimeout: 5 };
        target.dispatchEvent(new Event('keydown'));
        vi.advanceTimersByTime(5_000);
        expect(opened).toEqual(['garden']);
    });

    it('stops listening and going back when stopped', () => {
        idle.start();
        idle.stop();
        target.dispatchEvent(new Event('keydown'));
        vi.advanceTimersByTime(60_000);
        expect(opened).toEqual([]);
    });
});
