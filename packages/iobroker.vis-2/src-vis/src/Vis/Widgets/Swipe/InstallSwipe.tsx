interface SwipeElement extends HTMLElement {
    _swipe?: true;
}

export default class InstallSwipe {
    private el!: SwipeElement;

    private locked = false;

    private x0: null | number = null;

    private y0: null | number = null;

    private readonly onSwipeLeft: null | undefined | (() => void) = null;

    private readonly onSwipeRight: null | undefined | (() => void) = null;

    private readonly onSwipeUp: null | undefined | (() => void) = null;

    private readonly onSwipeDown: null | undefined | (() => void) = null;

    private hideIndication = false;

    private indicationLeft = '';

    private indicationRight = '';

    private indicationUp = '';

    private indicationDown = '';

    private swipeThreshold = 30;

    private indicatorNode: null | HTMLElement = null;

    constructor(options: {
        onSwipeLeft?: null | (() => void);
        onSwipeRight?: null | (() => void);
        onSwipeUp?: null | (() => void);
        onSwipeDown?: null | (() => void);
    }) {
        this.onSwipeRight = options.onSwipeRight;
        this.onSwipeLeft = options.onSwipeLeft;
        this.onSwipeUp = options.onSwipeUp;
        this.onSwipeDown = options.onSwipeDown;
    }

    install(
        el?: HTMLElement,
        options?: {
            hideIndication?: boolean;
            indicationLeft?: string;
            indicationRight?: string;
            indicationUp?: string;
            indicationDown?: string;
            swipeThreshold?: number;
        },
    ): void {
        if (el) {
            this.el = el;
        }
        if (options) {
            if (options.hideIndication !== undefined) {
                this.hideIndication = options.hideIndication;
            }
            if (options.indicationLeft !== undefined) {
                this.indicationLeft = options.indicationLeft;
            }
            if (options.indicationRight !== undefined) {
                this.indicationRight = options.indicationRight;
            }
            if (options.indicationUp !== undefined) {
                this.indicationUp = options.indicationUp;
            }
            if (options.indicationDown !== undefined) {
                this.indicationDown = options.indicationDown;
            }
            if (options.swipeThreshold !== undefined) {
                this.swipeThreshold = Math.abs(options.swipeThreshold) || 30;
            }
        }

        this.init();
    }

    destroy(): void {
        if (this.el?._swipe) {
            this.el.removeEventListener('mousedown', this.moveStart, false);
            this.el.removeEventListener('touchstart', this.moveStart, false);
            delete this.el._swipe;
            this.removeIndicator();
        }
    }

    static unify(e: MouseEvent | TouchEvent): MouseEvent {
        return (e as TouchEvent).changedTouches
            ? ((e as TouchEvent).changedTouches[0] as unknown as MouseEvent)
            : (e as MouseEvent);
    }

    /**
     * Which way the gesture goes, and whether that way leads anywhere.
     *
     * The axis is decided by the longer of the two distances: a swipe is never exactly straight, and the
     * longer one is what tells a sideways swipe from an upward one. Nothing follows the finger in a
     * direction that has no view behind it - it would move and spring back for nothing.
     *
     * @param e - the event the gesture is at
     */
    private direction(e: MouseEvent | TouchEvent): {
        horizontal: boolean;
        delta: number;
        dx: number;
        dy: number;
        handler: null | undefined | (() => void);
        indication: string;
    } {
        const point = InstallSwipe.unify(e);
        const dx = point.clientX - (this.x0 ?? 0);
        const dy = point.clientY - (this.y0 ?? 0);
        const horizontal = Math.abs(dx) >= Math.abs(dy);
        const delta = horizontal ? dx : dy;

        let handler: null | undefined | (() => void);
        let indication: string;
        if (horizontal) {
            handler = delta > 0 ? this.onSwipeRight : this.onSwipeLeft;
            indication = delta > 0 ? this.indicationRight : this.indicationLeft;
        } else {
            handler = delta > 0 ? this.onSwipeDown : this.onSwipeUp;
            indication = delta > 0 ? this.indicationDown : this.indicationUp;
        }

        return { horizontal, delta, dx, dy, handler, indication };
    }

    private move = (e: MouseEvent | TouchEvent): void => {
        e.preventDefault();

        if (this.locked) {
            const { horizontal, delta, dx, dy, handler, indication } = this.direction(e);

            if (delta && handler && indication) {
                this.el.style.transform = horizontal ? `translateX(${dx}px)` : `translateY(${dy}px)`;
            }
            if (Math.abs(delta) > this.swipeThreshold) {
                // show indicator
                this.showIndication(horizontal, delta);
            } else if (this.indicatorNode) {
                this.indicatorNode.style.display = 'none';
            }
        }
    };

    private removeIndicator(): void {
        if (this.indicatorNode) {
            this.indicatorNode.remove();
            this.indicatorNode = null;
        }
        if (this.locked) {
            if (this.el) {
                this.el.style.transform = '';
                this.el.removeEventListener('mousemove', this.move, false);
                this.el.removeEventListener('touchmove', this.move, false);

                this.el.removeEventListener('mouseup', this.moveEnd, false);
                this.el.removeEventListener('touchend', this.moveEnd, false);
            }

            this.x0 = null;
            this.y0 = null;
            this.locked = false;
        }
    }

    private moveEnd = (e: MouseEvent | TouchEvent): void => {
        if (this.locked) {
            // how far it came, along the axis it went
            const { delta, handler } = this.direction(e);

            this.removeIndicator();

            if (Math.abs(delta) > this.swipeThreshold && handler) {
                handler();
            }
        }
    };

    private moveStart = (e: MouseEvent | TouchEvent): void => {
        if (!this.locked) {
            this.locked = true;
            // remember start point
            const point = InstallSwipe.unify(e);
            this.x0 = point.clientX;
            this.y0 = point.clientY;

            this.el.addEventListener('mousemove', this.move, false);
            this.el.addEventListener('touchmove', this.move, false);

            this.el.addEventListener('mouseup', this.moveEnd, false);
            this.el.addEventListener('touchend', this.moveEnd, false);
        }
    };

    private init(): void {
        if (!this.el._swipe) {
            this.el.addEventListener('mousedown', this.moveStart, false);
            this.el.addEventListener('touchstart', this.moveStart, false);
            this.el._swipe = true;
        }
    }

    /**
     * Say where the swipe would land, at the edge it is heading for.
     *
     * @param horizontal - true while the gesture runs sideways
     * @param delta - how far it has come along that axis, negative towards the left or the top
     */
    private showIndication(horizontal: boolean, delta: number): void {
        if (this.hideIndication) {
            return;
        }
        if (!this.indicatorNode) {
            this.indicatorNode = document.createElement('div');
            this.indicatorNode.style.position = 'absolute';
            this.indicatorNode.setAttribute('id', 'vis-2-swipe-indicator');
            this.indicatorNode.style.zIndex = '2000';
            this.indicatorNode.style.fontSize = '32px';
            this.el.parentNode?.appendChild(this.indicatorNode);
        }

        if (Math.abs(delta) <= this.swipeThreshold) {
            this.indicatorNode.style.display = 'none';
            return;
        }

        // the edge it heads for decides where the text sits, so all four are cleared first
        this.indicatorNode.style.left = '';
        this.indicatorNode.style.right = '';
        this.indicatorNode.style.top = '';
        this.indicatorNode.style.bottom = '';
        this.indicatorNode.style.transform = '';

        if (horizontal) {
            this.indicatorNode.style.top = 'calc(50% - 16px)';
            if (delta > 0) {
                this.indicatorNode.innerHTML = `← ${this.indicationRight}`;
                this.indicatorNode.style.left = '5%';
            } else {
                this.indicatorNode.innerHTML = `${this.indicationLeft} →`;
                this.indicatorNode.style.right = '5%';
            }
        } else {
            this.indicatorNode.style.left = '50%';
            this.indicatorNode.style.transform = 'translateX(-50%)';
            if (delta > 0) {
                this.indicatorNode.innerHTML = `↑ ${this.indicationDown}`;
                this.indicatorNode.style.top = '5%';
            } else {
                this.indicatorNode.innerHTML = `${this.indicationUp} ↓`;
                this.indicatorNode.style.bottom = '5%';
            }
        }
        this.indicatorNode.style.display = 'block';
    }
}
