/** How long a written value counts as the echo of the write, in ms */
export const ECHO_TIME = 5000;

/**
 * What a date or time picker wrote into its state lately.
 *
 * The pickers write every step of typing, and the state echoes each write - twice: at once from vis itself, which
 * hands a written value to the widgets before the server has it, and again when the server reports it back. A value
 * that comes from outside makes the picker start the section being typed anew - "0845" typed into a time became
 * "00:45". So the echoes of the own writes must not replace what the picker shows, but any other value must.
 *
 * On a slow connection the echo of the server comes after the next key, with an older value than the field shows.
 * So a written value counts as an echo for a while (`ECHO_TIME`), and as often as it comes back. A value from
 * outside that equals one written in that time is taken for an echo too; it is what the field shows anyway or
 * was overtyped a moment ago.
 */
export class WrittenValues {
    private written: { value: string; time: number }[] = [];

    /** @param now the clock, for the tests */
    constructor(private readonly now: () => number = Date.now) {}

    write(value: string): void {
        this.written.push({ value, time: this.now() });
    }

    /**
     * Whether the new value of the state is the echo of a recent write. Any other value comes from outside and
     * forgets all writes.
     *
     * @param stateValue the new value of the state
     */
    isEcho(stateValue: string | number | boolean | null | undefined): boolean {
        const now = this.now();
        const value = String(stateValue ?? '');
        this.written = this.written.filter(entry => now - entry.time < ECHO_TIME);
        if (this.written.some(entry => entry.value === value)) {
            return true;
        }
        this.written = [];
        return false;
    }
}
