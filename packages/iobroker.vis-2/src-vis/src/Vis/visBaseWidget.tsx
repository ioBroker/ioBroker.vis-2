/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2022-2025 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 *
 * Short content:
 * Licensees may copy, distribute, display and perform the work and make derivative works based on it only if they give the author or licensor the credits in the manner specified by these.
 * Licensees may copy, distribute, display, and perform the work and make derivative works based on it only for noncommercial purposes.
 * (Free for non-commercial use).
 */

import React from 'react';
import { createPortal } from 'react-dom';

import { Anchor as AnchorIcon, Expand as ExpandIcon, KeyboardReturn } from '@mui/icons-material';

import { I18n, Utils } from '@iobroker/gui-components';

import { calculateOverflow, deepClone, isVarFinite } from '@/Utilities/utils';

import { getAdornerLayer } from './visAdornerLayer';
import type {
    AnyWidgetId,
    ResizeHandler,
    GroupData,
    WidgetData,
    WidgetStyle,
    Widget,
    RxRenderWidgetProps,
    VisRxWidgetStateValues,
    VisWidgetCommand,
    VisBaseWidgetProps,
} from '@iobroker/types-vis-2';
import { addClass, removeClass, replaceGroupAttr } from './visUtils';

interface HTMLDivElementResizers extends HTMLDivElement {
    _storedOpacity?: string;
}

type Resize = 'left' | 'right' | 'top' | 'bottom' | 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | boolean;

export interface WidgetDataState extends WidgetData {
    bindings: string[];
    _originalData?: string;
}

export interface GroupDataState extends GroupData {
    bindings?: string[];
    _originalData?: string;
}

export interface WidgetStyleState extends WidgetStyle {
    bindings?: string[];
    _originalData?: string;
}

/** Geometry a running gesture applies, in pixels. Only the values the gesture actually changes are set. */
export interface GestureStyle {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
    /** A relative widget is lifted out of the flow while it is dragged; the view holds its slot with a placeholder */
    position?: 'absolute';
}

export interface VisBaseWidgetState {
    applyBindings?: false | true | { top: string | number; left: string | number };
    data: WidgetDataState | GroupDataState;
    draggable?: boolean;
    editMode: boolean;
    gap?: number;
    hideHelper?: boolean;
    isHidden?: boolean;
    multiViewWidget?: boolean;
    resizable?: boolean;
    resizeHandles?: ResizeHandler[];
    rxStyle?: WidgetStyleState;
    selected?: boolean;
    selectedOne?: boolean;
    /** The editor waits for the click that picks the style of a widget, so this widget shows no handles */
    stealMode?: boolean;
    /**
     * Geometry of a running gesture, in pixels. It overrides the position of the widget while it is dragged, so
     * that render() stays the only place that positions the widget - a re-render during the gesture can then not
     * reset it. It is dropped again as soon as the moved position has arrived through the project.
     *
     * Only set for absolute widgets while they are moved. Resizing and relative widgets still write the DOM.
     *
     * `base` is the geometry the render used when the gesture started. The override may only be dropped once
     * the render carries the new geometry by itself - the project needs a moment to be written and the value
     * then travels through the binding pipeline - as the widget would show its old position until then.
     */
    gesture?: {
        /** Only the values this gesture changes: a resize from the right edge sets the width and nothing else */
        style: GestureStyle;
        base: GestureStyle;
    } | null;
    style: WidgetStyleState;
    usedInWidget: boolean;
    widgetHint?: 'light' | 'dark' | 'hide';
}

export interface VisBaseWidgetMovement {
    top: number;
    left: number;
    width: number;
    height: number;
    order?: AnyWidgetId[];
}

interface Handler {
    top?: string | number;
    left?: string | number;
    bottom?: string | number;
    height?: string | number;
    right?: string | number;
    width?: string | number;
    cursor: 'nwse-resize' | 'ns-resize' | 'ew-resize' | 'nesw-resize' | 'default';
    background: string;
    opacity: number;
    borderTop?: string;
    borderBottom?: string;
    borderLeft?: string;
    borderRight?: string;
}

interface ResizerElement extends HTMLDivElement {
    _storedOpacity?: string;
}

/**
 * Methods, which should be optionally implemented by inherited classes
 */
interface VisBaseWidget {
    renderSignals(): React.ReactNode;
    renderLastChange(style: unknown): React.ReactNode;
}

interface CanHTMLDivElement extends HTMLDivElement {
    _customHandlers?: {
        onShow: (el: HTMLDivElement, id: string) => void;
        onHide: (el: HTMLDivElement, id: string) => void;
        onMove: (el: HTMLDivElement, id: string) => void;
    };
    _storedDisplay?: React.CSSProperties['display'];
}

class VisBaseWidget<TState extends Partial<VisBaseWidgetState> = VisBaseWidgetState> extends React.Component<
    VisBaseWidgetProps,
    TState & VisBaseWidgetState
> {
    static FORBIDDEN_CHARS = /[^._\-/ :!#$%&()+=@^{}|~]+/g; // from https://github.com/ioBroker/ioBroker.js-controller/blob/master/packages/common/lib/common/tools.js

    /** We do not store the SVG Element in the state because it is cyclic */
    /** if currently resizing */
    private resize: Resize = false;

    protected readonly uuid = `${Date.now()}.${Math.round(Math.random() * 1_000_000)}`;

    protected refService = React.createRef<HTMLDivElement>();

    /** The div in the adorner layer that carries the marks of this widget */
    protected refMarks = React.createRef<HTMLDivElement>();

    /**
     * Where the marks sit: the padding box of this widget in the coordinates of the adorner layer.
     *
     * Deliberately NOT state. Measuring it and putting it into state renders the widget a second time after
     * every render, and a gesture that writes the position into the DOM is undone by that render - the widget
     * jumped back to its old place and forward again with the next mouse move. The value is written straight to
     * the div instead, and render() only uses it as the starting point for a fresh one.
     */
    protected marksRect: { left: number; top: number; width: number; height: number } | null = null;

    protected widDiv: null | CanHTMLDivElement = null;

    readonly onCommandBound: typeof this.onCommand;

    protected onResize: undefined | (() => void);

    private updateInterval?: ReturnType<typeof setTimeout>;

    private pressTimeout?: ReturnType<typeof setTimeout>;

    /**
     * Geometry the last render used before a running gesture was applied on top. It is the only honest measure
     * for the question whether the gesture may be dropped: only when this carries the new values by itself does
     * dropping it change nothing on the screen.
     */
    private renderedBaseGeometry: GestureStyle = {};

    private beforeIncludeColor?: string;

    protected lastClick?: number;

    protected movement?: VisBaseWidgetMovement;

    /** If resizing is currently locked */
    protected resizeLocked?: boolean;

    protected visDynamicResizable:
        | undefined
        | null
        | { default: boolean; desiredSize?: { width: number; height: number } | boolean };

    protected isCanWidget?: boolean;

    constructor(props: VisBaseWidgetProps) {
        super(props);

        const widget = props.context.views[props.view].widgets[props.id];
        const multiViewWidget = props.id.includes('_');

        const selected = !multiViewWidget && props.editMode && props.selectedWidgets?.includes(props.id);

        const data: WidgetDataState | GroupDataState = deepClone(widget.data || {}) as WidgetDataState | GroupDataState;
        const style: WidgetStyle = deepClone(widget.style || {});
        VisBaseWidget.replacePRJ_NAME(data, style, props);

        this.state = {
            data,
            style,
            applyBindings: false,
            editMode: !multiViewWidget && this.props.editMode,
            multiViewWidget,
            selected,
            selectedOne: selected && this.props.selectedWidgets.length === 1,
            resizable: true,
            resizeHandles: ['n', 'e', 's', 'w', 'nw', 'ne', 'sw', 'se'],
            widgetHint: props.context.widgetHint,
            isHidden: VisBaseWidget.isWidgetFilteredOutStatic(
                props.viewsActiveFilter,
                widget.data,
                props.view,
                props.editMode,
            ),
            usedInWidget: widget.usedInWidget,
            hideHelper: false,
            gap:
                style.position === 'relative'
                    ? isVarFinite(props.context.views[props.view].settings?.rowGap)
                        ? parseFloat(props.context.views[props.view].settings?.rowGap as string)
                        : 0
                    : 0,
        } as TState & VisBaseWidgetState;

        this.onCommandBound = this.onCommand.bind(this);
    }

    static replacePRJ_NAME(data: Record<string, any>, style: Record<string, any>, props: VisBaseWidgetProps): void {
        const context = props.context;
        if (data) {
            delete data._originalData;
            Object.keys(data).forEach(attr => {
                if (
                    attr &&
                    data[attr] &&
                    typeof data[attr] === 'string' &&
                    (attr.startsWith('src') || attr.endsWith('src') || attr.includes('icon')) &&
                    data[attr].startsWith('_PRJ_NAME')
                ) {
                    if (!data._originalData) {
                        data._originalData = JSON.stringify(data);
                    }
                    // "_PRJ_NAME".length = 9
                    data[attr] =
                        `../${context.adapterName}.${context.instance}/${context.projectName}${data[attr].substring(9)}`;
                }
            });
        }
        if (style) {
            delete style._originalData;
            if (style['background-image'] && style['background-image'].startsWith('_PRJ_NAME')) {
                if (!style._originalData) {
                    style._originalData = JSON.stringify(style);
                }
                style['background-image'] =
                    `../${context.adapterName}.${context.instance}/${context.projectName}${style['background-image'].substring(9)}`; // "_PRJ_NAME".length = 9
            }
        }
    }

    componentDidMount(): void {
        // register service ref by view for resize and move only in edit mode
        this.props.askView &&
            this.props.askView('register', {
                id: this.props.id,
                uuid: this.uuid,
                widDiv: this.widDiv,
                refService: this.refService,
                onMove: this.onMove,
                onResize: this.onResize,
                onTempSelect: this.onTempSelect,
                onCommand: this.onCommandBound,
            });

        this.updateMarksRect();
    }

    /**
     * Put the marks of this widget onto it.
     *
     * They are drawn in the adorner layer of the view and not as children of the widget, so their position has
     * to be measured. This runs in the commit phase, before the browser paints, so a `setState` here is applied
     * in the same frame and the marks do not lag behind while a widget is dragged.
     */
    protected updateMarksRect(): void {
        const service = this.refService.current;
        const layer = this.state.editMode ? getAdornerLayer(this.props.view) : null;

        if (!service || !layer) {
            this.marksRect = null;
            return;
        }

        const box = service.getBoundingClientRect();
        const layerBox = layer.getBoundingClientRect();
        const style = window.getComputedStyle(service);
        const borderLeft = parseFloat(style.borderLeftWidth) || 0;
        const borderRight = parseFloat(style.borderRightWidth) || 0;
        const borderTop = parseFloat(style.borderTopWidth) || 0;
        const borderBottom = parseFloat(style.borderBottomWidth) || 0;

        // The marks used to be children of the widget and are therefore placed against its PADDING box - the
        // offsets of the resize handles even subtract the border width to get there. Mirroring that box keeps
        // every one of those rules working unchanged.
        const rect = {
            left: box.left - layerBox.left + borderLeft,
            top: box.top - layerBox.top + borderTop,
            width: box.width - borderLeft - borderRight,
            height: box.height - borderTop - borderBottom,
        };

        this.marksRect = rect;

        const marks = this.refMarks.current;
        if (marks) {
            marks.style.left = `${rect.left}px`;
            marks.style.top = `${rect.top}px`;
            marks.style.width = `${rect.width}px`;
            marks.style.height = `${rect.height}px`;
        }
    }

    componentDidUpdate(_prevProps?: VisBaseWidgetProps, _prevState?: Readonly<TState>): void {
        this.updateMarksRect();

        const gesture = this.state.gesture;
        // while the gesture is running it is the truth and must stay
        if (!gesture || this.movement) {
            return;
        }

        const attrs = Object.keys(gesture.style) as (keyof GestureStyle)[];
        // dropping the override is invisible as soon as the render carries its values without it
        const redundant = attrs.every(attr => this.renderedBaseGeometry[attr] === gesture.style[attr]);
        // the widget was positioned from somewhere else - the attribute panel or an undo - so the override,
        // which would otherwise win forever, is stale
        const changedElsewhere = attrs.some(
            attr =>
                this.renderedBaseGeometry[attr] !== gesture.style[attr] &&
                this.renderedBaseGeometry[attr] !== gesture.base[attr],
        );

        if (redundant || changedElsewhere) {
            this.setState({ gesture: null });
        }
    }

    componentWillUnmount(): void {
        this.updateInterval && clearInterval(this.updateInterval);
        this.updateInterval = undefined;

        this.pressTimeout && clearTimeout(this.pressTimeout);
        this.pressTimeout = undefined;

        // delete service ref from view only in edit mode
        this.props.askView && this.props.askView('unregister', { id: this.props.id, uuid: this.uuid });
    }

    // this method may be not in form onCommand = command => {}, as it can be overloaded
    onCommand(command: VisWidgetCommand, _option?: any): any {
        if (command === 'includePossible') {
            const overlay = this.refService.current?.querySelector<HTMLDivElement>('.vis-editmode-overlay');
            if (overlay && this.beforeIncludeColor === undefined) {
                this.beforeIncludeColor = overlay.style.backgroundColor;
                overlay.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
            }
            return true;
        }
        if (command === 'includePossibleNOT') {
            if (this.beforeIncludeColor !== undefined) {
                const overlay = this.refService.current?.querySelector<HTMLDivElement>('.vis-editmode-overlay');
                overlay && (overlay.style.backgroundColor = this.beforeIncludeColor);
                this.beforeIncludeColor = undefined;
            }
            return true;
        }

        // The steal mode is a state of the editor and not a gesture, so it is rendered and not written into the
        // DOM: render() adds the class and the cursor, and getResizeHandlers() draws no handles while it is on.
        if (command === 'startStealMode') {
            this.setState({ stealMode: true });
            return true;
        }

        if (command === 'cancelStealMode') {
            this.setState({ stealMode: false });
            return true;
        }

        if (command === 'startMove' || command === 'startResize') {
            const overlay = this.refService.current?.querySelector('.vis-editmode-overlay');
            if (overlay) {
                if (this.state.selected) {
                    overlay.className = removeClass(overlay.className, 'vis-editmode-selected');
                } else {
                    overlay.className = removeClass(overlay.className, 'vis-editmode-overlay-not-selected');
                }
            }

            if (command === 'startResize') {
                this.resize = true;
            }
            return true;
        }

        if (command === 'stopMove' || command === 'stopResize') {
            const overlay = this.refService.current?.querySelector<HTMLDivElement>('.vis-editmode-overlay');
            if (overlay) {
                if (this.beforeIncludeColor !== undefined) {
                    overlay.style.backgroundColor = this.beforeIncludeColor;
                    this.beforeIncludeColor = undefined;
                }

                if (this.state.selected) {
                    overlay.className = addClass(overlay.className, 'vis-editmode-selected');
                } else {
                    overlay.className = addClass(overlay.className, 'vis-editmode-overlay-not-selected');
                }
            }

            // show resizers again
            const resizers = this.refMarks.current?.querySelectorAll<HTMLDivElement>('.vis-editmode-resizer');
            resizers?.forEach(item => (item.style.display = 'block'));

            if (command === 'stopResize') {
                this.resize = false;
            }
            return true;
        }

        return false;
    }

    static getDerivedStateFromProps(
        props: VisBaseWidgetProps,
        state: VisBaseWidgetState,
    ): Partial<VisBaseWidgetState> | null {
        const context = props.context;
        let newState: Partial<VisBaseWidgetState> | null = null; // No change to state by default
        let widget = context.views[props.view].widgets[props.id];

        const gap =
            widget.style.position === 'relative'
                ? isVarFinite(context.views[props.view].settings?.rowGap)
                    ? parseFloat(context.views[props.view].settings?.rowGap as string)
                    : 0
                : 0;
        let copied = false;

        if (widget.groupid) {
            // this widget belongs to the group
            const parentWidgetData = context.views[props.view].widgets[widget.groupid].data;
            // extract attribute names
            const names = Object.keys(parentWidgetData)
                .map(attr => (attr.startsWith('attrType_') ? attr.substring(9) : null))
                .filter(attr => attr);

            if (names.length && widget.data) {
                for (const [attr, val] of Object.entries(widget.data)) {
                    if (typeof val === 'string' && names.find(a => a && val.includes(a))) {
                        const result = replaceGroupAttr(widget.data[attr], parentWidgetData);
                        if (result.doesMatch) {
                            // create a copy as we will substitute the values
                            if (!copied) {
                                copied = true;
                                widget = deepClone(widget);
                            }
                            widget.data[attr] = result.newString || '';
                        }
                    }
                }
            }
        }

        // take actual (old) style and data
        const styleStr: string = state.style?._originalData ? state.style._originalData : JSON.stringify(state.style);
        const dataStr: string = state.data?._originalData ? state.data._originalData : JSON.stringify(state.data);

        const isHidden = VisBaseWidget.isWidgetFilteredOutStatic(
            props.viewsActiveFilter,
            widget.data,
            props.view,
            props.editMode,
        );

        // compare with new style and data
        if (
            JSON.stringify(widget.style || {}) !== styleStr ||
            JSON.stringify(widget.data || {}) !== dataStr ||
            gap !== state.gap ||
            isHidden !== state.isHidden
        ) {
            if (!props.runtime) {
                const styleObj: WidgetStyle = JSON.parse(styleStr);
                Object.keys(styleObj).forEach(attr => {
                    const oldStyle = (widget.style as Record<string, string>)[attr];
                    const newStyle = (styleObj as Record<string, string>)[attr];
                    if (newStyle !== oldStyle) {
                        console.log(
                            `[${Date.now()} / ${props.id}] Rerender because of style.${attr}: ${newStyle} !== ${oldStyle}`,
                        );
                    }
                });
                Object.keys(widget.style).forEach((attr: string) => {
                    const oldStyle = (widget.style as Record<string, string>)[attr];
                    const newStyle = (styleObj as Record<string, string>)[attr];
                    if (newStyle !== oldStyle) {
                        console.log(
                            `[${Date.now()} / ${props.id}] Rerender because of style.${attr}: ${newStyle} !== ${oldStyle}`,
                        );
                    }
                });

                const dataObj: GroupData = JSON.parse(dataStr);
                Object.keys(dataObj).forEach((attr: string) => {
                    if (JSON.stringify(dataObj[attr]) !== JSON.stringify(widget.data[attr])) {
                        console.log(
                            `[${Date.now()} / ${props.id}] Rerender because of data.${attr}: ${dataObj[attr]} !== ${widget.data[attr]}`,
                        );
                    }
                });
            }

            let data: WidgetDataState;
            let style: WidgetStyleState;
            // restore original data
            if (copied) {
                data = (widget.data as WidgetDataState) || { bindings: [] };
                // detect for CanWidgets if the size was changed
                style = widget.style || { bindings: [] };
            } else {
                data = widget.data ? (deepClone(widget.data) as WidgetDataState) : { bindings: [] };
                // detect for CanWidgets if the size was changed
                style = widget.style ? deepClone(widget.style) : { bindings: [] };
            }

            // replace all _PRJ_NAME with vis.0/name
            VisBaseWidget.replacePRJ_NAME(data, style, props);

            newState = {};
            newState.isHidden = isHidden;
            newState.style = style;
            newState.data = data;
            newState.gap = gap;
            newState.applyBindings = { top: widget.style.top as number, left: widget.style.left as number };
        }

        if (props.editMode !== state.editMode) {
            newState = newState || {};
            newState.editMode = props.editMode;
            newState.applyBindings = true;
        }

        if (props.context.widgetHint !== state.widgetHint) {
            newState = newState || {};
            newState.widgetHint = props.context.widgetHint;
        }

        const selected =
            !state.multiViewWidget &&
            props.editMode &&
            props.selectedWidgets &&
            props.selectedWidgets.includes(props.id);
        const selectedOne = selected && props.selectedWidgets.length === 1;

        if (selected !== state.selected || selectedOne !== state.selectedOne) {
            newState = newState || {};
            newState.selected = selected;
            newState.selectedOne = selectedOne;
        }

        if (!!widget.usedInWidget !== !!state.usedInWidget) {
            newState = newState || {};
            newState.usedInWidget = !!widget.usedInWidget;
        }

        // The gesture geometry only overrides the position until the moved position has arrived through the
        // project. Dropping it at the end of the gesture instead would show the old position for one frame,
        // because the project is only updated afterwards.
        return newState;
    }

    static removeFromArray(items: Record<string, any>, IDs: string[], view: string, widget: string): void {
        items &&
            Object.keys(items).forEach(id => {
                if (!IDs || IDs.includes(id)) {
                    for (let i = items[id].length - 1; i >= 0; i--) {
                        const item = items[id][i];
                        if (item.view === view && item.widget === widget) {
                            items[id].splice(i, 1);
                        }
                    }
                }
            });
    }

    static parseStyle(style: string, isRxStyle?: boolean): Record<string, string | number> {
        const result: Record<string, string | number> = {};
        // style is like "height: 10; width: 20"
        (style || '').split(';').forEach(part => {
            part = part.trim();
            if (part) {
                const parts = part.split(':');
                let attr: string = parts[0].trim();
                let value: string | number = parts[1];
                if (attr && value) {
                    value = value.trim();
                    if (!isRxStyle && (attr === 'top' || attr === 'left' || attr === 'width' || attr === 'height')) {
                        if (!isRxStyle) {
                            if (value !== '0' && value.match(/^[-+]?\d+$/)) {
                                value = `${value}px`;
                            }
                        } else {
                            const f = parseFloat(value);
                            if (value === f.toString()) {
                                value = f;
                            }
                        }
                    }

                    if (value) {
                        if (isRxStyle) {
                            attr = attr.replace(/(-\w)/, text => text[1].toUpperCase());
                        }

                        result[attr] = value;
                    }
                }
            }
        });

        return result;
    }

    onMouseDown(e: React.MouseEvent): void {
        e.stopPropagation();
        if (this.state.stealMode && !this.state.multiViewWidget) {
            e.stopPropagation();
            this.props.mouseDownOnView(e, this.props.id, this.props.isRelative);
            return;
        }
        if (this.props.context.views[this.props.view].widgets[this.props.id].data.locked) {
            return;
        }

        if (this.lastClick !== undefined && Date.now() - this.lastClick < 250) {
            console.log('AAA');
        }

        // detect double click for multi-view widgets
        if (this.lastClick) {
            if (this.state.multiViewWidget) {
                if (Date.now() - this.lastClick < 250) {
                    // change view
                    const lastUnderscore = this.props.id.lastIndexOf('_');
                    const multiView: string = this.props.id.substring(1, lastUnderscore);
                    const multiId: AnyWidgetId = this.props.id.substring(lastUnderscore + 1) as AnyWidgetId;
                    this.props.context.setSelectedWidgets?.([multiId], multiView);
                }

                this.lastClick = Date.now();
                return;
            }
        }

        if (e.shiftKey || e.ctrlKey) {
            // add or remove
            const pos = this.props.selectedWidgets.indexOf(this.props.id);
            if (pos === -1) {
                const selectedWidgets = [...this.props.selectedWidgets, this.props.id];
                this.props.context.setSelectedWidgets?.(selectedWidgets);
            } else {
                const selectedWidgets = [...this.props.selectedWidgets];
                selectedWidgets.splice(pos, 1);
                this.props.context.setSelectedWidgets?.(selectedWidgets);
            }
            return;
        }

        if (!this.props.selectedWidgets.includes(this.props.id)) {
            // set select
            this.props.context.setSelectedWidgets?.([this.props.id]);
        } else if (this.props.moveAllowed && this.state.draggable !== false) {
            // Relative widgets start the gesture as well: it reorders them, and it is what offers to include a
            // widget into a container. That only absolute widgets may be dragged together with each other is
            // already decided by `moveAllowed`, and the double click that opens a group is recognized by
            // `mouseDownOnView` itself.
            this.props.mouseDownOnView(
                e,
                this.props.id,
                this.props.isRelative,
                false,
                this.lastClick !== undefined && Date.now() - this.lastClick < 300,
            );
        }
        this.lastClick = Date.now();
    }

    isResizable(): boolean {
        if (this.visDynamicResizable) {
            // take data from field "visResizable"
            // this value cannot be bound, so we can read it directly from widget.data
            return typeof this.state.data.visResizable === 'boolean'
                ? this.state.data.visResizable
                : this.visDynamicResizable.default; // by default all widgets are resizable
        }

        return !!this.state.resizable;
    }

    /**
     * Note about relative widgets: they are not positioned by this at all. The view shows a copy of the widget
     * under the cursor and a placeholder in the slot it will land in, and writes the new order when the gesture
     * ends - see `VisView.createDragGhost()` and `VisView.updateRelativeDragOrder()`.
     */
    onMove = (x: number | undefined, y: number | undefined, save?: boolean): void => {
        if (this.state.multiViewWidget || !this.state.editMode) {
            return;
        }

        const movement = this.movement;

        if (!this.refService.current) {
            return;
        }
        if (this.resize) {
            if (this.isResizable() === false) {
                return;
            }

            /** What this gesture changed, so that the same values are rendered, applied and finally saved */
            let resizeStyle: GestureStyle = {};

            if (x === undefined) {
                // start resizing
                const rect = (this.widDiv || this.refService.current)?.getBoundingClientRect();

                if (rect) {
                    this.movement = {
                        top: this.refService.current.offsetTop,
                        left: this.refService.current.offsetLeft,
                        width: rect.width,
                        height: rect.height,
                    };
                }
                const resizers = this.refMarks.current?.querySelectorAll<ResizerElement>('.vis-editmode-resizer');
                resizers?.forEach(item => {
                    item._storedOpacity = item.style.opacity;
                    item.style.opacity = '0.3';
                });
            } else if (movement && y !== undefined /* && x !== undefined */) {
                // Every handle changes exactly the edges it is named after. The geometry is computed once
                // here instead of being written twice - to the service div and to the can.js div - in eight
                // nearly identical branches.
                const direction = typeof this.resize === 'string' ? this.resize : 'bottom-right';

                resizeStyle = {};
                if (direction.includes('top')) {
                    resizeStyle.top = movement.top + y;
                    resizeStyle.height = movement.height - y;
                } else if (direction.includes('bottom')) {
                    resizeStyle.height = movement.height + y;
                }
                if (direction.includes('left')) {
                    resizeStyle.left = movement.left + x;
                    resizeStyle.width = movement.width - x;
                } else if (direction.includes('right')) {
                    resizeStyle.width = movement.width + x;
                }

                if (this.resizeLocked) {
                    // the handles that only change the height let the width follow, all others the other way round
                    if (resizeStyle.width === undefined) {
                        resizeStyle.width = resizeStyle.height;
                    } else {
                        resizeStyle.height = resizeStyle.width;
                    }
                }

                // render() applies it to the service div, so a re-render during the gesture cannot reset it
                this.setState({ gesture: { style: resizeStyle, base: { ...this.renderedBaseGeometry } } });

                // the can.js div of a vis-1 widget is not rendered by React; VisCanWidget applies the same
                // gesture geometry to it in its componentDidUpdate
            }

            // end of resize
            if (save) {
                const resizers =
                    this.refMarks.current?.querySelectorAll<HTMLDivElementResizers>('.vis-editmode-resizer');
                resizers?.forEach(item => {
                    if (item._storedOpacity !== undefined) {
                        item.style.opacity = item._storedOpacity;
                        delete item._storedOpacity;
                    }
                });
                this.resize = false;

                // The values this gesture changed must come from the computation and not from the DOM: this
                // call carries the last position itself, so React has not rendered it yet and reading the
                // service div back would save the position of the previous mouse move. The other values were
                // not touched by the gesture, so the DOM still holds what the widget had before.
                const savedStyle: Record<string, string> = {
                    top: this.refService.current.style.top,
                    left: this.refService.current.style.left,
                    width: this.refService.current.style.width,
                    height: this.refService.current.style.height,
                };
                Object.entries(resizeStyle).forEach(([attr, value]) => (savedStyle[attr] = `${value}px`));

                this.props.context.onWidgetsChanged?.([
                    {
                        wid: this.props.id,
                        view: this.props.view,
                        style: savedStyle,
                    },
                ]);

                this.movement = undefined;
            }
        } else if (x === undefined) {
            if (this.state.draggable === false) {
                return;
            }

            // initiate movement. The size is measured because a relative widget is lifted out of the flow for
            // the gesture: its `width: 100%` would otherwise stop meaning the column and start meaning the view.
            const startRect = (this.widDiv || this.refService.current).getBoundingClientRect();
            this.movement = {
                top: this.refService.current.offsetTop,
                left: this.refService.current.offsetLeft,
                order: [...this.props.relativeWidgetOrder],
                width: startRect.width,
                height: startRect.height,
            };

            // hide resizers
            const resizers = this.refMarks.current?.querySelectorAll<HTMLDivElement>('.vis-editmode-resizer');
            resizers?.forEach(item => (item.style.display = 'none'));
        } else if (this.movement && y !== undefined && x !== undefined) {
            // move widget
            const leftPx = this.movement.left + x;
            const topPx = this.movement.top + y;

            // A relative widget is not positioned by itself: the view shows a copy under the cursor and a
            // placeholder in its slot, and the order decides where it lands.
            if (!this.props.isRelative) {
                // render() is the only place that positions the widget; VisCanWidget applies the same geometry
                // to the can.js div, which is not part of the React tree
                this.setState({
                    gesture: { style: { left: leftPx, top: topPx }, base: { ...this.renderedBaseGeometry } },
                });
            }

            // End of movement
            if (save) {
                // show resizers
                const resizers = this.refMarks.current?.querySelectorAll<HTMLDivElement>('.vis-editmode-resizer');
                resizers?.forEach(item => (item.style.display = 'block'));

                if (this.props.isRelative) {
                    // A relative widget carries no position of its own; where it lands is decided by the order,
                    // and the view writes that when the gesture ends. Dropping the gesture puts the widget back
                    // into the flow, at its new place.
                    this.setState({ gesture: null });
                } else {
                    this.props.context.onWidgetsChanged?.([
                        {
                            wid: this.props.id,
                            view: this.props.view,
                            style: {
                                left: this.movement.left + x,
                                top: this.movement.top + y,
                            },
                        },
                    ]);
                }

                this.movement = undefined;
            }
        }
    };

    onTempSelect = (selected?: boolean): void => {
        const ref = this.refService.current?.querySelector<HTMLElement>('.vis-editmode-overlay');
        if (!ref) {
            return;
        }
        if (selected === null || selected === undefined) {
            // restore original state
            if (this.props.selectedWidgets.includes(this.props.id)) {
                if (!ref.className.includes('vis-editmode-selected')) {
                    ref.className = addClass('vis-editmode-selected', ref.className);
                }
            } else {
                ref.style.backgroundColor = '';
                ref.className = removeClass(ref.className, 'vis-editmode-selected');
            }
        } else if (selected) {
            if (!ref.className.includes('vis-editmode-selected')) {
                ref.className = addClass('vis-editmode-selected', ref.className);
            }
        } else {
            ref.className = removeClass(ref.className, 'vis-editmode-selected');
        }
    };

    onResizeStart(e: React.MouseEvent, type: Resize): void {
        e.stopPropagation();
        this.resize = type;
        this.props.mouseDownOnView(e, this.props.id, this.props.isRelative, true);
    }

    getResizeHandlers(selected: boolean, widget: Widget, borderWidth: string): (React.JSX.Element | null)[] | null {
        if (!this.state.editMode || !selected || this.state.stealMode) {
            return null;
        }

        /**
         * Several widgets are selected: they get the same frame as a single one, but nothing to grab - resizing
         * only works on one widget at a time.
         */
        const frameOnly = this.props.selectedWidgets?.length !== 1;

        const thickness = 0.4;
        const shift = 0.3;
        const square = 0.4;

        const squareShift = `calc(${shift - square}em - ${borderWidth})`;
        const squareWidthHeight = `${square}em`;
        const shiftEm = `${shift}em`;
        const thicknessEm = `${thickness}em`;
        const offsetEm = `calc(${shift - thickness}em - ${borderWidth})`;

        const widgetWidth100 = widget.style.width === '100%';
        const widgetHeight100 = widget.style.height === '100%';

        const color = '#014488'; // it is so to be able to change color in a web storm
        const border = `0.1em dashed ${color}`;
        const borderDisabled = '0.1em dashed #888';

        const resizable = this.isResizable();

        let resizeHandlers: ResizeHandler[] = resizable && this.state.resizeHandles ? this.state.resizeHandles : [];

        if (resizable && this.props.selectedGroup && this.props.selectedGroup === this.props.id) {
            resizeHandlers = ['s', 'e', 'se'];
        }

        const RESIZERS_OPACITY = 0.9;
        const RESIZERS_OPACITY_DISABLED = 0.5;

        const isRelative = widget.usedInWidget || this.props.isRelative;

        const controllable = {
            top: !isRelative && resizeHandlers.includes('n'),
            bottom: !widget.usedInWidget && !widgetHeight100 && resizeHandlers.includes('s'),
            left: !isRelative && resizeHandlers.includes('w'),
            right: !widget.usedInWidget && !widgetWidth100 && resizeHandlers.includes('e'),
            'top-left': !widgetHeight100 && !widgetWidth100 && !isRelative && resizeHandlers.includes('nw'),
            'top-right': !widgetHeight100 && !widgetWidth100 && !isRelative && resizeHandlers.includes('ne'),
            'bottom-left': !widgetHeight100 && !widgetWidth100 && !isRelative && resizeHandlers.includes('sw'),
            'bottom-right':
                !widgetHeight100 && !widgetWidth100 && !widget.usedInWidget && resizeHandlers.includes('se'),
        };

        if (frameOnly) {
            // all four edges in the same style as an enabled handle, so the frame looks like the one of a
            // single selected widget; the corners are grab points and therefore left out
            controllable.top = true;
            controllable.bottom = true;
            controllable.left = true;
            controllable.right = true;
            controllable['top-left'] = false;
            controllable['top-right'] = false;
            controllable['bottom-left'] = false;
            controllable['bottom-right'] = false;
        }

        const handlers: Record<string, Handler> = {
            top: {
                top: offsetEm,
                height: thicknessEm,
                left: controllable['top-left'] ? shiftEm : 0,
                right: controllable['top-right'] ? shiftEm : 0,
                cursor: 'ns-resize',
                background: 'transparent',
                opacity: controllable.top ? RESIZERS_OPACITY : RESIZERS_OPACITY_DISABLED,
                borderTop: controllable.top ? border : borderDisabled,
            },
            bottom: {
                bottom: offsetEm,
                height: thicknessEm,
                left: controllable['bottom-left'] ? shiftEm : 0,
                right: controllable['bottom-right'] ? shiftEm : 0,
                cursor: 'ns-resize',
                background: 'transparent',
                opacity: controllable.bottom ? RESIZERS_OPACITY : RESIZERS_OPACITY_DISABLED,
                borderBottom: controllable.bottom ? border : borderDisabled,
            },
            left: {
                top: controllable['top-left'] ? shiftEm : 0,
                bottom: controllable['bottom-left'] ? shiftEm : 0,
                left: offsetEm,
                width: thicknessEm,
                cursor: 'ew-resize',
                background: 'transparent',
                opacity: controllable.left ? RESIZERS_OPACITY : RESIZERS_OPACITY_DISABLED,
                borderLeft: controllable.left ? border : borderDisabled,
            },
            right: {
                top: controllable['top-right'] ? shiftEm : 0,
                bottom: controllable['bottom-right'] ? shiftEm : 0,
                right: offsetEm,
                width: thicknessEm,
                cursor: 'ew-resize',
                background: 'transparent',
                opacity: controllable.right ? RESIZERS_OPACITY : RESIZERS_OPACITY_DISABLED,
                borderRight: controllable.right ? border : borderDisabled,
            },
            'top-left': {
                top: squareShift,
                height: squareWidthHeight,
                left: squareShift,
                width: squareWidthHeight,
                cursor: 'nwse-resize',
                background: color,
                opacity: RESIZERS_OPACITY,
            },
            'top-right': {
                top: squareShift,
                height: squareWidthHeight,
                right: squareShift,
                width: squareWidthHeight,
                cursor: 'nesw-resize',
                background: color,
                opacity: RESIZERS_OPACITY,
            },
            'bottom-left': {
                bottom: squareShift,
                height: squareWidthHeight,
                left: squareShift,
                width: squareWidthHeight,
                cursor: 'nesw-resize',
                background: color,
                opacity: RESIZERS_OPACITY,
            },
            'bottom-right': {
                bottom: squareShift,
                height: squareWidthHeight,
                right: squareShift,
                width: squareWidthHeight,
                cursor: 'nwse-resize',
                background: color,
                opacity: RESIZERS_OPACITY,
            },
        };

        const style = {
            position: 'absolute',
            zIndex: 1001,
        };

        return Object.keys(handlers).map((key: string) => {
            const handler = handlers[key];
            if (!(controllable as Record<string, boolean>)[key]) {
                if (key.includes('-')) {
                    return null;
                }
                handler.cursor = 'default';
            }
            if (frameOnly) {
                // the frame is decoration here, nothing to grab
                handler.cursor = 'default';
            }

            return (
                <div
                    key={key}
                    className="vis-editmode-resizer"
                    style={Object.assign(handler as React.CSSProperties, style)}
                    onMouseDown={
                        !frameOnly && handler.opacity === RESIZERS_OPACITY
                            ? e => this.onResizeStart(e, key as Resize)
                            : undefined
                    }
                />
            );
        });
    }

    isUserMemberOfGroup(user: string, userGroups: string[]): boolean {
        if (!userGroups) {
            return true;
        }
        if (!Array.isArray(userGroups)) {
            userGroups = [userGroups];
        }

        return !!userGroups.find(groupId => {
            const group = this.props.context.userGroups[`system.group.${groupId}`];
            return group?.common?.members?.length && group.common.members.includes(`system.user.${user}`);
        });
    }

    static isWidgetFilteredOutStatic(
        viewsActiveFilter: { [view: string]: string[] } | null,
        widgetData: WidgetData | GroupData,
        view: string,
        editMode: boolean,
    ): boolean {
        if (!viewsActiveFilter) {
            console.warn(`viewsActiveFilter is not defined in ${view}, data: ${JSON.stringify(widgetData)}`);
            return false;
        }

        const vf = viewsActiveFilter[view];
        if (!editMode && widgetData?.filterkey && vf?.length) {
            if (vf[0] === '$') {
                return true;
            }

            let filterKeys: string[];

            if (typeof widgetData.filterkey === 'string') {
                // deprecated, but for back compatibility
                filterKeys = widgetData.filterkey
                    .split(',')
                    .map(f => f.trim())
                    .filter(f => f);
            } else {
                filterKeys = widgetData.filterkey;
            }

            // we cannot use here find as filterkey could be observable (can) and is not normal array
            for (let f = 0; f < filterKeys.length; f++) {
                if (vf.includes(filterKeys[f])) {
                    return false; // widget is not hidden
                }
            }
            return true;
        }

        return false;
    }

    isWidgetFilteredOut(widgetData: WidgetData | GroupData): boolean {
        return VisBaseWidget.isWidgetFilteredOutStatic(
            this.props.viewsActiveFilter,
            widgetData,
            this.props.view,
            this.state.editMode,
        );
    }

    static isWidgetHidden(widgetData: WidgetData | GroupData, states: VisRxWidgetStateValues, id: string): boolean {
        const oid = widgetData['visibility-oid'];
        const condition = widgetData['visibility-cond'];

        if (oid) {
            if (!Object.keys(states).includes(`${oid}.val`)) {
                // if we don't have state information yet - hide to prevent shortly showing widget during render
                return true;
            }

            let val = states[`${oid}.val`];
            let value = widgetData['visibility-val'];

            if (val === undefined || val === null) {
                // the user compares explicitly against null => use the "null" placeholder in the comparison below.
                // 'exist'/'not exist' must not depend on the comparison value, so they keep the early return.
                if (value !== 'null' || condition === 'exist' || condition === 'not exist') {
                    return condition === 'not exist';
                }
                val = 'null';
            }

            if (!condition || value === undefined || value === null) {
                return condition === 'not exist';
            }

            if (val === 'null' && condition !== 'exist' && condition !== 'not exist' && value !== 'null') {
                return false;
            }

            const t = typeof val;
            if (t === 'boolean' || val === 'false' || val === 'true') {
                value = value === 'true' || value === true || value === 1 || value === '1';
            } else if (t === 'number') {
                value = parseFloat(value);
            } else if (t === 'object') {
                val = JSON.stringify(val);
            }

            // Take care: return true if the widget is hidden!
            switch (condition) {
                case '==':
                    value = value.toString();
                    val = val.toString();
                    if (val === '1') {
                        val = 'true';
                    }
                    if (value === '1') {
                        value = 'true';
                    }
                    if (val === '0') {
                        val = 'false';
                    }
                    if (value === '0') {
                        value = 'false';
                    }
                    return value !== val;
                case '!=':
                    value = value.toString();
                    val = val.toString();
                    if (val === '1') {
                        val = 'true';
                    }
                    if (value === '1') {
                        value = 'true';
                    }
                    if (val === '0') {
                        val = 'false';
                    }
                    if (value === '0') {
                        value = 'false';
                    }
                    return value === val;
                case '>=':
                    return val < value;
                case '<=':
                    return val > value;
                case '>':
                    return val <= value;
                case '<':
                    return val >= value;
                case 'consist':
                    value = value.toString();
                    val = val.toString();
                    return !val.toString().includes(value);
                case 'not consist':
                    value = value.toString();
                    val = val.toString();
                    return val.toString().includes(value);
                case 'exist':
                    return val === 'null';
                case 'not exist':
                    return val !== 'null';
                default:
                    console.log(`[${id}] Unknown visibility condition: ${condition}`);
                    return false;
            }
        } else {
            return condition && condition === 'not exist';
        }
    }

    /**
     * Render the widget body
     */
    renderWidgetBody(_props: RxRenderWidgetProps): React.JSX.Element | (React.JSX.Element | null)[] | null {
        // Default render method. Normally it should be overwritten
        if (this.props.context.views.___settings?.ignoreNotLoaded && !this.state.editMode) {
            return null;
        }
        return (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                    background: 'repeating-linear-gradient(45deg, #333, #333 10px, #666 10px, #666 20px)',
                    color: '#FFF',
                }}
            >
                <div style={{ color: '#FF0000', paddingLeft: 10 }}>
                    {I18n.t('Unknown widget type "%s"', this.props.tpl)}
                </div>
                <pre>{JSON.stringify(this.state.data, null, 2)}</pre>
            </div>
        );
    }

    static formatValue(value: string | number, decimals: number | string, _format?: string): string {
        if (typeof decimals !== 'number') {
            decimals = 2;
            _format = decimals as any as string;
        }
        const format = _format === undefined ? '.,' : _format;
        if (typeof value !== 'number') {
            value = parseFloat(value);
        }
        return Number.isNaN(value)
            ? ''
            : value
                  .toFixed(decimals || 0)
                  .replace(format[0], format[1])
                  .replace(/\B(?=(\d{3})+(?!\d))/g, format[0]);
    }

    formatIntervalHelper(value: number, type: 'seconds' | 'minutes' | 'hours' | 'days'): string {
        let singular;
        let plural;
        let special24;
        if (this.props.context.lang === 'de') {
            if (type === 'seconds') {
                singular = 'Sekunde';
                plural = 'Sekunden';
            } else if (type === 'minutes') {
                singular = 'Minute';
                plural = 'Minuten';
            } else if (type === 'hours') {
                singular = 'Stunde';
                plural = 'Stunden';
            } else if (type === 'days') {
                singular = 'Tag';
                plural = 'Tagen';
            }
        } else if (this.props.context.lang === 'ru') {
            if (type === 'seconds') {
                singular = 'секунду';
                plural = 'секунд';
                special24 = 'секунды';
            } else if (type === 'minutes') {
                singular = 'минуту';
                plural = 'минут';
                special24 = 'минуты';
            } else if (type === 'hours') {
                singular = 'час';
                plural = 'часов';
                special24 = 'часа';
            } else if (type === 'days') {
                singular = 'день';
                plural = 'дней';
                special24 = 'дня';
            }
        } else if (type === 'seconds') {
            singular = 'second';
            plural = 'seconds';
        } else if (type === 'minutes') {
            singular = 'minute';
            plural = 'minutes';
        } else if (type === 'hours') {
            singular = 'hour';
            plural = 'hours';
        } else if (type === 'days') {
            singular = 'day';
            plural = 'days';
        }

        if (value === 1) {
            if (this.props.context.lang === 'de') {
                if (type === 'days') {
                    return `einem ${singular}`;
                }
                return `einer ${singular}`;
            }

            if (this.props.context.lang === 'ru') {
                if (type === 'days' || type === 'hours') {
                    return `один ${singular}`;
                }
                return `одну ${singular}`;
            }

            return `one ${singular}`;
        }

        if (this.props.context.lang === 'de') {
            return `${value} ${plural}`;
        }

        if (this.props.context.lang === 'ru') {
            const d = value % 10;
            if (d === 1 && value !== 11) {
                return `${value} ${singular}`;
            }
            if (d >= 2 && d <= 4 && (value > 20 || value < 10)) {
                return `${value} ${special24}`;
            }

            return `${value} ${plural}`;
        }

        return `${value} ${plural}`;
    }

    formatInterval(timestamp: number, isMomentJs?: boolean): string {
        if (isMomentJs) {
            // init moment
            return this.props.context.moment(new Date(timestamp)).fromNow();
        }
        let diff = Date.now() - timestamp;
        diff = Math.round(diff / 1000);
        let text;
        if (diff <= 60) {
            if (this.props.context.lang === 'de') {
                text = `vor ${this.formatIntervalHelper(diff, 'seconds')}`;
            } else if (this.props.context.lang === 'ru') {
                text = `${this.formatIntervalHelper(diff, 'seconds')} назад`;
            } else {
                text = `${this.formatIntervalHelper(diff, 'seconds')} ago`;
            }
        } else if (diff < 3600) {
            const m = Math.floor(diff / 60);
            const s = diff - m * 60;
            text = '';
            if (this.props.context.lang === 'de') {
                text = `vor ${this.formatIntervalHelper(m, 'minutes')}`;
            } else if (this.props.context.lang === 'ru') {
                text = this.formatIntervalHelper(m, 'minutes');
            } else {
                text = this.formatIntervalHelper(m, 'minutes');
            }

            if (m < 5) {
                // add seconds
                if (this.props.context.lang === 'de') {
                    text += ` und ${this.formatIntervalHelper(s, 'seconds')}`;
                } else if (this.props.context.lang === 'ru') {
                    text += ` и ${this.formatIntervalHelper(s, 'seconds')}`;
                } else {
                    text += ` and ${this.formatIntervalHelper(s, 'seconds')}`;
                }
            }

            if (this.props.context.lang === 'de') {
                // nothing
            } else if (this.props.context.lang === 'ru') {
                text += ' назад';
            } else {
                text += ' ago';
            }
        } else if (diff < 3600 * 24) {
            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff - h * 3600) / 60);
            text = '';
            if (this.props.context.lang === 'de') {
                text = `vor ${this.formatIntervalHelper(h, 'hours')}`;
            } else if (this.props.context.lang === 'ru') {
                text = this.formatIntervalHelper(h, 'hours');
            } else {
                text = this.formatIntervalHelper(h, 'hours');
            }

            if (h < 10) {
                // add seconds
                if (this.props.context.lang === 'de') {
                    text += ` und ${this.formatIntervalHelper(m, 'minutes')}`;
                } else if (this.props.context.lang === 'ru') {
                    text += ` и ${this.formatIntervalHelper(m, 'minutes')}`;
                } else {
                    text += ` and ${this.formatIntervalHelper(m, 'minutes')}`;
                }
            }

            if (this.props.context.lang === 'de') {
                // nothing
            } else if (this.props.context.lang === 'ru') {
                text += ' назад';
            } else {
                text += ' ago';
            }
        } else {
            const d = Math.floor(diff / (3600 * 24));
            const h = Math.floor((diff - d * (3600 * 24)) / 3600);
            text = '';
            if (this.props.context.lang === 'de') {
                text = `vor ${this.formatIntervalHelper(d, 'days')}`;
            } else if (this.props.context.lang === 'ru') {
                text = this.formatIntervalHelper(d, 'days');
            } else {
                text = this.formatIntervalHelper(d, 'days');
            }

            if (d < 3) {
                // add seconds
                if (this.props.context.lang === 'de') {
                    text += ` und ${this.formatIntervalHelper(h, 'hours')}`;
                } else if (this.props.context.lang === 'ru') {
                    text += ` и ${this.formatIntervalHelper(h, 'hours')}`;
                } else {
                    text += ` and ${this.formatIntervalHelper(h, 'hours')}`;
                }
            }

            if (this.props.context.lang === 'de') {
                // nothing
            } else if (this.props.context.lang === 'ru') {
                text += ' назад';
            } else {
                text += ' ago';
            }
        }
        return text;
    }

    startUpdateInterval(): void {
        this.updateInterval =
            this.updateInterval ||
            setInterval(() => {
                const timeIntervalEl = (this.widDiv || this.refService.current)?.querySelector<HTMLDivElement>(
                    '.time-interval',
                );
                if (timeIntervalEl) {
                    const time = parseInt(timeIntervalEl.dataset.time || '', 10);
                    timeIntervalEl.innerHTML = this.formatInterval(time, timeIntervalEl.dataset.moment === 'true');
                }
            }, 10_000);
    }

    formatDate(
        value: string | Date | number,
        format?: boolean | string,
        interval?: boolean,
        isMomentJs?: boolean,
        forRx?: boolean,
    ): string | React.JSX.Element {
        if (typeof format === 'boolean') {
            interval = format;
            format = 'auto';
        }

        if (format === 'auto') {
            format = `${this.props.context.dateFormat || 'DD.MM.YYYY'} hh:mm:ss`;
        }

        format = format || this.props.context.dateFormat || 'DD.MM.YYYY';

        if (!value) {
            return '';
        }
        let dateObj: Date;
        const text = typeof value;
        // the comparison has to sit on the expression itself, a variable does not narrow the type
        if (typeof value === 'object') {
            dateObj = value instanceof Date ? value : new Date(value);
        } else if (isVarFinite(value)) {
            // a state may deliver the timestamp as string, and "1710500000000" is no date string - it has to
            // become a number before it reaches Date, otherwise the result is an "Invalid Date"
            const i = Number(value);
            // if greater than 2000.01.01 00:00:00
            dateObj = i > 946681200000 ? new Date(i) : new Date(i * 1000);
        } else {
            dateObj = new Date(value);
        }
        if (isNaN(dateObj.getTime())) {
            // show the unparsable value instead of "NaN:NaN:NaN"
            return text === 'string' ? (value as string) : '';
        }
        if (interval) {
            this.startUpdateInterval();
            if (forRx) {
                return (
                    <span
                        className="time-interval"
                        data-time={dateObj.getTime()}
                        data-moment={isMomentJs || false}
                        title={dateObj.toLocaleString()}
                    >
                        {this.formatInterval(dateObj.getTime(), isMomentJs)}
                    </span>
                );
            }

            return `<span class="time-interval" data-time="${dateObj.getTime()}" data-moment="${isMomentJs || false}">${this.formatInterval(dateObj.getTime(), isMomentJs)}</span>`;
        }

        // Year
        if (format.includes('YYYY') || format.includes('JJJJ') || format.includes('ГГГГ')) {
            const yearStr = dateObj.getFullYear().toString();
            format = format.replace('YYYY', yearStr);
            format = format.replace('JJJJ', yearStr);
            format = format.replace('ГГГГ', yearStr);
        } else if (format.includes('YY') || format.includes('JJ') || format.includes('ГГ')) {
            const yearStr = (dateObj.getFullYear() % 100).toString();
            format = format.replace('YY', yearStr);
            format = format.replace('JJ', yearStr);
            format = format.replace('ГГ', yearStr);
        }
        // Month
        if (format.includes('MM') || format.includes('ММ')) {
            const monthStr = (dateObj.getMonth() + 1).toString().padStart(2, '0');
            format = format.replace('MM', monthStr);
            format = format.replace('ММ', monthStr);
        } else if (format.includes('M') || format.includes('М')) {
            const monthStr = (dateObj.getMonth() + 1).toString();
            format = format.replace('M', monthStr);
            format = format.replace('М', monthStr);
        }

        // Day
        if (format.includes('DD') || format.includes('TT') || format.includes('ДД')) {
            const dateStr = dateObj.getDate().toString().padStart(2, '0');
            format = format.replace('DD', dateStr);
            format = format.replace('TT', dateStr);
            format = format.replace('ДД', dateStr);
        } else if (format.includes('D') || format.includes('TT') || format.includes('Д')) {
            const dateStr = dateObj.getDate().toString();
            format = format.replace('D', dateStr);
            format = format.replace('T', dateStr);
            format = format.replace('Д', dateStr);
        }

        // hours
        if (format.includes('hh') || format.includes('SS') || format.includes('чч')) {
            const hoursStr = dateObj.getHours().toString().padStart(2, '0');
            format = format.replace('hh', hoursStr);
            format = format.replace('SS', hoursStr);
            format = format.replace('чч', hoursStr);
        } else if (format.includes('h') || format.includes('S') || format.includes('ч')) {
            const hoursStr = dateObj.getHours().toString();
            format = format.replace('h', hoursStr);
            format = format.replace('S', hoursStr);
            format = format.replace('ч', hoursStr);
        }

        // minutes
        if (format.includes('mm') || format.includes('мм')) {
            const minutesStr = dateObj.getMinutes().toString().padStart(2, '0');
            format = format.replace('mm', minutesStr);
            format = format.replace('мм', minutesStr);
        } else if (format.includes('m') || format.includes('м')) {
            const minutesStr = dateObj.getMinutes().toString();
            format = format.replace('m', minutesStr);
            format = format.replace('v', minutesStr);
        }

        // milliseconds
        if (format.includes('sss') || format.includes('ссс')) {
            const msStr = dateObj.getMilliseconds().toString().padStart(3, '0');
            format = format.replace('sss', msStr);
            format = format.replace('ссс', msStr);
        }

        // seconds
        if (format.includes('ss') || format.includes('сс')) {
            const secondsStr = dateObj.getSeconds().toString().padStart(2, '0');
            format = format.replace('ss', secondsStr);
            format = format.replace('cc', secondsStr);
        } else if (format.includes('s') || format.includes('с')) {
            const secondsStr = dateObj.getSeconds().toString();
            format = format.replace('s', secondsStr);
            format = format.replace('с', secondsStr);
        }

        return format;
    }

    onToggleRelative(e: React.MouseEvent): void {
        e.stopPropagation();
        e.preventDefault();

        const widget = this.props.context.views[this.props.view].widgets[this.props.id];

        const width = this.props.isRelative ? widget.style.absoluteWidth || '100px' : '100%';

        this.props.context.onWidgetsChanged?.([
            {
                wid: this.props.id,
                view: this.props.view,
                style: {
                    position: this.props.isRelative ? 'absolute' : 'relative',
                    width,
                    absoluteWidth: !this.props.isRelative ? widget.style.width : null,
                    noPxToPercent: true, // special command
                },
            },
        ]);
    }

    onToggleWidth(e: React.MouseEvent): void {
        e.stopPropagation();
        e.preventDefault();
        const widget = this.props.context.views[this.props.view].widgets[this.props.id];

        this.props.context.onWidgetsChanged?.([
            {
                wid: this.props.id,
                view: this.props.view,
                style: {
                    width: widget.style.width === '100%' ? widget.style.absoluteWidth || '100px' : '100%',
                    absoluteWidth: widget.style.width !== '100%' ? widget.style.width : null,
                    noPxToPercent: true, // special command
                },
            },
        ]);
    }

    onToggleLineBreak(e: React.MouseEvent): void {
        e.stopPropagation();
        e.preventDefault();

        const widget = this.props.context.views[this.props.view].widgets[this.props.id];

        this.props.context.onWidgetsChanged?.([
            {
                wid: this.props.id,
                view: this.props.view,
                style: { newLine: !widget.style.newLine },
            },
        ]);
    }

    static correctStylePxValue(value?: string | number | null): string | number | undefined {
        if (typeof value === 'string') {
            if (isVarFinite(value)) {
                return parseFloat(value) || 0;
            }
        }

        return value ?? undefined;
    }

    render(): React.JSX.Element | null {
        const widget = this.props.context.views[this.props.view].widgets[this.props.id];
        if (!widget || typeof widget !== 'object') {
            console.error(`EMPTY Widget: ${this.props.id}`);
            return null;
        }

        const style: React.CSSProperties = {
            boxSizing: 'border-box',
        };
        const selected =
            !this.state.multiViewWidget && this.state.editMode && this.props.selectedWidgets?.includes(this.props.id);
        const classNames = selected ? ['vis-editmode-selected'] : ['vis-editmode-overlay-not-selected'];
        if (selected && this.state.widgetHint === 'hide') {
            classNames.push('vis-editmode-selected-background');
        }

        if (this.state.editMode && !(widget.groupid && !this.props.selectedGroup)) {
            if (!this.props.isRelative && Object.prototype.hasOwnProperty.call(this.state.style, 'top')) {
                style.top = VisBaseWidget.correctStylePxValue(this.state.style.top);
            }
            if (!this.props.isRelative && Object.prototype.hasOwnProperty.call(this.state.style, 'left')) {
                style.left = VisBaseWidget.correctStylePxValue(this.state.style.left);
            }
            if (Object.prototype.hasOwnProperty.call(this.state.style, 'width')) {
                style.width = VisBaseWidget.correctStylePxValue(this.state.style.width);
            }
            if (Object.prototype.hasOwnProperty.call(this.state.style, 'height')) {
                style.height = VisBaseWidget.correctStylePxValue(this.state.style.height);
            }
            if (!this.props.isRelative && Object.prototype.hasOwnProperty.call(this.state.style, 'right')) {
                style.right = VisBaseWidget.correctStylePxValue(this.state.style.right);
            }
            if (!this.props.isRelative && Object.prototype.hasOwnProperty.call(this.state.style, 'bottom')) {
                style.bottom = VisBaseWidget.correctStylePxValue(this.state.style.bottom);
            }

            style.position = this.props.isRelative ? 'relative' : 'absolute';
            style.userSelect = 'none';

            if (selected) {
                if (
                    this.props.moveAllowed &&
                    this.state.draggable !== false &&
                    !this.props.isRelative &&
                    (!this.props.selectedGroup || this.props.selectedGroup !== this.props.id)
                ) {
                    style.cursor = 'move';
                } else {
                    style.cursor = 'default';
                }
            } else if (widget.data?.locked) {
                style.cursor = 'default';
            } else if (this.props.selectedGroup !== this.props.id && !this.state.multiViewWidget) {
                style.cursor = 'pointer';
            }

            if (this.props.tpl?.toLowerCase().includes('image')) {
                classNames.push('vis-editmode-helper');
            }
        }

        const props = {
            className: '',
            overlayClassNames: classNames,
            style,
            id: `rx_${this.props.id}`,
            refService: this.refService,
            widget,
        };

        // If the resizable flag can be controlled dynamically by settings, and it is now not resizable
        let doNotTakeWidth = false;
        let doNotTakeHeight = false;
        if (this.visDynamicResizable && !this.isResizable()) {
            if (this.visDynamicResizable.desiredSize === false) {
                doNotTakeWidth = true;
                doNotTakeHeight = true;
                delete style.width;
                delete style.height;
            } else if (typeof this.visDynamicResizable.desiredSize === 'object') {
                if (this.state.style.width) {
                    style.width = VisBaseWidget.correctStylePxValue(this.visDynamicResizable.desiredSize.width);
                } else {
                    doNotTakeWidth = true;
                    delete style.width;
                }

                if (this.state.style.height) {
                    style.height = VisBaseWidget.correctStylePxValue(this.visDynamicResizable.desiredSize.height);
                } else {
                    doNotTakeHeight = true;
                    delete style.height;
                }
            }
        }

        if (this.props.isRelative && isVarFinite(this.props.context.views[this.props.view].settings?.rowGap)) {
            style.marginBottom =
                parseFloat((this.props.context.views[this.props.view].settings?.rowGap as string) || '0') || 0;
        }

        const rxWidget = this.renderWidgetBody(props);

        if (doNotTakeWidth) {
            delete style.width;
        }
        if (doNotTakeHeight) {
            delete style.height;
        }

        // in group edit mode show it in the top left corner
        if (this.props.id === this.props.selectedGroup) {
            style.top = 0;
            style.left = 0;
        }

        if (!this.props.isRelative) {
            style.top = style.top || 0;
            style.left = style.left || 0;
        }

        // convert string to number+'px'
        [
            'top',
            'left',
            'width',
            'height',
            'right',
            'bottom',
            'fontSize',
            'borderRadius',
            'paddingLeft',
            'paddingTop',
            'paddingRight',
            'paddingBottom',
            'marginTop',
            'marginBottom',
            'marginLeft',
            'marginRight',
            'borderWidth',
        ].forEach(attr => {
            const anyStyle = style as Record<string, number | string | undefined>;
            if (anyStyle[attr] !== undefined && typeof anyStyle[attr] === 'string') {
                if (isVarFinite(anyStyle[attr])) {
                    anyStyle[attr] = parseFloat(anyStyle[attr]) || 0;
                } else if (anyStyle[attr].includes('{')) {
                    // try to steal style by rxWidget
                    const value = (this.state.rxStyle as Record<string, string | undefined>)?.[attr];
                    if (this.state.rxStyle && value !== undefined) {
                        if (value && typeof value === 'string' && !value.includes('{')) {
                            anyStyle[attr] = VisBaseWidget.correctStylePxValue(value);
                        }
                    } else {
                        const styleVal: string | number | undefined | null = (
                            this.props.context.allWidgets[this.props.id]?.style as unknown as Record<
                                string,
                                string | number
                            >
                        )?.[attr];
                        if (styleVal !== undefined && styleVal !== null) {
                            // try to steal style by canWidget
                            if (!styleVal.toString().includes('{')) {
                                anyStyle[attr] = VisBaseWidget.correctStylePxValue(styleVal);
                            }
                        }
                    }
                }
            }
        });

        classNames.push('vis-editmode-overlay');

        let widgetName = null;
        const borderWidth =
            (typeof style.borderWidth === 'number' ? `${style.borderWidth}px` : style.borderWidth) || '0px';
        if (
            this.state.widgetHint !== 'hide' &&
            !this.state.hideHelper &&
            this.state.editMode &&
            (!widget.groupid || this.props.selectedGroup) &&
            this.props.selectedGroup !== this.props.id &&
            this.props.context.showWidgetNames !== false
        ) {
            // show widget name on widget body
            const widgetNameBottom =
                !widget.usedInWidget &&
                (this.refService.current?.offsetTop === 0 ||
                    (this.refService.current?.offsetTop && this.refService.current?.offsetTop < 15));

            // come again when the ref is filled
            if (!this.refService.current) {
                setTimeout(() => this.forceUpdate(), 50);
            }

            let multiView: string | null = null;
            let multiId: AnyWidgetId | null = null;
            if (this.state.multiViewWidget) {
                const lastUnderscore = this.props.id.lastIndexOf('_');
                multiView = this.props.id.substring(1, lastUnderscore);
                multiId = this.props.id.substring(lastUnderscore + 1) as AnyWidgetId;
            }

            const resizable = !widget.usedInWidget && this.isResizable();

            widgetName = (
                <div
                    title={
                        this.state.multiViewWidget
                            ? I18n.t('Jump to widget by double click')
                            : this.props.tpl === '_tplGroup'
                              ? I18n.t('Switch to group edit mode by double click')
                              : undefined
                    }
                    className={Utils.clsx(
                        'vis-editmode-widget-name',
                        selected && 'vis-editmode-widget-name-selected',
                        this.state.widgetHint,
                        widgetNameBottom && 'vis-editmode-widget-name-bottom',
                        this.props.isRelative && resizable && 'vis-editmode-widget-name-long',
                    )}
                    style={{
                        top: widgetNameBottom ? undefined : `calc(-14px - ${borderWidth})`,
                    }}
                    onMouseDown={e => {
                        if (this.props.context.setSelectedWidgets) {
                            this.onMouseDown(e);
                        }
                    }}
                >
                    <span>
                        {this.state.multiViewWidget
                            ? I18n.t('%s from %s', multiId, multiView)
                            : widget.data?.name || this.props.id}
                    </span>
                    {this.state.multiViewWidget || widget.usedInWidget ? null : (
                        <AnchorIcon
                            titleAccess={I18n.t('Toggle relative position')}
                            onMouseDown={e => this.onToggleRelative(e)}
                            className={Utils.clsx(
                                'vis-anchor',
                                this.props.isRelative ? 'vis-anchor-enabled' : 'vis-anchor-disabled',
                            )}
                        />
                    )}
                    {this.state.multiViewWidget ||
                    !this.props.isRelative ||
                    !resizable ||
                    widget.usedInWidget ? null : (
                        <ExpandIcon
                            titleAccess={I18n.t('Toggle full width')}
                            onMouseDown={e => this.onToggleWidth(e)}
                            className={Utils.clsx(
                                'vis-expand',
                                widget.style.width === '100%' ? 'vis-expand-enabled' : 'vis-expand-disabled',
                            )}
                        />
                    )}
                    {this.state.multiViewWidget || !this.props.isRelative || widget.usedInWidget ? null : (
                        <KeyboardReturn
                            titleAccess={I18n.t('Toggle line break')}
                            onMouseDown={e => this.onToggleLineBreak(e)}
                            className={Utils.clsx(
                                'vis-new-line',
                                widget.style.newLine ? 'vis-new-line-enabled' : 'vis-new-line-disabled',
                            )}
                        />
                    )}
                </div>
            );

            calculateOverflow(style);
        }

        // if multi-view widget and it is not "canJS", dim it in edit mode
        if (!this.isCanWidget && this.state.multiViewWidget && this.state.editMode) {
            if (style.opacity === undefined || style.opacity === null || (style.opacity as number) > 0.5) {
                style.opacity = 0.5;
            }
        }

        const overlay =
            !this.state.hideHelper && // if the helper isn't hidden
            !widget.usedInWidget && // not used in another widget, that has own overlay
            this.state.editMode && // if edit mode
            !widget.data.locked && // if not locked
            (!widget.groupid || this.props.selectedGroup) && // if not in group or in the edit group mode
            this.props.selectedGroup !== this.props.id ? ( // and it does not the edited group itself
                <div
                    className={classNames.join(' ')}
                    onMouseDown={e => {
                        if (this.props.context.setSelectedWidgets) {
                            this.onMouseDown(e);
                        }
                    }}
                />
            ) : null;

        let groupInstructions = null;

        // Show border of the group if in group edit mode
        if (this.props.selectedGroup === this.props.id) {
            style.borderBottom = '1px dotted #888';
            style.borderRight = '1px dotted #888';
            groupInstructions = (
                <div
                    style={{
                        position: 'absolute',
                        bottom: -24,
                        left: 0,
                        fontSize: 10,
                        fontStyle: 'italic',
                        opacity: 0.5,
                        width: 350,
                        cursor: 'pointer',
                    }}
                    onClick={e => {
                        e.stopPropagation();
                        this.props.context.setSelectedWidgets?.([this.props.id]);
                    }}
                >
                    {I18n.t('group_size_hint')}
                </div>
            );
        }

        const signals = this.renderSignals?.() || null;

        const lastChange = this.renderLastChange?.(style) || null;

        // Everything the editor puts on top of the widget itself: the position while it is being dragged and
        // the crosshair of the steal mode. Both are state and are applied here instead of being written into
        // the DOM, so that this render is the only thing that decides how the service div looks.
        this.renderedBaseGeometry = {
            left: parseFloat(style.left as string),
            top: parseFloat(style.top as string),
            width: parseFloat(style.width as string),
            height: parseFloat(style.height as string),
        };

        let serviceStyle: React.CSSProperties = style;
        if (this.state.gesture) {
            serviceStyle = { ...serviceStyle, ...this.state.gesture.style };
        }
        if (this.state.stealMode) {
            serviceStyle = { ...serviceStyle, cursor: 'crosshair' };
        }

        // The name plate and the resize handles are drawn outside the widget, so they are not its children: they
        // go into the adorner layer of the view, onto a div that mirrors the padding box of this widget. The
        // overlay stays here - it covers the widget exactly and decides which widget a click selects, which has
        // to keep following the order of the widgets themselves.
        const resizeHandlers = this.getResizeHandlers(selected, widget, borderWidth);
        const layer = this.state.editMode ? getAdornerLayer(this.props.view) : null;
        const marksRect = this.marksRect;
        const marks =
            layer && (widgetName || resizeHandlers)
                ? createPortal(
                      <div
                          ref={this.refMarks}
                          className="vis-editmode-marks"
                          style={{
                              position: 'absolute',
                              // the last measurement; updateMarksRect() writes the exact values after this render
                              left: marksRect?.left ?? 0,
                              top: marksRect?.top ?? 0,
                              width: marksRect?.width ?? 0,
                              height: marksRect?.height ?? 0,
                              // the layer lets clicks through; only the marks themselves take the mouse back
                              pointerEvents: 'none',
                          }}
                      >
                          {widgetName}
                          {resizeHandlers}
                      </div>,
                      layer,
                  )
                : null;

        return (
            <div
                id={props.id}
                className={
                    this.state.stealMode ? addClass(props.className, 'vis-editmode-steal-style') : props.className
                }
                ref={this.refService}
                style={serviceStyle}
            >
                {signals}
                {lastChange}
                {overlay}
                {rxWidget}
                {groupInstructions}
                {marks}
            </div>
        );
    }
}

export default VisBaseWidget;
