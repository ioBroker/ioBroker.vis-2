import { describe, expect, it } from 'vitest';

import VisFormatUtils, { getArrayIndex } from './visFormatUtils';

/**
 * `formatValue` is what turns a number into the text a widget shows: it rounds, puts the decimal separator
 * where the format asks for it and groups the thousands. The `format` is two characters - the first is the
 * thousands separator, the second the decimal one.
 */
describe('VisFormatUtils.formatValue', () => {
    it('rounds to the number of places it is given', () => {
        expect(VisFormatUtils.formatValue(3.14159, 2)).toBe('3,14');
        expect(VisFormatUtils.formatValue(3.14159, 0)).toBe('3');
        expect(VisFormatUtils.formatValue(2.5, 0)).toBe('3');
    });

    it('uses the german way round by default: point for thousands, comma for decimals', () => {
        expect(VisFormatUtils.formatValue(1234.5, 1)).toBe('1.234,5');
    });

    it('follows the format it is given', () => {
        expect(VisFormatUtils.formatValue(1234.5, 1, ',.')).toBe('1,234.5');
        expect(VisFormatUtils.formatValue(1234567.89, 2, ',.')).toBe('1,234,567.89');
    });

    it('groups every three digits', () => {
        expect(VisFormatUtils.formatValue(1000000, 0)).toBe('1.000.000');
        expect(VisFormatUtils.formatValue(100, 0)).toBe('100');
        expect(VisFormatUtils.formatValue(1000, 0)).toBe('1.000');
    });

    it('reads a number that arrives as text', () => {
        expect(VisFormatUtils.formatValue('1234.5', 1)).toBe('1.234,5');
    });

    it('gives an empty text for what is not a number', () => {
        expect(VisFormatUtils.formatValue('abc', 2)).toBe('');
        expect(VisFormatUtils.formatValue('', 2)).toBe('');
    });

    it('keeps the sign', () => {
        expect(VisFormatUtils.formatValue(-1234.5, 1)).toBe('-1.234,5');
    });

    it('falls back to two places when no number of places is given', () => {
        expect(VisFormatUtils.formatValue(3.14159)).toBe('3,14');
        expect(VisFormatUtils.formatValue(1234.5)).toBe('1.234,50');
    });

    /**
     * The signature invites putting the format where the number of places goes, and the function is built to
     * take it: it moves the argument over and defaults the places to two. It used to set the places first and
     * then read the format out of the variable it had just overwritten, so `formatValue(1234.5)` returned
     * "1undefined234.50" - the thousands separator was read off the number 2.
     */
    it('takes a format that was passed where the number of places goes', () => {
        expect(VisFormatUtils.formatValue(1234.5, ',.')).toBe('1,234.50');
    });
});

/**
 * `array(...)` picks one of its entries by the value of the state. A boolean picks the second entry when it is
 * true - the way the example of the README, `{id.ack;array(…,…)}`, has always been meant.
 */
describe('the array operation of a binding', () => {
    const format = (value: unknown): string => {
        const utils = new VisFormatUtils({ vis: { editMode: false, states: {} } } as any);
        return utils.formatBinding({
            format: '{a.0.flag;array(nicht bestätigt,bestätigt)}',
            view: 'v',
            wid: 'w000001',
            widget: { tpl: '', data: {}, style: {} } as any,
            widgetData: {},
            values: { 'a.0.flag.val': value },
            moment: undefined,
        });
    };

    it('takes a boolean, and a boolean written as a text', () => {
        expect(format(true)).toBe('bestätigt');
        expect(format(false)).toBe('nicht bestätigt');
        expect(format('true')).toBe('bestätigt');
        expect(format('false')).toBe('nicht bestätigt');
    });

    it('still takes a number as the index it is', () => {
        expect(format(0)).toBe('nicht bestätigt');
        expect(format(1)).toBe('bestätigt');
        expect(format('1')).toBe('bestätigt');
    });
});

describe('getArrayIndex', () => {
    it('is 1 for true, 0 for false, and the number itself otherwise', () => {
        expect(getArrayIndex(true)).toBe(1);
        expect(getArrayIndex('true')).toBe(1);
        expect(getArrayIndex(false)).toBe(0);
        expect(getArrayIndex('false')).toBe(0);
        expect(getArrayIndex(2)).toBe(2);
        expect(getArrayIndex('3')).toBe(3);
        expect(getArrayIndex('nothing')).toBeNaN();
    });
});

/**
 * A formula like `{n:0_userdata.0.json;n[0].event}` gets the value of the state as a JavaScript variable. The
 * value has to be written into the script so that it stays what it is, whatever characters it holds.
 */
describe('the formula of a binding', () => {
    const format = (binding: string, value: unknown): string => {
        const utils = new VisFormatUtils({ vis: { editMode: false, states: {} } } as any);
        return utils.formatBinding({
            format: binding,
            view: 'v',
            wid: 'w000001',
            widget: { tpl: '', data: {}, style: {} } as any,
            widgetData: {},
            values: { 'a.0.x.val': value },
            moment: undefined,
        });
    };

    // #45: JSON with double quotes, e.g. from iCal or MQTT, broke the script
    it('takes JSON with double quotes as the object or the array it is', () => {
        expect(format('{b:a.0.x;b.connected ? "on" : "off"}', '{"connected":true}')).toBe('on');
        expect(format('{n:a.0.x;n[0].event}', '[{"date":"01.12.2022 10:30","event":"Abwesend"}]')).toBe('Abwesend');
        expect(format('{n:a.0.x;n[0].text}', '[{"text":"a \\"quoted\\" word"}]')).toBe('a "quoted" word');
    });

    it('takes a text with quotes, backslashes or line breaks as it is', () => {
        expect(format('{s:a.0.x;s}', 'he said "hello"')).toBe('he said "hello"');
        expect(format('{s:a.0.x;s.length}', 'C:\\temp')).toBe('7');
        expect(format('{s:a.0.x;s.split("\\n").length}', 'one\ntwo')).toBe('2');
    });

    it('still takes a number or a boolean written as a text as a text', () => {
        expect(format('{s:a.0.x;typeof s}', '5')).toBe('string');
        expect(format('{s:a.0.x;s + 1}', '5')).toBe('51');
        expect(format('{s:a.0.x;s === "true"}', 'true')).toBe('true');
    });

    it('takes numbers, booleans and null as they are', () => {
        expect(format('{s:a.0.x;s + 1}', 5)).toBe('6');
        expect(format('{s:a.0.x;s ? "yes" : "no"}', false)).toBe('no');
        expect(format('{s:a.0.x;s === null}', null)).toBe('true');
    });

    // vis-1 wrote the quotes of a formula in HTML attributes as \" - they are still meant as quotes
    it('takes \\" in the formula as a quote', () => {
        expect(format('{s:a.0.x;s == \\"on\\" ? \\"An\\" : \\"Aus\\"}', 'on')).toBe('An');
    });
});
