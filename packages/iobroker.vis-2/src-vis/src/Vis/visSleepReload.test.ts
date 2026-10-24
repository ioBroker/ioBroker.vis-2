import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSleepReloadDelay, SleepReload } from './visSleepReload';

describe('getSleepReloadDelay', () => {
    it('never reloads without a time', () => {
        expect(getSleepReloadDelay(undefined)).toBe(0);
        expect(getSleepReloadDelay({})).toBe(0);
        expect(getSleepReloadDelay({ reloadOnSleep: 0 })).toBe(0);
        expect(getSleepReloadDelay({ reloadOnSleep: '' })).toBe(0);
    });

    it('takes the seconds, but not less than 30', () => {
        expect(getSleepReloadDelay({ reloadOnSleep: 300 })).toBe(300_000);
        expect(getSleepReloadDelay({ reloadOnSleep: '60' })).toBe(60_000);
        expect(getSleepReloadDelay({ reloadOnSleep: 5 })).toBe(30_000);
    });
});

describe('SleepReload', () => {
    let hidden: boolean;
    let reachable: boolean;
    let target: EventTarget;
    let reload: ReturnType<typeof vi.fn<() => void>>;
    let sleepReload: SleepReload;

    beforeEach(() => {
        vi.useFakeTimers();
        hidden = false;
        reachable = true;
        target = new EventTarget();
        reload = vi.fn<() => void>();
        sleepReload = new SleepReload({
            getDelay: () => 60_000,
            reload,
            isReachable: () => Promise.resolve(reachable),
            isHidden: () => hidden,
            target,
        });
        sleepReload.start();
    });

    afterEach(() => {
        sleepReload.stop();
        vi.useRealTimers();
    });

    /** The browser stops the page: no timer runs, but the clock goes on */
    function sleep(ms: number): void {
        vi.setSystemTime(Date.now() + ms);
    }

    it('does not reload a page that is awake', async () => {
        await vi.advanceTimersByTimeAsync(10 * 60_000);
        expect(reload).not.toHaveBeenCalled();
    });

    // #339
    it('reloads after a sleep longer than the time', async () => {
        sleep(5 * 60_000);
        await vi.advanceTimersByTimeAsync(2_500);
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('does not reload after a shorter sleep', async () => {
        sleep(50_000);
        await vi.advanceTimersByTimeAsync(2_500);
        expect(reload).not.toHaveBeenCalled();
    });

    it('counts the time in the background when the page is shown again', async () => {
        hidden = true;
        await vi.advanceTimersByTimeAsync(5 * 60_000);
        expect(reload).not.toHaveBeenCalled();

        hidden = false;
        target.dispatchEvent(new Event('visibilitychange'));
        await vi.advanceTimersByTimeAsync(0);
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('waits for the server before it reloads', async () => {
        reachable = false;
        sleep(5 * 60_000);
        await vi.advanceTimersByTimeAsync(2_500);
        expect(reload).not.toHaveBeenCalled();

        reachable = true;
        await vi.advanceTimersByTimeAsync(5_000);
        expect(reload).toHaveBeenCalledTimes(1);
    });
});
