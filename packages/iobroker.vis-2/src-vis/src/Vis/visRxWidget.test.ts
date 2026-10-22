import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VisRxWidget } from './visRxWidget';

/**
 * A widget without React: `setState` only records what it gets, and `commit()` applies it the way React
 * does later - so the time between the two, in which `this.state` is still old, can be tested.
 */
function createWidget(): {
    widget: any;
    setStates: any[];
    commit: () => void;
} {
    const widget: any = Object.create(VisRxWidget.prototype);
    const setStates: any[] = [];
    widget.props = { id: 'w000001', editMode: false, context: {} };
    widget.state = { values: {}, data: {}, style: {}, rxData: {}, rxStyle: {}, editMode: false };
    widget.linkContext = { IDs: [], bindings: {}, visibility: {}, lastChanges: {}, signals: {}, widgetAttrInfo: {} };
    widget.stateUpdatedTimers = new Set();
    widget.newState = null;
    widget.pendingValues = null;
    widget.checkVisibility = () => true;
    widget.updateMarksRect = () => {};
    widget.onRxDataChanged = () => {};
    widget.onRxStyleChanged = () => {};
    widget.setState = (state: any) => setStates.push(state);
    const commit = (): void => {
        const prevState = widget.state;
        widget.state = { ...widget.state, ...setStates.shift() };
        widget.componentDidUpdate(widget.props, prevState);
    };
    return { widget, setStates, commit };
}

describe('VisRxWidget.onStateChanged', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    // #565: after a view switch, a binding showed "undefined" until its state changed again
    it('keeps a value whose update React has not applied yet', () => {
        const { widget, setStates } = createWidget();

        // the first values after mounting, handed to setState together
        widget.onStateChanged('a.0.bool', { val: false, ack: true });
        widget.onStateChanged('a.0.number', { val: 1, ack: true });
        vi.advanceTimersByTime(60);
        expect(setStates).toHaveLength(1);

        // another state changes before React applied the first update
        widget.onStateChanged('a.0.number', { val: 2, ack: true });
        vi.advanceTimersByTime(60);

        expect(setStates).toHaveLength(2);
        expect(setStates[1].values['a.0.bool.val']).toBe(false);
        expect(setStates[1].values['a.0.number.val']).toBe(2);
    });

    it('starts from the state again once React applied the update', () => {
        const { widget, setStates, commit } = createWidget();

        widget.onStateChanged('a.0.number', { val: 1, ack: true });
        vi.advanceTimersByTime(60);
        commit();
        expect(widget.state.values['a.0.number.val']).toBe(1);

        // a value the state got afterwards in another way is not overwritten by the old pending one
        widget.state = { ...widget.state, values: { ...widget.state.values, 'a.0.other.val': 'x' } };
        widget.onStateChanged('a.0.number', { val: 2, ack: true });
        vi.advanceTimersByTime(60);

        expect(setStates[0].values['a.0.other.val']).toBe('x');
        expect(setStates[0].values['a.0.number.val']).toBe(2);
    });

    it('applies nothing for a change that changes nothing', () => {
        const { widget, setStates, commit } = createWidget();

        widget.onStateChanged('a.0.number', { val: 1, ack: true });
        vi.advanceTimersByTime(60);
        commit();
        widget.onStateChanged('a.0.number', { val: 1, ack: true });
        vi.advanceTimersByTime(60);

        expect(setStates).toHaveLength(0);
    });
});

describe('VisRxWidget subscriptions', () => {
    function createSocket(): { socket: any; handlers: Record<string, any[]> } {
        // like the socket client: a callback is removed only if it is the one that was subscribed
        const handlers: Record<string, any[]> = {};
        const subscribe = (ids: string | string[], cb: any): Promise<void> => {
            (Array.isArray(ids) ? ids : [ids]).forEach(id => (handlers[id] ||= []).push(cb));
            return Promise.resolve();
        };
        const socket = {
            subscribeState: subscribe,
            subscribeStateAsync: subscribe,
            unsubscribeState: (ids: string | string[], cb: any): void =>
                (Array.isArray(ids) ? ids : [ids]).forEach(id => {
                    const pos = handlers[id]?.indexOf(cb) ?? -1;
                    pos !== -1 && handlers[id].splice(pos, 1);
                }),
        };
        return { socket, handlers };
    }

    // #565: every view switch left the callbacks of the unmounted widgets behind
    it('removes the callback it subscribed when it is unmounted', () => {
        vi.spyOn(Object.getPrototypeOf(VisRxWidget.prototype), 'componentDidMount').mockImplementation(() => {});
        vi.spyOn(Object.getPrototypeOf(VisRxWidget.prototype), 'componentWillUnmount').mockImplementation(() => {});
        const { socket, handlers } = createSocket();

        for (let i = 0; i < 3; i++) {
            const { widget } = createWidget();
            widget.props.context = { socket };
            widget.onStateChangedBind = widget.onStateChanged.bind(widget);
            widget.linkContext.IDs = ['a.0.bool', 'a.0.number'];
            widget.componentDidMount();
            expect(handlers['a.0.bool']).toHaveLength(1);
            widget.componentWillUnmount();
        }

        expect(handlers['a.0.bool']).toHaveLength(0);
        expect(handlers['a.0.number']).toHaveLength(0);
    });
});
