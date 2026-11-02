import { describe, expect, it } from 'vitest';

import JQuiWriteState from './JQuiWriteState';

/** "Write value" as far as renderText() needs it */
const widget = (rxData: Record<string, unknown>): Record<string, any> => ({
    state: { rxData: { type: 'value', value: '100', text: '', ...rxData }, rxStyle: {} },
});

const renderText = (rxData: Record<string, unknown>): unknown =>
    JQuiWriteState.prototype.renderText.call(widget(rxData) as unknown as JQuiWriteState);

describe('JQuiWriteState only icon (#440)', () => {
    it('shows the icon alone when "Only icon" is set', () => {
        expect(renderText({ icon: 'data:image/svg+xml;base64,AAAA', onlyIcon: true })).toBeNull();
        expect(renderText({ src: '/vis-2.0/main/img/blind.png', onlyIcon: true, text: 'Open' })).toBeNull();
    });

    it('keeps the text next to the icon without the option', () => {
        // an empty text falls back to the value the button writes
        expect(renderText({ icon: 'data:image/svg+xml;base64,AAAA' })).not.toBeNull();
        expect(renderText({ icon: 'data:image/svg+xml;base64,AAAA', onlyIcon: false })).not.toBeNull();
    });

    it('keeps the text when there is no icon, so the button is never empty', () => {
        expect(renderText({ onlyIcon: true })).not.toBeNull();
        expect(renderText({ onlyIcon: true, icon: '', src: '' })).not.toBeNull();
    });

    it('asks for the icon of the widget in the editor', () => {
        expect(JQuiWriteState.isOnlyIcon({ onlyIcon: true, icon: 'x', src: '' })).toBe(true);
        expect(JQuiWriteState.isOnlyIcon({ onlyIcon: true, icon: '', src: '' })).toBe(false);
        expect(JQuiWriteState.isOnlyIcon({ onlyIcon: false, icon: 'x', src: '' })).toBe(false);
    });
});
