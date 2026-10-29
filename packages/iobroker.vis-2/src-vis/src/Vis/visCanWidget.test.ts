import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import VisCanWidget from './visCanWidget';

type Binding = { type: 'data' | 'style'; attr: string; format: string; view: string };

/**
 * A vis-1 widget as far as applyBinding() needs it: its bindings, the observables of its data and style, and the
 * render it asks for. A state change reaches it without the data, which only the first render passes.
 */
function canWidget(bindings: Binding[], editMode = false): Record<string, any> {
    return {
        props: {
            id: 'w000001',
            view: 'view1',
            context: {
                allWidgets: { w000001: { data: { attr: vi.fn() }, style: { attr: vi.fn() } } },
                views: { view1: { widgets: { w000001: { tpl: 'tplMetroSlider', data: {}, style: {} } } } },
                formatUtils: { formatBinding: () => 'green' },
            },
        },
        state: { editMode },
        bindings: { 'javascript.0.temp': bindings },
        rerenderTimer: null,
        unmounted: false,
        subscribeBoundId: vi.fn(),
        renderWidget: vi.fn(),
    };
}

const applyBinding = (widget: Record<string, any>): void =>
    VisCanWidget.prototype.applyBinding.call(widget, 'javascript.0.temp');

const colorBinding: Binding = {
    type: 'data',
    attr: 'sliderCompleteColor',
    format: "{t:javascript.0.temp;t > 20 ? 'green' : 'red'}",
    view: 'view1',
};

describe('VisCanWidget.applyBinding', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders the widget again in the runtime when a binding of its data changes (#301)', () => {
        const widget = canWidget([colorBinding]);
        applyBinding(widget);

        expect(widget.props.context.allWidgets.w000001.data.attr).toHaveBeenCalledWith('sliderCompleteColor', 'green');
        vi.runAllTimers();
        expect(widget.renderWidget).toHaveBeenCalledTimes(1);
        // not forced: renderWidget() keeps the widget when its data did not change after all
        expect(widget.renderWidget).toHaveBeenCalledWith(false);
    });

    it('renders once for all bindings of one change', () => {
        const widget = canWidget([colorBinding, { ...colorBinding, attr: 'sliderMarkerColor' }]);
        applyBinding(widget);
        applyBinding(widget);
        vi.runAllTimers();

        expect(widget.renderWidget).toHaveBeenCalledTimes(1);
    });

    it('does not render again for a binding of the style, in the editor, or after the widget left the view', () => {
        const styled = canWidget([{ ...colorBinding, type: 'style', attr: 'color' }]);
        applyBinding(styled);

        const edited = canWidget([colorBinding], true);
        applyBinding(edited);

        const gone = canWidget([colorBinding]);
        applyBinding(gone);
        gone.unmounted = true;

        vi.runAllTimers();
        expect(styled.renderWidget).not.toHaveBeenCalled();
        expect(edited.renderWidget).not.toHaveBeenCalled();
        expect(gone.renderWidget).not.toHaveBeenCalled();
    });
});
