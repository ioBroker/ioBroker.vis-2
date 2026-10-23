import { describe, expect, it } from 'vitest';

import { ECHO_TIME, WrittenValues } from './writtenValues';

/** WrittenValues with a clock the test moves */
function create(): { written: WrittenValues; wait: (ms: number) => void } {
    let time = 1000;
    return { written: new WrittenValues(() => time), wait: ms => (time += ms) };
}

describe('WrittenValues', () => {
    it('takes both echoes of every write: the one from vis and the one from the server', () => {
        // "0845" typed into a time writes 00:30, 08:30, 08:40 and 08:45
        const { written } = create();
        ['00:30', '08:30', '08:40', '08:45'].forEach(value => {
            written.write(value);
            // vis hands the value to the widget at once
            expect(written.isEcho(value)).toBe(true);
        });
        // the server reports them back afterwards
        ['00:30', '08:30', '08:40', '08:45'].forEach(value => expect(written.isEcho(value)).toBe(true));
    });

    // the echo of the server came after the next key and reset the field to an older value
    it('takes a late echo of an older write after the echo of a newer one', () => {
        const { written } = create();
        written.write('08:30');
        written.write('08:45');

        expect(written.isEcho('08:45')).toBe(true);
        expect(written.isEcho('08:30')).toBe(true);
    });

    it('takes a value from outside and forgets the writes', () => {
        const { written } = create();
        written.write('08:30');

        expect(written.isEcho('12:00')).toBe(false);
        expect(written.isEcho('08:30')).toBe(false);
    });

    it('forgets a write after ECHO_TIME', () => {
        const { written, wait } = create();
        written.write('08:30');
        wait(ECHO_TIME - 1);
        expect(written.isEcho('08:30')).toBe(true);
        wait(1);
        expect(written.isEcho('08:30')).toBe(false);
    });

    it('takes no value at all as the echo of clearing the field', () => {
        const { written } = create();
        written.write('');

        expect(written.isEcho(null)).toBe(true);
        expect(written.isEcho(undefined)).toBe(true);
    });

    it('compares a number with the text that was written', () => {
        const { written } = create();
        written.write('1792675171923');

        expect(written.isEcho(1792675171923)).toBe(true);
    });

    it('takes the first value of the state as one from outside', () => {
        expect(new WrittenValues().isEcho('14:30')).toBe(false);
        expect(new WrittenValues().isEcho(undefined)).toBe(false);
    });
});
