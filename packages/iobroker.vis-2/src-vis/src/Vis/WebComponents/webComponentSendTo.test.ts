import { afterEach, describe, expect, it, vi } from 'vitest';

import { getSendToRequest, type WebComponentSetting } from '@iobroker/web-components';

import {
    askSendToOptions,
    autocompleteValue,
    findSendToOption,
    mergeSendToOptions,
    SEND_TO_TIMEOUT,
} from './webComponentSendTo';

const REQUEST = { instance: 'demo.0', command: 'getLocations', data: { days: 3 }, key: 'k1' };

describe('askSendToOptions', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('asks the instance and takes the answer as the options', async () => {
        const sendTo = vi
            .fn()
            .mockResolvedValue([
                { value: 'b', label: { en: 'Berlin', de: 'Berlin' } },
                { value: 2, label: 'Two' },
                'plain',
                { label: 'no value' },
            ]);
        const answer = await askSendToOptions(REQUEST, sendTo);
        expect(sendTo).toHaveBeenCalledWith('demo.0', 'getLocations', { days: 3 });
        expect(answer).toEqual({
            key: 'k1',
            options: [
                { value: 'b', label: { en: 'Berlin', de: 'Berlin' } },
                { value: 2, label: 'Two' },
                { value: 'plain', label: 'plain' },
            ],
        });
    });

    it('takes an error, or an answer that is no list, as no answer', async () => {
        expect(await askSendToOptions(REQUEST, vi.fn().mockRejectedValue(new Error('down')))).toEqual({
            key: 'k1',
            options: null,
        });
        expect(await askSendToOptions(REQUEST, vi.fn().mockResolvedValue({ error: 'unknown command' }))).toEqual({
            key: 'k1',
            options: null,
        });
        // an empty list is an answer: the instance has nothing to offer
        expect(await askSendToOptions(REQUEST, vi.fn().mockResolvedValue([]))).toEqual({ key: 'k1', options: [] });
    });

    it('gives up after the timeout', async () => {
        vi.useFakeTimers();
        const pending = askSendToOptions(REQUEST, () => new Promise(() => {}));
        await vi.advanceTimersByTimeAsync(SEND_TO_TIMEOUT);
        expect(await pending).toEqual({ key: 'k1', options: null });
    });

    it('sends what getSendToRequest of the contract makes of the setting', async () => {
        const setting: WebComponentSetting = {
            type: 'selectSendTo',
            command: 'getLocations',
            instance: '${data.instance}',
            jsonData: '{ "days": ${data.days} }',
        };
        // no instance chosen yet: nothing to ask
        expect(getSendToRequest(setting, {}, 'demo')).toBeNull();
        const request = getSendToRequest(setting, { instance: 'system.adapter.demo.1', days: 3 }, 'demo')!;
        const sendTo = vi.fn().mockResolvedValue([]);
        await askSendToOptions(request, sendTo);
        expect(sendTo).toHaveBeenCalledWith('demo.1', 'getLocations', { days: 3 });
        // without instance the first instance of the adapter of the component; no adapter, nothing to ask
        expect(getSendToRequest({ type: 'autocompleteSendTo' }, {}, 'demo')).toMatchObject({
            instance: 'demo.0',
            command: 'send',
        });
        expect(getSendToRequest({ type: 'autocompleteSendTo' }, {}, '')).toBeNull();
    });
});

describe('mergeSendToOptions', () => {
    it('puts the options of the manifest behind those of the instance, without doubles', () => {
        expect(
            mergeSendToOptions(
                [{ value: 'a', label: 'A' }],
                [
                    { value: 'a', label: 'A fixed' },
                    { value: 'z', label: 'Z' },
                ],
            ),
        ).toEqual([
            { value: 'a', label: 'A' },
            { value: 'z', label: 'Z' },
        ]);
        expect(mergeSendToOptions([{ value: 1, label: 'One' }], undefined)).toEqual([{ value: 1, label: 'One' }]);
    });
});

describe('findSendToOption and autocompleteValue', () => {
    const OPTIONS = [
        { value: 1, label: { en: 'Berlin', de: 'Berlin (DE)' } },
        { value: 'paris', label: 'Paris' },
    ];

    it('finds the option of a value that vis-2 holds as text', () => {
        expect(findSendToOption(OPTIONS, '1')).toBe(OPTIONS[0]);
        expect(findSendToOption(OPTIONS, 'paris')).toBe(OPTIONS[1]);
        expect(findSendToOption(OPTIONS, 'rome')).toBeUndefined();
        expect(findSendToOption(OPTIONS, '')).toBeUndefined();
        expect(findSendToOption(OPTIONS, undefined)).toBeUndefined();
    });

    it('stores the value of the option whose label is typed, else the text', () => {
        expect(autocompleteValue('Berlin (DE)', OPTIONS, 'de')).toBe('1');
        expect(autocompleteValue('Berlin', OPTIONS, 'en')).toBe('1');
        expect(autocompleteValue('Paris', OPTIONS, 'de')).toBe('paris');
        expect(autocompleteValue('Rome', OPTIONS, 'de')).toBe('Rome');
        expect(autocompleteValue('', OPTIONS, 'de')).toBe('');
    });
});
