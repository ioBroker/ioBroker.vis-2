import type React from 'react';

import { ColorPicker } from '@iobroker/gui-components';

type ColorPickerProps = React.ComponentProps<typeof ColorPicker>;

/** How long a color the picker showed itself counts as its own when the field hands it back */
const ECHO_TIME = 500;

/**
 * The `ColorPicker` of gui-components, for a field that hands the value back to it.
 *
 * Dragged, the picker shows one color after the other and tells the field of each one only after it shows it. So the
 * field hands a color back while the picker already shows the next one. The picker takes that for a change from
 * outside and jumps back, its color area then sends the newer color once more, and the two push each other until React
 * stops with "Maximum update depth exceeded".
 *
 * Here a value that the picker itself showed a moment ago is not taken from the field. Every other value is, also an
 * older one that comes later, like an undo.
 */
export default class EditorColorPicker extends ColorPicker {
    /** The colors this picker showed, with the time it stopped showing them (0: still shows it) */
    private shown: { color: string; until: number }[] = [];

    componentDidUpdate(prevProps: ColorPickerProps, prevState?: Readonly<ColorPicker['state']>): void {
        const now = Date.now();
        const textValue = this.state.textValue;
        if (prevState && prevState.textValue !== textValue) {
            this.shown = this.shown.filter(item => item.until && now - item.until < ECHO_TIME);
            this.shown.forEach(item => (item.until ||= now));
            const previous = this.shown.find(item => item.color === prevState.textValue);
            if (previous) {
                previous.until = now;
            } else {
                this.shown.push({ color: prevState.textValue, until: now });
            }
            this.shown = this.shown.filter(item => item.color !== textValue);
            this.shown.push({ color: textValue, until: 0 });
        }

        const value = this.props.value ?? this.props.color ?? '';
        const prevValue = prevProps.value ?? prevProps.color ?? '';
        if (
            value !== prevValue &&
            value !== textValue &&
            this.shown.some(item => item.color === value && (!item.until || now - item.until < ECHO_TIME))
        ) {
            // the field is behind the picker: nothing to take over
            return;
        }
        super.componentDidUpdate(prevProps);
    }
}
