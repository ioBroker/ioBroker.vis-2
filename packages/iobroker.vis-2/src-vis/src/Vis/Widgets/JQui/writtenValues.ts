/**
 * What a date or time picker wrote into its state and has not yet come back.
 *
 * The pickers write every step of typing, and the state echoes each write a moment later. A value that comes
 * from outside makes the picker start the section being typed anew - "0845" typed into a time became "00:45".
 * So the echoes of the own writes must not replace what the picker shows, but any other value must.
 */
export class WrittenValues {
    private pending: string[] = [];

    write(value: string): void {
        this.pending.push(value);
    }

    /**
     * Whether the new value of the state is the echo of a write. The echoes come in the order of the writes,
     * so the writes before it are done too. Any other value forgets all writes.
     *
     * @param stateValue the new value of the state
     */
    isEcho(stateValue: string | number | boolean | null | undefined): boolean {
        const index = this.pending.indexOf(String(stateValue ?? ''));
        if (index === -1) {
            this.pending = [];
            return false;
        }
        this.pending.splice(0, index + 1);
        return true;
    }
}
