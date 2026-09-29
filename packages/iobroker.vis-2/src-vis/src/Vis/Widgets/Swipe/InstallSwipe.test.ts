import { describe, expect, it, vi } from 'vitest';

import InstallSwipe from './InstallSwipe';

/**
 * A swipe to another view, on a page that can still be scrolled (#499).
 *
 * What matters to the browser is whether a move of the finger is held back: held back, the page does not
 * scroll. And the view element is only as high as the window, so on a scrolled page the finger may rest on the
 * bare page instead of on the view.
 */

type Listener = (e: FakeEvent) => void;

interface FakeEvent {
    target: unknown;
    changedTouches?: { clientX: number; clientY: number }[];
    clientX?: number;
    clientY?: number;
    defaultPrevented: boolean;
    preventDefault: () => void;
}

/** An element that hears what happens on it and on everything inside it, as a DOM element does */
class FakeNode {
    private listeners: Record<string, Listener[]> = {};

    constructor(readonly parent: FakeNode | null = null) {}

    contains(node: unknown): boolean {
        for (let current = node as FakeNode | null; current; current = current.parent) {
            if (current === this) {
                return true;
            }
        }
        return false;
    }

    addEventListener(type: string, listener: Listener): void {
        const list = (this.listeners[type] ||= []);
        if (!list.includes(listener)) {
            list.push(listener);
        }
    }

    removeEventListener(type: string, listener: Listener): void {
        this.listeners[type] = (this.listeners[type] || []).filter(item => item !== listener);
    }

    hear(type: string, event: FakeEvent): void {
        [...(this.listeners[type] || [])].forEach(listener => listener(event));
    }
}

class FakeDocument extends FakeNode {
    readonly documentElement = new FakeNode(this);

    readonly body = new FakeNode(this.documentElement);
}

/** Sends the event to its target and every element around it, up to the document */
function fire(type: string, event: FakeEvent): FakeEvent {
    for (let node = event.target as FakeNode | null; node; node = node.parent) {
        node.hear(type, event);
    }
    return event;
}

const event = (target: unknown, x: number, y: number, touch: boolean): FakeEvent => ({
    target,
    ...(touch ? { changedTouches: [{ clientX: x, clientY: y }] } : { clientX: x, clientY: y }),
    defaultPrevented: false,
    preventDefault() {
        this.defaultPrevented = true;
    },
});

/** A page with a view that leads to other views to the left and to the right, but not up or down */
function setup(options: { up?: boolean } = {}): {
    doc: FakeDocument;
    widget: FakeNode;
    onSwipeLeft: () => void;
    onSwipeUp: () => void;
    swipe: InstallSwipe;
} {
    const doc = new FakeDocument();
    const view = Object.assign(new FakeNode(doc.body), { ownerDocument: doc, style: { transform: '' } });
    const widget = new FakeNode(view);
    const onSwipeLeft = vi.fn();
    const onSwipeUp = vi.fn();
    const swipe = new InstallSwipe({ onSwipeLeft, onSwipeRight: vi.fn(), onSwipeUp, onSwipeDown: vi.fn() });
    // the fakes stand in for the DOM, which the tests do not have
    swipe.install(view as unknown as HTMLElement, {
        // the indication would need a document to draw in
        hideIndication: true,
        indicationLeft: 'left view',
        indicationRight: 'right view',
        indicationUp: options.up ? 'upper view' : '',
    });
    return { doc, widget, onSwipeLeft, onSwipeUp, swipe };
}

/** Moves from the start to the end in one step and returns the move */
function gesture(target: unknown, from: [number, number], to: [number, number], touch = true): FakeEvent {
    fire(touch ? 'touchstart' : 'mousedown', event(target, from[0], from[1], touch));
    const move = fire(touch ? 'touchmove' : 'mousemove', event(target, to[0], to[1], touch));
    fire(touch ? 'touchend' : 'mouseup', event(target, to[0], to[1], touch));
    return move;
}

describe('InstallSwipe', () => {
    it('lets a finger scroll the page up and down where no view lies that way', () => {
        const { widget, onSwipeUp } = setup();

        expect(gesture(widget, [400, 450], [405, 150]).defaultPrevented).toBe(false);
        // the swipe hands the gesture on as before, the widget itself finds no view up there
        expect(onSwipeUp).toHaveBeenCalledTimes(1);
    });

    it('holds a finger back that goes to the side where a view lies, and swipes', () => {
        const { widget, onSwipeLeft } = setup();

        expect(gesture(widget, [600, 300], [300, 310]).defaultPrevented).toBe(true);
        expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    });

    it('holds a finger back that goes up where a view lies up', () => {
        const { widget } = setup({ up: true });

        expect(gesture(widget, [400, 450], [405, 150]).defaultPrevented).toBe(true);
    });

    it('holds the mouse back either way, or it would select text', () => {
        const { widget } = setup();

        expect(gesture(widget, [400, 450], [405, 150], false).defaultPrevented).toBe(true);
    });

    it('swipes when the finger starts on the bare page below the view', () => {
        const { doc, onSwipeLeft } = setup();

        gesture(doc.documentElement, [600, 300], [300, 310]);
        gesture(doc.body, [600, 300], [300, 310]);

        expect(onSwipeLeft).toHaveBeenCalledTimes(2);
    });

    it('does not swipe when the finger starts on something else, a menu or a dialog', () => {
        const { doc, onSwipeLeft } = setup();

        const menu = new FakeNode(doc.body);
        expect(gesture(menu, [600, 300], [300, 310]).defaultPrevented).toBe(false);
        expect(onSwipeLeft).not.toHaveBeenCalled();
    });

    it('does not swipe for a way no longer than the threshold', () => {
        const { widget, onSwipeLeft } = setup();

        gesture(widget, [600, 300], [570, 300]);

        expect(onSwipeLeft).not.toHaveBeenCalled();
    });

    it('takes the next gesture after the browser has cancelled one', () => {
        const { widget, onSwipeLeft } = setup();

        fire('touchstart', event(widget, 400, 450, true));
        fire('touchmove', event(widget, 405, 300, true));
        fire('touchcancel', event(widget, 405, 300, true));
        gesture(widget, [600, 300], [300, 310]);

        expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    });

    it('stops listening when it is destroyed', () => {
        const { widget, onSwipeLeft, swipe } = setup();

        swipe.destroy();
        gesture(widget, [600, 300], [300, 310]);

        expect(onSwipeLeft).not.toHaveBeenCalled();
    });
});
