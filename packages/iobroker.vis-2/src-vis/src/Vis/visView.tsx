/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2022-2026 Denis Haev https://github.com/GermanBluefox,
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
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';

import { I18n, Utils } from '@iobroker/gui-components';

import type VisRxWidget from '@/Vis/visRxWidget';
import createTheme from '@/theme';
import type {
    AnyWidgetId,
    GroupWidgetId,
    Widget,
    ViewSettings,
    VisContext,
    WidgetStyle,
    VisViewProps,
    SingleWidget,
    GroupWidget,
    AskViewCommand,
    WidgetReference,
    ViewCommand,
    ViewCommandOptions,
    ViewSection,
} from '@iobroker/types-vis-2';
import { hasWidgetAccess, isVarFinite } from '@/Utilities/utils';
import { registerAdornerLayer } from './visAdornerLayer';
import { recalculateFields, selectView, store } from '@/Store';

import VisBaseWidget from './visBaseWidget';
import VisCanWidget from './visCanWidget';
import { addClass, parseDimension } from './visUtils';
import {
    autoScrollSpeed,
    type Box,
    computeRelativeOrder,
    computeRulers,
    droppedOrderIsDone,
    selectionRect,
    snapToGrid,
    snapToWidgets,
} from './visViewGeometry';
import {
    applyGridDrop,
    buildGridSections,
    computeGridDrop,
    getGridLayout,
    getGridMaxWidth,
    getSectionColumnCount,
    GRID_COLUMNS,
    GRID_COLUMNS_VAR,
    type GridSection,
    gridDropIsDone,
    newSectionId,
} from './visGridLayout';
import { hasWidthVisibility, isShownAtWidth } from './visWidthVisibility';
import VisNavigation from './visNavigation';
import VisWidgetsCatalog from './visWidgetsCatalog';
import VisWidgetErrorBoundary from './visWidgetErrorBoundary';

const MAX_COLUMNS = 8;

/** How far the mouse has to move, in pixels, before a press on a widget becomes a drag and not a click */
const DRAG_THRESHOLD = 3;

export type { ViewCommand, ViewCommandOptions };

declare global {
    interface Window {
        _lastAppliedStyle: string;
    }
}

interface VisViewMovement {
    selectedWidgetsWithRectangle?: AnyWidgetId[];
    moved?: boolean;
    x: number;
    y: number;
    startX?: number;
    startY?: number;
    w?: number;
    h?: number;
    simpleMode?: boolean;
    isResize?: boolean;
    startWidget?: DOMRect;
    /** The pane the view scrolls in, see updateAutoScroll() */
    scroller?: HTMLElement | null;
    /** How far the pane was scrolled when the gesture started */
    scrollLeft?: number;
    scrollTop?: number;
}

interface ViewElement extends HTMLDivElement {
    _originalParent?: HTMLElement;
}

interface CreateWidgetOptions {
    context: VisContext;
    editMode: boolean;
    id: AnyWidgetId;
    isRelative: boolean;
    mouseDownOnView:
        | null
        | ((
              e: React.MouseEvent,
              wid: AnyWidgetId,
              isRelative: boolean,
              isResize?: boolean,
              isDoubleClick?: boolean,
          ) => void);
    moveAllowed: boolean;
    ignoreMouseEvents?: boolean | undefined;
    onIgnoreMouseEvents?: (ignore: boolean) => void;
    refParent: React.RefObject<HTMLElement | null>;
    askView: (command: AskViewCommand, props?: WidgetReference) => any;
    relativeWidgetOrder: AnyWidgetId[];
    selectedGroup: GroupWidgetId | null;
    selectedWidgets: AnyWidgetId[];
    view: string;
    viewsActiveFilter: Record<string, string[]>;
    customSettings: Record<string, any> | undefined;
    index?: number;
    /** The widget is a cell of a section of the grid layout */
    gridCell?: boolean;
    /** The width of the view, for the widths the widget is shown at, see visWidthVisibility.ts */
    viewWidth?: number;
}

interface VisViewState {
    mounted: boolean;
    rulers: { type: 'horizontal' | 'vertical'; value: number }[];
    loadedjQueryTheme: string;
    themeCode: string;
    width: number;
    menuWidth: 'hidden' | 'full' | 'narrow';
    /**
     * A relative widget is being dragged to another place in the order.
     *
     * The grid of the relative widgets is a pure function of their order - they are distributed round-robin
     * over the columns - so reordering is an operation on this array and not on the DOM. The dragged widget
     * itself is lifted out of the flow and follows the cursor, and a placeholder of its size keeps the slot it
     * would drop into, which is what makes the other widgets flow around it while the gesture runs.
     */
    relativeDrag: {
        wid: AnyWidgetId;
        order: AnyWidgetId[];
        width: number;
        height: number;
        /**
         * The widget has been dropped and sits in the flow again, but the order is still the tentative one: the
         * project is written debounced, so letting go of it here would show the old order for a moment.
         */
        dropped?: boolean;
    } | null;
    /**
     * A widget of the grid layout is being dragged to another place, see computeGridDrop().
     *
     * The same as `relativeDrag`, only that the layout is a list of sections and not a single order: the view is
     * rendered from these sections while the gesture runs, with a placeholder in the slot the widget would drop
     * into, and after the drop until the project carries the new sections.
     */
    gridDrag: {
        wid: AnyWidgetId;
        sections: GridSection[];
        dropped?: boolean;
    } | null;
}

class VisView extends React.Component<VisViewProps, VisViewState> {
    // 1300 z-index is the React dialog
    static Z_INDEXES = {
        VIEW_SELECT_RECTANGLE: 1201,
        WIDGET_SERVICE_DIV: 1200,
    };

    static themeCache: Record<string, string> = {};

    /** Selected widgets. Only the editor passes them, in the runtime nothing is selected. */
    private get selectedWidgets(): AnyWidgetId[] {
        return this.gestureSelection || this.props.selectedWidgets || [];
    }

    /**
     * The widget a running gesture works on when the press selected it only now, see mouseDownOnView(): the new
     * selection is on its way through the props.
     */
    private gestureSelection: AnyWidgetId[] | null = null;

    /** Takes the pressed relative widget out of the flow, once the mouse really moves - see mouseDownOnView() */
    private startDragOnMove: (() => void) | null = null;

    /** Order of the relative widgets as the last render used it - the drag gesture starts from it */
    private lastRelativeOrder: AnyWidgetId[] = [];

    /** The sections of the grid layout as the project gives them, as the last render worked them out */
    private lastGridSections: GridSection[] = [];

    /**
     * The drag in the grid layout as the gesture has it at this moment. `state.gridDrag` follows it for rendering,
     * but a quick gesture is over before React has rendered it, so the gesture itself reads this.
     */
    private gridDragNow: VisViewState['gridDrag'] = null;

    /** The last move of a running gesture, replayed while the pane scrolls by itself, see updateAutoScroll() */
    private lastMoveEvent: MouseEvent | null = null;

    /** The next step of the pane scrolling by itself */
    private autoScrollFrame: number | null = null;

    /** Half transparent copy of a dragged relative widget, see createDragGhost() */
    private dragGhost: HTMLElement | null = null;

    /** Where inside the widget the drag started, so the copy stays under that point */
    private dragGhostOffset: { x: number; y: number } = { x: 0, y: 0 };

    /** Last resort that ends a dropped order the project never carried, see `onMouseWidgetUp` */
    private droppedOrderTimer: ReturnType<typeof setTimeout> | null = null;

    private readonly promiseToCollect: Promise<Record<string, VisRxWidget<any>>>;

    private readonly refView: React.RefObject<ViewElement | null>;

    private readonly refRelativeView: React.RefObject<HTMLDivElement | null>;

    /** Where the editor marks of every widget of this view are drawn, see visAdornerLayer.ts */
    private readonly refAdornerLayer: React.RefObject<HTMLDivElement | null>;

    /** The layer the widgets were told about, to notice when it appears or goes */
    private announcedAdornerLayer: HTMLDivElement | null = null;

    /** The div with the limited screen size, that contains all widgets if the view is limited */
    private readonly refLimitScreen: React.RefObject<HTMLDivElement | null>;

    private readonly refRelativeColumnsView: React.RefObject<HTMLDivElement | null>[];

    /** The divs of the sections of the grid layout, by section id: the can.js widgets are inserted into them */
    private readonly refGridSections: Record<string, React.RefObject<HTMLDivElement | null>> = {};

    /**
     * Measures the relative view whenever its size changes. The section columns of the grid layout - and the
     * columns of the column layout - follow its width, and a window or a container that gets narrower does not
     * necessarily render the view again.
     */
    private resizeObserver: ResizeObserver | null = null;

    /** The element the resize observer watches, to notice when the relative view appears or goes */
    private observedRelativeView: HTMLDivElement | null = null;

    /** A widget of the view is shown only at some widths of it, see visWidthVisibility.ts; set by render() */
    private usesWidthVisibility = false;

    /**
     * Watches the sections and the cells of the grid layout in the editor. A widget that changes its cells moves
     * the ones after it without rendering them, and so does a widget that is dropped elsewhere. This tells them,
     * so that their marks - and the service divs of the can.js widgets, which lie over them - follow.
     */
    private gridCellObserver: ResizeObserver | null = null;

    /** The arrangement of the sections the last render showed, and the one the observer was set up for */
    private renderedGridLayout = '';

    private observedGridLayout = '';

    private widgetsRefs: Record<AnyWidgetId, WidgetReference>;

    private selectDiv: HTMLDivElement | null;

    private movement: VisViewMovement | null;

    private readonly theme: Record<string, any>;

    private ignoreMouseEvents: boolean;

    private oldFilter: string;

    private registerDone = false;

    private lastClick = 0;

    private nextClickIsSteal: {
        attr: string;
        cb: (value: string | number | boolean | null) => void;
    } | null = null;

    private loadingTheme = false;

    private moveTimer: ReturnType<typeof setTimeout> | null = null;

    private keysHandlerInstalled = false;

    constructor(props: VisViewProps) {
        super(props);
        this.promiseToCollect = VisWidgetsCatalog.collectRxInformation(
            props.context.socket,
            store.getState().visProject,
            props.context.changeProject,
        );

        this.state = {
            mounted: false,
            rulers: [],
            loadedjQueryTheme: '',
            themeCode: '',
            width: 0,
            menuWidth: (window.localStorage.getItem('vis.menuWidth') as null | 'narrow' | 'full' | 'hidden') || 'full',
            relativeDrag: null,
            gridDrag: null,
        };

        this.refView = React.createRef();
        this.refRelativeView = React.createRef();
        this.refAdornerLayer = React.createRef();
        this.refLimitScreen = React.createRef();
        this.refRelativeColumnsView = new Array(MAX_COLUMNS);
        for (let r = 0; r < MAX_COLUMNS; r++) {
            this.refRelativeColumnsView[r] = React.createRef();
        }
        this.widgetsRefs = {};
        this.selectDiv = null;
        this.movement = null;
        this.theme = {}; // cache for custom themes
        this.ignoreMouseEvents = false;

        // remember filter
        this.oldFilter = JSON.stringify(props.viewsActiveFilter?.[this.props.view] || []);
    }

    /**
     * Tell the widgets of this view where to draw their marks.
     *
     * React commits the children before their parent, so a widget renders for the first time while the layer of
     * the view does not exist yet and finds nothing to draw into. Announcing it afterwards therefore has to
     * render the widgets again, once, when the layer appears or goes away.
     */
    private announceAdornerLayer(): void {
        const layer = this.refAdornerLayer.current;
        if (layer === this.announcedAdornerLayer) {
            return;
        }
        this.announcedAdornerLayer = layer;
        registerAdornerLayer(this.props.view, layer);
        this.forceUpdate();
    }

    /**
     * Watch the size of the relative view - or of the view itself while it has no relative widgets: the widths the
     * widgets may be shown at are measured against it as well, see visWidthVisibility.ts. The relative view is only
     * rendered while the view has relative widgets, so what is watched can change at every render.
     */
    private observeRelativeView(): void {
        // A view of absolute widgets only is watched only if a widget depends on its width: every change of the
        // width renders the whole view again.
        const element = this.refRelativeView.current || (this.usesWidthVisibility ? this.refView.current : null);
        if (element === this.observedRelativeView) {
            return;
        }
        this.resizeObserver?.disconnect();
        this.observedRelativeView = element;
        if (element && typeof ResizeObserver !== 'undefined') {
            this.resizeObserver ||= new ResizeObserver(() => this.updateViewWidth());
            this.resizeObserver.observe(element);
        }
    }

    /**
     * Watch the sections and cells of the grid layout, see `gridCellObserver`. It is set up anew whenever the
     * arrangement changed, since that brings other elements. A fresh observation reports at once, which tells the
     * widgets about the arrangement that just changed as well.
     */
    private observeGridCells(): void {
        if (!this.props.editMode || !this.isGridLayout() || typeof ResizeObserver === 'undefined') {
            this.gridCellObserver?.disconnect();
            this.observedGridLayout = '';
            return;
        }
        if (this.renderedGridLayout === this.observedGridLayout) {
            return;
        }
        this.observedGridLayout = this.renderedGridLayout;

        const observer = (this.gridCellObserver ||= new ResizeObserver(() => this.updateWidgetPositions()));
        observer.disconnect();
        Object.values(this.refGridSections).forEach(ref => {
            const section = ref.current;
            if (section) {
                observer.observe(section);
                Array.from(section.children).forEach(cell => observer.observe(cell));
            }
        });
    }

    /** Tell every widget of the view that it may have been moved without being rendered */
    private updateWidgetPositions(): void {
        Object.values(this.widgetsRefs).forEach(ref => ref?.onCommand?.('updatePosition'));
    }

    async componentDidMount(): Promise<void> {
        this.updateViewWidth();
        this.observeRelativeView();
        this.announceAdornerLayer();

        await this.promiseToCollect;
        this.props.context.linkContext.registerViewRef(this.props.view, this.refView, this.onCommand);

        await this.loadJqueryTheme(this.getJQueryThemeName());
        this.setState({ mounted: true }, () => this.registerEditorHandlers());
    }

    componentWillUnmount(): void {
        if (this.droppedOrderTimer) {
            clearTimeout(this.droppedOrderTimer);
            this.droppedOrderTimer = null;
        }
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        this.observedRelativeView = null;
        this.gridCellObserver?.disconnect();
        this.gridCellObserver = null;
        this.stopAutoScroll();
        window.removeEventListener('mousemove', this.onWindowMoveDuringGesture);
        this.announcedAdornerLayer = null;
        registerAdornerLayer(this.props.view, null);
        this.props.context.linkContext.unregisterViewRef(this.props.view, this.refView);

        if (this.refView.current?._originalParent) {
            this.refView.current._originalParent.appendChild(this.refView.current);
            this.refView.current._originalParent = undefined;
        }

        if (this.selectDiv) {
            this.selectDiv.remove();
            this.selectDiv = null;
        }
        this.widgetsRefs = {};
        this.registerEditorHandlers(true);
        this.uninstallKeyHandlers();
    }

    onCommand = (command: ViewCommand, options?: ViewCommandOptions): string[] | null => {
        if (command === 'updateContainers') {
            // send to all widgets the command
            Object.keys(this.widgetsRefs).forEach(wid => {
                if (this.widgetsRefs[wid as AnyWidgetId]?.onCommand) {
                    this.widgetsRefs[wid as AnyWidgetId].onCommand?.('updateContainers');
                }
            });

            return null;
        }

        if (command === 'changeFilter') {
            this.changeFilter(options);
            return null;
        }

        if (command === 'closeDialog' || command === 'openDialog') {
            if (this.widgetsRefs[options as unknown as AnyWidgetId]?.onCommand) {
                this.widgetsRefs[options as unknown as AnyWidgetId].onCommand?.(command);
            }
            return null;
        }

        if (command === 'collectFilters') {
            const widgets = store.getState().visProject[this.props.view].widgets;
            const filterList: string[] = [];

            Object.keys(widgets).forEach(wid => {
                let filterValues: string[] | string;
                if (this.widgetsRefs[wid as AnyWidgetId]?.onCommand) {
                    // take bound information
                    filterValues = this.widgetsRefs[wid as AnyWidgetId]?.onCommand?.('collectFilters') as string[];
                } else {
                    filterValues = widgets[wid as AnyWidgetId]?.data?.filterkey || '';
                }
                if (filterValues) {
                    if (filterValues && typeof filterValues === 'string') {
                        filterValues = filterValues
                            .split(',')
                            .map((f: string) => f.trim())
                            .filter(f => f);
                    }
                    (filterValues as string[]).forEach((f: string) => !filterList.includes(f) && filterList.push(f));
                }
            });

            return filterList;
        }
        return null;
    };

    changeFilter(options?: ViewCommandOptions): null {
        const rawFilter = options && 'filter' in options ? options.filter : [];

        // a single filter may arrive as a plain string
        let filter: string[] | undefined;
        if (Array.isArray(rawFilter)) {
            filter = rawFilter;
        } else if (rawFilter) {
            filter = [rawFilter];
        }

        if (filter) {
            this.props.viewsActiveFilter[this.props.view] = filter;

            // inform every widget about the changed filter
            Object.keys(this.widgetsRefs).forEach(wid => {
                if (this.widgetsRefs[wid as AnyWidgetId]?.onCommand) {
                    this.widgetsRefs[wid as AnyWidgetId].onCommand?.('changeFilter');
                }
            });

            // inform bars about changed filter
            if (window.vis.binds.bars?.filterChanged) {
                try {
                    window.vis.binds.bars.filterChanged(this.props.view, filter.join(','));
                } catch (error) {
                    console.error(`Cannot change filter: ${error as Error}`);
                }
            }
        }

        return null;
    }

    askView = (command: AskViewCommand, props?: WidgetReference): any => {
        const widgetsRefs = this.widgetsRefs;
        if (command === 'register') {
            if (props) {
                const id = props.id;
                widgetsRefs[id] = props;
            }
        } else if (command === 'unregister') {
            if (props && widgetsRefs[props.id] && widgetsRefs[props.id].uuid === props.uuid) {
                delete widgetsRefs[props.id];
            }
        } else if (command === 'update') {
            if (props && widgetsRefs[props.id] && widgetsRefs[props.id].uuid === props.uuid) {
                Object.assign(widgetsRefs[props.id], props);
            }
        } else if (command === 'getRef') {
            if (props) {
                return widgetsRefs[props.id];
            }
        } else if (command === 'getViewClass') {
            return this;
        }
        return null;
    };

    onMouseWindowDown = (e: MouseEvent): void => {
        if (!this.refView.current?.contains(e.target as Node)) {
            // Clicked outside the box
            this.cancelStealMode(null);
        }
    };

    onStealStyle = (attr: string, cb: (value: string | number | boolean | null) => void): void => {
        if (!attr) {
            this.cancelStealMode(null);
            return;
        }
        // the next click will be processed as steal
        this.nextClickIsSteal = {
            attr,
            cb,
        };
        Object.keys(this.widgetsRefs).forEach(wid => {
            if (this.widgetsRefs[wid as AnyWidgetId]?.onCommand) {
                this.widgetsRefs[wid as AnyWidgetId].onCommand?.('startStealMode');
            }
        });

        window.document.addEventListener('mousedown', this.onMouseWindowDown);
    };

    cancelStealMode(result: string | number | boolean | null): void {
        if (this.nextClickIsSteal) {
            window.document.removeEventListener('mousedown', this.onMouseWindowDown);
            this.nextClickIsSteal.cb(result);
            Object.keys(this.widgetsRefs).forEach(wid => {
                const onCommand = this.widgetsRefs[wid as AnyWidgetId]?.onCommand;
                if (onCommand) {
                    onCommand('cancelStealMode');
                }
            });
            this.nextClickIsSteal = null;
        }
    }

    mouseDownLocal = this.props.context.runtime
        ? null
        : (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
              if (this.ignoreMouseEvents) {
                  return;
              }
              if (e.button === 2) {
                  return;
              }

              if (this.nextClickIsSteal) {
                  // click canceled
                  this.cancelStealMode(null);
                  return;
              }

              this.gestureSelection = null;
              this.props.context.setSelectedWidgets?.([]);

              this.onMouseViewMove && window.document.addEventListener('mousemove', this.onMouseViewMove);
              this.onMouseViewUp && window.document.addEventListener('mouseup', this.onMouseViewUp);

              const rect = this.refView.current?.getBoundingClientRect();

              if (!rect) {
                  return;
              }

              this.movement = {
                  moved: false,
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  startX: e.pageX,
                  startY: e.pageY,
                  w: 0,
                  h: 0,
                  selectedWidgetsWithRectangle: [],
                  simpleMode: e.shiftKey || e.ctrlKey,
              };
          };

    doubleClickOnView = (): void => {
        if (
            this.props.editMode &&
            this.selectedWidgets?.length === 1 &&
            store.getState().visProject[this.props.view].widgets[this.selectedWidgets[0]].tpl === '_tplGroup'
        ) {
            this.props.context.setSelectedGroup?.(this.selectedWidgets[0] as GroupWidgetId);
        }
    };

    getWidgetsInRect(
        rect: { top: number; left: number; bottom: number; right: number },
        simpleMode: boolean,
    ): AnyWidgetId[] {
        // take actual position
        const widgets: (string | null)[] = Object.keys(this.widgetsRefs).filter(id => {
            if (!store.getState().visProject[this.props.view].widgets[id as AnyWidgetId]) {
                // orphaned widget
                id !== 'fakeId' && console.warn(`Orphaned widget ${id} found!`);
                return null;
            }

            if (
                store.getState().visProject[this.props.view].widgets[id as AnyWidgetId].groupid &&
                !this.props.selectedGroup
            ) {
                return null;
            }
            const widDiv =
                this.widgetsRefs[id as AnyWidgetId].widDiv || this.widgetsRefs[id as AnyWidgetId].refService?.current;
            if (widDiv) {
                const wRect = widDiv.getBoundingClientRect();
                if (simpleMode) {
                    // top left corner
                    if (
                        wRect.top >= rect.top &&
                        wRect.top <= rect.bottom &&
                        wRect.left >= rect.left &&
                        wRect.left <= rect.right
                    ) {
                        return true;
                    }
                    // bottom right corner
                    if (
                        wRect.bottom >= rect.top &&
                        wRect.bottom <= rect.bottom &&
                        wRect.right >= rect.left &&
                        wRect.right <= rect.right
                    ) {
                        return true;
                    }
                    // top right corner
                    if (
                        wRect.top >= rect.top &&
                        wRect.top <= rect.bottom &&
                        wRect.right >= rect.left &&
                        wRect.right <= rect.right
                    ) {
                        return true;
                    }
                    // bottom left corner
                    if (
                        wRect.bottom >= rect.top &&
                        wRect.bottom <= rect.bottom &&
                        wRect.left >= rect.left &&
                        wRect.left <= rect.right
                    ) {
                        return true;
                    }
                } else if (
                    wRect.top >= rect.top &&
                    wRect.top <= rect.bottom &&
                    wRect.left >= rect.left &&
                    wRect.left <= rect.right &&
                    wRect.bottom >= rect.top &&
                    wRect.bottom <= rect.bottom &&
                    wRect.right >= rect.left &&
                    wRect.right <= rect.right
                ) {
                    return true;
                }
            }

            return false;
        });

        widgets.sort();
        return widgets as AnyWidgetId[];
    }

    onMouseViewMove = !this.props.context.runtime
        ? (e: MouseEvent) => {
              if (this.ignoreMouseEvents || !this.movement) {
                  return;
              }
              if (!this.selectDiv && this.refView.current) {
                  // create selectDiv
                  this.selectDiv = window.document.createElement('div');
                  this.selectDiv.style.position = 'absolute';
                  this.selectDiv.style.zIndex = VisView.Z_INDEXES.VIEW_SELECT_RECTANGLE.toString();
                  this.selectDiv.className = 'vis-editmode-select-rect';
                  this.refView.current.appendChild(this.selectDiv);
              }

              this.movement.moved = true;
              this.movement.w = e.pageX - (this.movement.startX || 0);
              this.movement.h = e.pageY - (this.movement.startY || 0);

              if (this.selectDiv) {
                  const rect = selectionRect(this.movement as Required<VisViewMovement>);
                  this.selectDiv.style.left = `${rect.left}px`;
                  this.selectDiv.style.top = `${rect.top}px`;
                  this.selectDiv.style.width = `${rect.width}px`;
                  this.selectDiv.style.height = `${rect.height}px`;
                  // get selected widgets
                  const widgets: AnyWidgetId[] = this.getWidgetsInRect(
                      this.selectDiv.getBoundingClientRect(),
                      this.movement.simpleMode || false,
                  );
                  if (
                      this.movement.selectedWidgetsWithRectangle &&
                      JSON.stringify(widgets) !== JSON.stringify(this.movement.selectedWidgetsWithRectangle)
                  ) {
                      // select
                      widgets.forEach(id => {
                          if (
                              !this.movement?.selectedWidgetsWithRectangle?.includes(id) &&
                              this.widgetsRefs[id] &&
                              !store.getState().visProject[this.props.view].widgets[id].data.locked &&
                              this.props.selectedGroup !== id
                          ) {
                              if (this.widgetsRefs[id]?.onTempSelect) {
                                  this.widgetsRefs[id].onTempSelect(true);
                              }
                          }
                      });
                      // deselect
                      this.movement.selectedWidgetsWithRectangle.forEach(id => {
                          if (!widgets.includes(id) && this.widgetsRefs[id]?.onTempSelect) {
                              this.widgetsRefs[id].onTempSelect(false);
                          }
                      });
                      this.movement.selectedWidgetsWithRectangle = widgets.filter(
                          widget => !store.getState().visProject[this.props.view].widgets[widget].data.locked,
                      );
                  }
              }
          }
        : null;

    onMouseViewUp = !this.props.context.runtime
        ? (e: MouseEvent) => {
              if (this.ignoreMouseEvents) {
                  return;
              }
              e?.stopPropagation();
              this.onMouseViewMove && window.document.removeEventListener('mousemove', this.onMouseViewMove);
              this.onMouseViewUp && window.document.removeEventListener('mouseup', this.onMouseViewUp);
              if (this.selectDiv) {
                  this.selectDiv.remove();
                  this.selectDiv = null;
              }

              // deselect widgets
              this.movement?.selectedWidgetsWithRectangle &&
                  this.props.context.setSelectedWidgets?.(this.movement.selectedWidgetsWithRectangle);

              this.movement = null;
          }
        : null;

    // Called from Widget
    mouseDownOnView = this.props.context.runtime
        ? null
        : (
              e: React.MouseEvent,
              wid: AnyWidgetId,
              _isRelative: boolean,
              isResize?: boolean,
              isDoubleClick?: boolean,
          ) => {
              if (this.ignoreMouseEvents) {
                  return;
              }
              if (this.nextClickIsSteal) {
                  // send to App.js the stolen attribute

                  if (this.widgetsRefs[wid]) {
                      const ref = this.widgetsRefs[wid].widDiv || this.widgetsRefs[wid].refService?.current;
                      this.cancelStealMode(ref ? (ref.style as Record<string, any>)[this.nextClickIsSteal.attr] : null);
                  } else {
                      this.cancelStealMode(null);
                  }
                  return;
              }

              // A press on a widget that is not selected yet selects it and moves it at once, see
              // VisBaseWidget.onMouseDown(). The new selection only comes back through the props with the next
              // render, so this gesture works on the pressed widget until then.
              this.gestureSelection = this.props.selectedWidgets?.includes(wid) ? null : [wid];

              if (
                  this.props.context.disableInteraction ||
                  this.props.context.lockDragging ||
                  this.selectedWidgets
                      .map(
                          (selectedWidget: AnyWidgetId) =>
                              store.getState().visProject[this.props.view].widgets[selectedWidget],
                      )
                      .find((widget: GroupWidget | SingleWidget) => widget.data.locked)
              ) {
                  return;
              }

              // detect double click
              if ((this.lastClick && Date.now() - this.lastClick < 250) || isDoubleClick) {
                  this.lastClick = Date.now();
                  if (
                      this.selectedWidgets.length === 1 &&
                      store.getState().visProject[this.props.view].widgets[this.selectedWidgets[0]].tpl === '_tplGroup'
                  ) {
                      this.props.context.setSelectedGroup?.(this.selectedWidgets[0] as GroupWidgetId);
                  }
                  return;
              }

              this.lastClick = Date.now();

              if (this.props.selectedGroup && this.selectedWidgets.includes(this.props.selectedGroup) && !isResize) {
                  return;
              }

              this.onMouseWidgetMove && this.refView.current?.addEventListener('mousemove', this.onMouseWidgetMove);
              this.onMouseWidgetUp && window.document.addEventListener('mouseup', this.onMouseWidgetUp);

              // outside the view as well, so that the pane scrolls with the cursor over the toolbar above it
              window.addEventListener('mousemove', this.onWindowMoveDuringGesture);

              const scroller = VisView.findScrollParent(this.refView.current);
              this.movement = {
                  moved: false,
                  startX: e.pageX,
                  startY: e.pageY,
                  isResize,
                  x: 0,
                  y: 0,
                  scroller,
                  scrollLeft: scroller?.scrollLeft || 0,
                  scrollTop: scroller?.scrollTop || 0,
              };

              const widgetsRefs = this.widgetsRefs;

              this.selectedWidgets.forEach((selectedWidget: AnyWidgetId) => {
                  const widgetRect = widgetsRefs[selectedWidget]?.refService?.current?.getBoundingClientRect();
                  if (
                      this.movement &&
                      widgetRect &&
                      e.pageX <= widgetRect.right &&
                      e.pageX >= widgetRect.left &&
                      e.pageY <= widgetRect.bottom &&
                      e.pageY >= widgetRect.top
                  ) {
                      this.movement.startWidget =
                          widgetsRefs[selectedWidget]?.refService?.current?.getBoundingClientRect();
                  }
              });

              const gridLayout = this.isGridLayout();
              const { clientX, clientY } = e;

              // A relative widget is taken out of the flow for the drag and a placeholder holds its slot. That is
              // done only once the mouse really moves (see onMouseWidgetMove): a press that is only a click - the
              // one that selects the widget, say - must not swap it for the placeholder and back.
              this.startDragOnMove = null;

              // In the grid layout a single widget is dragged over the sections instead; it starts from the
              // sections as they are rendered.
              if (!isResize && this.selectedWidgets.length === 1 && gridLayout) {
                  const draggedId = this.selectedWidgets[0];
                  this.startDragOnMove = () => {
                      // the can.js div is the cell of a vis-1 widget, its service div only lies over it
                      const element =
                          this.widgetsRefs[draggedId]?.widDiv || this.widgetsRefs[draggedId]?.refService?.current;
                      const rect = element?.getBoundingClientRect();
                      if (
                          element &&
                          rect &&
                          this.lastGridSections.some(section => section.widgets.includes(draggedId))
                      ) {
                          if (this.droppedOrderTimer) {
                              clearTimeout(this.droppedOrderTimer);
                              this.droppedOrderTimer = null;
                          }
                          this.createDragGhost(element, rect, clientX, clientY);
                          this.gridDragNow = { wid: draggedId, sections: this.lastGridSections };
                          this.setState({ gridDrag: this.gridDragNow });
                      }
                  };
              }

              // A single relative widget can be dragged to another place in the order. Take the order it starts
              // from and the size the placeholder has to reserve; both stay fixed for the whole gesture.
              if (!isResize && this.selectedWidgets.length === 1 && !this.props.selectedGroup && !gridLayout) {
                  const draggedId = this.selectedWidgets[0];
                  this.startDragOnMove = () => {
                      const order = this.getRelativeWidgetOrder();
                      const element = this.widgetsRefs[draggedId]?.refService?.current;
                      const rect = element?.getBoundingClientRect();
                      if (order.includes(draggedId) && element && rect) {
                          if (this.droppedOrderTimer) {
                              // the previous drop is over - this gesture brings its own order
                              clearTimeout(this.droppedOrderTimer);
                              this.droppedOrderTimer = null;
                          }
                          this.createDragGhost(element, rect, clientX, clientY);
                          this.setState({
                              relativeDrag: {
                                  wid: draggedId,
                                  order,
                                  width: rect.width,
                                  height: rect.height,
                              },
                          });
                      }
                  };
              }

              this.selectedWidgets.forEach((_wid: AnyWidgetId) => {
                  if (widgetsRefs[_wid]?.onMove) {
                      widgetsRefs[_wid].onMove(); // indicate the start of movement
                  }
              });

              // Indicate about movement start
              Object.keys(widgetsRefs).forEach(_wid => {
                  if (widgetsRefs[_wid as AnyWidgetId]?.onCommand) {
                      widgetsRefs[_wid as AnyWidgetId].onCommand?.('startMove');
                  }
              });
          };

    /**
     * The relative widgets are arranged in the sections of a grid, and not in columns. A group that is being
     * edited shows its members as they are in the group.
     */
    isGridLayout(): boolean {
        return !this.props.selectedGroup && store.getState().visProject[this.props.view]?.settings?.layout === 'grid';
    }

    /** The order of the relative widgets the last render used */
    getRelativeWidgetOrder(): AnyWidgetId[] {
        return [...this.lastRelativeOrder];
    }

    /**
     * Build the half transparent copy that follows the cursor while a relative widget is dragged.
     *
     * It is a plain clone outside of React on purpose. The widget itself cannot be moved under the cursor: it
     * would have to leave its column, and changing the parent in the React tree unmounts and remounts the
     * component - it would lose its state in the middle of the gesture and a can.js widget would be rebuilt.
     * The clone has no such problem, and it can be positioned directly because nothing else owns it.
     *
     * @param element the service div of the dragged widget
     * @param rect its geometry, which the clone keeps for the whole gesture
     * @param clientX cursor at the start of the gesture
     * @param clientY cursor at the start of the gesture
     */
    createDragGhost(element: HTMLElement, rect: DOMRect, clientX: number, clientY: number): void {
        this.removeDragGhost();

        const ghost = element.cloneNode(true) as HTMLElement;
        ghost.removeAttribute('id');
        ghost.querySelectorAll('[id]').forEach(child => child.removeAttribute('id'));
        // the editor decoration of the original does not belong on the copy
        ghost.querySelectorAll('.vis-editmode-resizer').forEach(d => d.remove());

        // fixed, so no containing block has to be taken into account - the cursor is in client coordinates too
        Object.assign(ghost.style, {
            position: 'fixed',
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            margin: '0',
            opacity: '0.5',
            pointerEvents: 'none',
            zIndex: String(VisView.Z_INDEXES.WIDGET_SERVICE_DIV + 1),
        });

        this.dragGhost = ghost;
        // where inside the widget it was grabbed, so the clone stays under that point
        this.dragGhostOffset = { x: clientX - rect.left, y: clientY - rect.top };
        window.document.body.appendChild(ghost);
    }

    /** Move the copy to the cursor */
    moveDragGhost(clientX: number, clientY: number): void {
        if (this.dragGhost) {
            this.dragGhost.style.left = `${clientX - this.dragGhostOffset.x}px`;
            this.dragGhost.style.top = `${clientY - this.dragGhostOffset.y}px`;
        }
    }

    removeDragGhost(): void {
        if (this.dragGhost) {
            this.dragGhost.remove();
            this.dragGhost = null;
        }
    }

    /**
     * The element the view scrolls in: the pane of the editor, or the page.
     *
     * @param element - the view
     */
    static findScrollParent(element: HTMLElement | null): HTMLElement | null {
        for (let el = element; el && el !== window.document.body; el = el.parentElement) {
            const style = window.getComputedStyle(el);
            if (
                (/(auto|scroll|overlay)/.test(style.overflowY) && el.scrollHeight > el.clientHeight) ||
                (/(auto|scroll|overlay)/.test(style.overflowX) && el.scrollWidth > el.clientWidth)
            ) {
                return el;
            }
        }
        const page = window.document.scrollingElement as HTMLElement | null;
        return page && page.scrollHeight > page.clientHeight ? page : null;
    }

    /** The part of the scrolled pane that is on the screen; the whole window for the page itself */
    static getPaneBox(scroller: HTMLElement): Box {
        if (scroller === window.document.scrollingElement) {
            return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
        }
        return scroller.getBoundingClientRect();
    }

    /** The mouse has left the small circle around the point the gesture started at, see onMouseWidgetMove() */
    private isBeyondDragThreshold(e: { pageX: number; pageY: number }): boolean {
        return (
            !!this.movement &&
            (Math.abs(e.pageX - (this.movement.startX || 0)) > DRAG_THRESHOLD ||
                Math.abs(e.pageY - (this.movement.startY || 0)) > DRAG_THRESHOLD)
        );
    }

    /** How far the pane has scrolled since the gesture started */
    private getGestureScroll(): { x: number; y: number } {
        const scroller = this.movement?.scroller;
        if (!scroller || !this.movement) {
            return { x: 0, y: 0 };
        }
        return {
            x: scroller.scrollLeft - (this.movement.scrollLeft || 0),
            y: scroller.scrollTop - (this.movement.scrollTop || 0),
        };
    }

    /**
     * Let the pane scroll by itself while something is dragged near its edge, see autoScrollSpeed().
     *
     * A section further up is out of sight while a widget is dragged in a section further down, and the mouse
     * alone can never reach it. So the pane scrolls one step per frame for as long as the cursor stays near the
     * edge - also while the mouse rests - and after each step the last move is replayed: the widget, or the slot it
     * would drop into, follows the content that scrolls by underneath the cursor.
     *
     * @param clientX - the cursor
     * @param clientY - the cursor
     */
    private updateAutoScroll(clientX: number, clientY: number): void {
        const scroller = this.movement?.scroller;
        const speed = scroller ? autoScrollSpeed({ x: clientX, y: clientY }, VisView.getPaneBox(scroller)) : null;
        if (!speed || (!speed.x && !speed.y)) {
            this.stopAutoScroll();
        } else if (this.autoScrollFrame === null) {
            this.autoScrollFrame = window.requestAnimationFrame(this.autoScrollStep);
        }
    }

    private autoScrollStep = (): void => {
        this.autoScrollFrame = null;
        const scroller = this.movement?.scroller;
        const event = this.lastMoveEvent;
        if (!scroller || !event || !this.onMouseWidgetMove) {
            return;
        }
        const speed = autoScrollSpeed({ x: event.clientX, y: event.clientY }, VisView.getPaneBox(scroller));
        const { scrollLeft, scrollTop } = scroller;
        scroller.scrollLeft += speed.x;
        scroller.scrollTop += speed.y;
        if (scroller.scrollLeft === scrollLeft && scroller.scrollTop === scrollTop) {
            // the end of the pane; the next move of the mouse starts it again if there is more to scroll
            return;
        }
        // the move measures everything anew, and asks for the next step if the cursor is still near the edge
        this.onMouseWidgetMove(event);
    };

    private stopAutoScroll(): void {
        if (this.autoScrollFrame !== null) {
            window.cancelAnimationFrame(this.autoScrollFrame);
            this.autoScrollFrame = null;
        }
    }

    /**
     * The mouse moves outside the view while a gesture runs - over the toolbar above the pane, say. The gesture itself
     * only follows the mouse over the view, as ever; this only keeps the pane scrolling towards the cursor.
     */
    private onWindowMoveDuringGesture = (e: MouseEvent): void => {
        if (!this.movement || this.refView.current?.contains(e.target as Node)) {
            return;
        }
        if (!(e.buttons & 1)) {
            // let go where the view could not see it
            this.onMouseWidgetUp?.(e);
            return;
        }
        this.lastMoveEvent = e;
        this.updateAutoScroll(e.clientX, e.clientY);
    };

    /**
     * Put the widget dragged in the grid layout where the cursor is, see computeGridDrop().
     *
     * @param x client x of the cursor
     * @param y client y of the cursor
     */
    updateGridDrag(x: number, y: number): void {
        const drag = this.gridDragNow;
        if (!drag || drag.dropped) {
            return;
        }

        const { sectionBoxes, widgetBoxes } = this.measureGridSections(drag.sections);
        const sections = computeGridDrop(drag.sections, drag.wid, sectionBoxes, widgetBoxes, x, y);
        if (sections !== drag.sections) {
            this.gridDragNow = { ...drag, sections };
            this.setState({ gridDrag: this.gridDragNow });
        }
    }

    /** Where the sections of the grid layout and their widgets are on the screen, for computeGridDrop() */
    private measureGridSections(sections: GridSection[]): {
        sectionBoxes: Partial<Record<string, Box>>;
        widgetBoxes: Partial<Record<AnyWidgetId, Box>>;
    } {
        const sectionBoxes: Partial<Record<string, Box>> = {};
        const widgetBoxes: Partial<Record<AnyWidgetId, Box>> = {};
        for (const section of sections) {
            const sectionBox = this.refGridSections[section.id]?.current?.getBoundingClientRect();
            if (sectionBox) {
                sectionBoxes[section.id] = sectionBox;
            }
            for (const wid of section.widgets) {
                // the can.js div is the cell of a vis-1 widget, its service div only lies over it
                const element = this.widgetsRefs[wid]?.widDiv || this.widgetsRefs[wid]?.refService?.current;
                const box = element?.getBoundingClientRect();
                if (box) {
                    widgetBoxes[wid] = box;
                }
            }
        }
        return { sectionBoxes, widgetBoxes };
    }

    /**
     * Where a new widget lands that is dropped from the palette onto this view: the view settings with it put into
     * the section under the point - before or after the widget there, or at the end of the section - or null if the
     * view has no grid layout or the point is over no section. The editor then makes it a cell of that section;
     * anywhere else it becomes an absolute widget, as ever.
     *
     * @param clientX - where it was dropped, in client coordinates
     * @param clientY - where it was dropped, in client coordinates
     * @param wid - the id the new widget will get
     */
    gridDropTarget = (
        clientX: number,
        clientY: number,
        wid: AnyWidgetId,
    ): { sections: ViewSection[]; order: AnyWidgetId[] } | null => {
        if (!this.isGridLayout()) {
            return null;
        }
        const { sectionBoxes, widgetBoxes } = this.measureGridSections(this.lastGridSections);
        const sections = computeGridDrop(this.lastGridSections, wid, sectionBoxes, widgetBoxes, clientX, clientY);
        if (sections === this.lastGridSections) {
            return null;
        }
        const settings = store.getState().visProject[this.props.view]?.settings;
        return applyGridDrop(settings?.sections, settings?.order, sections, wid);
    };

    /**
     * Put the dragged widget where the cursor is.
     *
     * The widgets are hit-tested in their rendered order; the half of a widget the cursor is in decides whether
     * the dragged one goes before or after it. Nothing happens while the cursor is over no widget at all, so
     * the order does not flicker when the pointer crosses a gap between two columns.
     *
     * @param x client x of the cursor
     * @param y client y of the cursor
     */
    updateRelativeDragOrder(x: number, y: number): void {
        const drag = this.state.relativeDrag;
        if (!drag) {
            return;
        }

        const boxes: Partial<Record<AnyWidgetId, Box>> = {};
        for (const wid of drag.order) {
            const element = this.widgetsRefs[wid]?.widDiv || this.widgetsRefs[wid]?.refService?.current;
            const box = element?.getBoundingClientRect();
            if (box) {
                boxes[wid] = box;
            }
        }

        const order = computeRelativeOrder(drag.order, drag.wid, boxes, x, y);
        if (order.join(',') !== drag.order.join(',')) {
            this.setState({ relativeDrag: { ...drag, order } });
        }
    }

    onIgnoreMouseEvents = (ignore: boolean): void => {
        if (this.props.editMode) {
            this.ignoreMouseEvents = ignore;

            this.props.context.onIgnoreMouseEvents?.(ignore);

            if (ignore && this.movement) {
                // A widget takes the mouse over, so the gesture has to end here - the mouseup it would end at
                // goes to that widget and never reaches us. Ending it means more than dropping the listeners:
                // the drag ghost, the placeholder that stands in for a dragged relative widget and the
                // tentative order all belong to the gesture, and a relative widget whose placeholder stays
                // behind is gone from the view until the page is loaded again. `onMouseWidgetUp` is that
                // teardown, so it is the one thing to call.
                this.onMouseWidgetUp?.();
                this.movement = null;
            }
        }
    };

    onMouseWidgetMove = !this.props.context.runtime
        ? (e: MouseEvent) => {
              if (
                  !this.movement ||
                  !this.refView.current ||
                  (!!this.props.selectedGroup &&
                      this.selectedWidgets.includes(this.props.selectedGroup) &&
                      !this.movement.isResize)
              ) {
                  return;
              }

              // The button is up although the gesture is still running: the mouseup happened where the page
              // could not see it - over an iframe of a widget, or outside the window while another program had
              // the focus. Without this the gesture runs on with the button released, and a relative widget
              // stays the placeholder it was replaced by for good.
              if (!(e.buttons & 1)) {
                  this.onMouseWidgetUp?.(e);
                  return;
              }
              const widgetsRefs = this.widgetsRefs;
              this.lastMoveEvent = e;

              // A press is only a click until the mouse has left a small circle around the point it was pressed
              // at. Otherwise the hand that clicks a widget to select it shifts it by a pixel.
              if (!this.movement.moved) {
                  if (!this.isBeyondDragThreshold(e)) {
                      return;
                  }
                  // the drag of a relative widget begins now, see mouseDownOnView()
                  const startDrag = this.startDragOnMove;
                  this.startDragOnMove = null;
                  startDrag?.();
              }
              this.movement.moved = true;
              // The pane may have scrolled since the gesture started, see updateAutoScroll(): whatever is dragged
              // has come that much further in the view, although the cursor has not moved on the screen.
              const scrolled = this.getGestureScroll();
              this.movement.x = e.pageX - (this.movement.startX || 0) + scrolled.x;
              this.movement.y = e.pageY - (this.movement.startY || 0) + scrolled.y;

              // Where the widget started, measured on the screen as it is scrolled now - the view and the other
              // widgets it snaps to are measured there as well.
              const started = this.movement.startWidget;
              const startWidget = {
                  left: (started?.left || 0) - scrolled.x,
                  top: (started?.top || 0) - scrolled.y,
                  right: (started?.right || 0) - scrolled.x,
                  bottom: (started?.bottom || 0) - scrolled.y,
              };

              const viewRect = this.refView.current.getBoundingClientRect();

              if (!this.movement.isResize && store.getState().visProject[this.props.view].settings?.snapType === 2) {
                  const gridSize = parseInt(
                      (store.getState().visProject[this.props.view].settings?.gridSize || 0) as unknown as string,
                      10,
                  );
                  const snapped = snapToGrid(this.movement, startWidget, viewRect, gridSize);
                  this.movement.x = snapped.x;
                  this.movement.y = snapped.y;
              }

              if (!this.movement.isResize && store.getState().visProject[this.props.view].settings?.snapType === 1) {
                  // the rectangles of everything that is not being dragged; a widget does not snap to itself
                  const others: Box[] = [];
                  for (const wid of Object.keys(widgetsRefs) as AnyWidgetId[]) {
                      if (this.selectedWidgets.includes(wid)) {
                          continue;
                      }
                      const box = widgetsRefs[wid].refService?.current?.getBoundingClientRect();
                      if (box) {
                          others.push(box);
                      }
                  }
                  const snapped = snapToWidgets(this.movement, startWidget, others);
                  this.movement.x = snapped.x;
                  this.movement.y = snapped.y;
              }

              this.showRulers();

              // let the other relative widgets flow around the dragged one. Client coordinates, because the hit
              // test compares against getBoundingClientRect(), which is relative to the viewport.
              this.moveDragGhost(e.clientX, e.clientY);
              this.updateRelativeDragOrder(e.clientX, e.clientY);
              this.updateGridDrag(e.clientX, e.clientY);
              this.updateAutoScroll(e.clientX, e.clientY);

              this.selectedWidgets.forEach((wid: AnyWidgetId) => {
                  const onMove = widgetsRefs[wid]?.onMove;
                  if (onMove && this.movement) {
                      onMove(this.movement.x, this.movement.y, false);
                  }

                  // If the widget has included widgets, so inform them about the new size or position.
                  // This code could be disabled; as in the end, the widgets will be informed anyway.
                  const oWidget = store.getState().visProject[this.props.view].widgets[wid];
                  const attrs = Object.keys(oWidget.data);
                  attrs.forEach(attr => {
                      if (attr.startsWith('widget') && oWidget.data[attr]) {
                          const onCommand = widgetsRefs[oWidget.data[attr]]?.onCommand;
                          if (onCommand) {
                              onCommand('updatePosition');
                          }
                      }
                  });
              });

              // if only one widget selected => check if it can be added to the other widget
              if (this.selectedWidgets.length === 1 && widgetsRefs[this.selectedWidgets[0]]?.refService?.current) {
                  let found = false;
                  for (const wid in widgetsRefs) {
                      const widgetId = wid as AnyWidgetId;
                      // do not snap to itself
                      if (
                          this.selectedWidgets.includes(widgetId) ||
                          !widgetsRefs[widgetId] ||
                          !widgetsRefs[widgetId].canHaveWidgets ||
                          widgetsRefs[widgetId].doNotWantIncludeWidgets ||
                          !widgetsRefs[widgetId].onCommand ||
                          !widgetsRefs[widgetId].refService?.current
                      ) {
                          continue;
                      }
                      const baseRect =
                          widgetsRefs[this.selectedWidgets[0]]?.refService?.current?.getBoundingClientRect();
                      const rect = widgetsRefs[widgetId].refService?.current?.getBoundingClientRect();
                      const onCommand = widgetsRefs[widgetId]?.onCommand;
                      // check if the widget can have other widgets inside
                      if (
                          !found &&
                          baseRect &&
                          rect &&
                          baseRect.top >= rect.top &&
                          baseRect.left >= rect.left &&
                          baseRect.right <= rect.right &&
                          baseRect.bottom <= rect.bottom
                      ) {
                          found = true;
                          // we can add only to one widget
                          if (onCommand) {
                              onCommand('includePossible');
                          }
                      } else if (onCommand) {
                          // inform all other widgets that they do not have inclusion
                          onCommand('includePossibleNOT');
                      }
                  }
              }
          }
        : null;

    showRulers = (hide?: boolean): void => {
        const rulers: { type: 'horizontal' | 'vertical'; value: number }[] = [];
        if (hide) {
            this.setState({ rulers });
            return;
        }

        const viewRect = this.refView.current?.getBoundingClientRect();

        if (!viewRect) {
            return;
        }

        const { widgets } = selectView(store.getState(), this.props.view);
        const others: Box[] = [];
        const selected: Box[] = [];

        for (const wid of Object.keys(this.widgetsRefs) as AnyWidgetId[]) {
            if (
                !this.selectedWidgets.includes(wid) &&
                widgets[wid] &&
                ((this.props.selectedGroup && widgets[this.props.selectedGroup].data.members.includes(wid)) ||
                    !this.props.selectedGroup) &&
                (!widgets[wid].grouped || this.props.selectedGroup)
            ) {
                const box = this.widgetsRefs[wid].refService?.current?.getBoundingClientRect();
                if (box) {
                    others.push(box);
                } else {
                    console.error(`CHECK WHY!!! ${wid} has no refService.current`);
                }
            }
        }

        for (const wid of this.selectedWidgets) {
            // a selected widget does not have to be rendered: a relative widget that is being dragged is
            // replaced by its placeholder for the duration of the gesture, so it has no ref
            if (widgets[wid] && (!widgets[wid].grouped || this.props.selectedGroup)) {
                const box = this.widgetsRefs[wid]?.refService?.current?.getBoundingClientRect();
                if (box) {
                    selected.push(box);
                }
            }
        }

        rulers.push(...computeRulers(others, selected, viewRect));

        this.setState({ rulers });
    };

    onMouseWidgetUp = !this.props.context.runtime
        ? (e?: MouseEvent) => {
              const widgetsRefs = this.widgetsRefs;
              e?.stopPropagation();
              this.onMouseWidgetMove && this.refView.current?.removeEventListener('mousemove', this.onMouseWidgetMove);
              this.onMouseWidgetUp && window.document.removeEventListener('mouseup', this.onMouseWidgetUp);
              window.removeEventListener('mousemove', this.onWindowMoveDuringGesture);
              this.stopAutoScroll();
              this.lastMoveEvent = null;

              // A quick gesture may bring no move between the press and the release: the drag that the move would
              // have started is started now, so that the release below can drop it
              const startDrag = this.startDragOnMove;
              this.startDragOnMove = null;
              if (startDrag && e && this.movement && this.isBeyondDragThreshold(e)) {
                  startDrag();
              }

              this.removeDragGhost();

              const relativeDrag = this.state.relativeDrag;
              if (relativeDrag) {
                  const changed =
                      !!this.movement?.moved &&
                      relativeDrag.order.join(',') !== this.getRelativeWidgetOrder().join(',');
                  if (changed) {
                      // the order the widget was dropped into becomes the order of the view
                      this.props.context.onWidgetsChanged?.(null, this.props.view, { order: relativeDrag.order });
                      // keep rendering from it until the project carries it, see releaseDroppedOrder()
                      this.setState({ relativeDrag: { ...relativeDrag, dropped: true } });

                      // Last resort. The order is only held on to in order to bridge the debounced save, so if
                      // the project has not caught up by now the save did not happen - and then showing what
                      // the project says beats freezing the view on an order that is never coming.
                      // `releaseDroppedOrder` runs on renders, and a view nothing happens in has none.
                      this.droppedOrderTimer ||= setTimeout(() => {
                          this.droppedOrderTimer = null;
                          this.setState({ relativeDrag: null });
                      }, 5_000);
                  } else {
                      this.clearRelativeDrag();
                  }
              }

              // Where the button was let go counts too: a quick gesture may bring no move in between, or one that
              // already ends it (see the check of `e.buttons` in onMouseWidgetMove)
              const gridMoved =
                  !!this.movement &&
                  (!!this.movement.moved ||
                      (!!e && (e.pageX !== this.movement.startX || e.pageY !== this.movement.startY)));
              if (e && gridMoved) {
                  this.updateGridDrag(e.clientX, e.clientY);
              }
              const gridDrag = this.gridDragNow;
              this.gridDragNow = null;
              if (gridDrag && !gridDrag.dropped) {
                  const changed = gridMoved && !gridDropIsDone(this.lastGridSections, gridDrag.sections, gridDrag.wid);
                  if (changed) {
                      // the sections the widget was dropped into become the sections of the view
                      const settings = store.getState().visProject[this.props.view].settings;
                      const { sections, order } = applyGridDrop(
                          settings?.sections,
                          settings?.order,
                          gridDrag.sections,
                          gridDrag.wid,
                      );
                      this.props.context.onWidgetsChanged?.(null, this.props.view, { sections, order });
                      // keep rendering from them until the project carries them, see releaseDroppedOrder()
                      this.setState({ gridDrag: { ...gridDrag, dropped: true } });
                      // the last resort, for the same reason as for the relative widgets above
                      this.droppedOrderTimer ||= setTimeout(() => {
                          this.droppedOrderTimer = null;
                          this.setState({ gridDrag: null });
                      }, 5_000);
                  } else {
                      this.clearRelativeDrag();
                  }
              }

              if (this.movement?.moved) {
                  this.selectedWidgets.forEach((wid: AnyWidgetId) => {
                      const onMove = widgetsRefs[wid]?.onMove;
                      if (onMove && this.movement) {
                          onMove(this.movement.x, this.movement.y, true); // indicate the end of movement
                      }
                  });

                  store.dispatch(recalculateFields(true));
              }

              // Indicate every widget about movement stop
              Object.keys(widgetsRefs).forEach(_wid => {
                  const onCommand = widgetsRefs[_wid as AnyWidgetId]?.onCommand;
                  if (onCommand) {
                      onCommand('stopMove');
                  }
              });

              // If only one widget was moved: check if it can be added to another widget. Only after a move - a
              // press that only selects a widget that lies over a container must not ask.
              if (
                  this.movement?.moved &&
                  this.selectedWidgets.length === 1 &&
                  widgetsRefs[this.selectedWidgets[0]]?.refService?.current
              ) {
                  for (const wid in widgetsRefs) {
                      const widgetId = wid as AnyWidgetId;
                      // do not add to itself
                      if (
                          this.selectedWidgets.includes(widgetId) ||
                          !widgetsRefs[widgetId] ||
                          !widgetsRefs[widgetId].canHaveWidgets ||
                          widgetsRefs[widgetId].doNotWantIncludeWidgets ||
                          !widgetsRefs[widgetId].onCommand ||
                          !widgetsRefs[widgetId].refService?.current
                      ) {
                          continue;
                      }
                      const baseRect =
                          widgetsRefs[this.selectedWidgets[0]]?.refService?.current?.getBoundingClientRect();
                      const rect = widgetsRefs[widgetId].refService?.current?.getBoundingClientRect();
                      // check if the widget can have other widgets inside
                      if (
                          rect &&
                          baseRect &&
                          baseRect.top >= rect.top &&
                          baseRect.left >= rect.left &&
                          baseRect.right <= rect.right &&
                          baseRect.bottom <= rect.bottom
                      ) {
                          this.props.context.askAboutInclude?.(
                              this.selectedWidgets[0],
                              widgetId,
                              (_wid: AnyWidgetId, toWid: AnyWidgetId) => {
                                  const onCommand = widgetsRefs[toWid]?.onCommand;
                                  if (onCommand) {
                                      onCommand('include', _wid);
                                  }
                              },
                          );
                      }
                  }
              }

              this.showRulers(true);
              // the gesture is over; from now on the selection comes from the props again
              this.gestureSelection = null;
          }
        : null;

    editWidgetsRect(widget: AnyWidgetId): { top: number; left: number; width: number; height: number } | null {
        if (!this.refView.current) {
            return null;
        }
        const viewLeft = this.refView.current.offsetLeft;
        const viewTop = this.refView.current.offsetTop;

        // find common coordinates
        const ref: HTMLElement | null | undefined =
            this.widgetsRefs[widget].widDiv || this.widgetsRefs[widget].refService?.current;

        if (!ref) {
            return null;
        }
        let top = ref.offsetTop - viewTop;
        let left = ref.offsetLeft - viewLeft;
        // Maybe bug?
        if (!left && !top) {
            const style = store.getState().visProject[this.props.view].widgets[widget].style;
            left = parseInt((style?.left as string) || '0', 10) + parseInt(ref.offsetLeft as unknown as string, 10);
            top = parseInt((style?.top as string) || '0', 10) + parseInt(ref.offsetTop as unknown as string, 10);
            left ||= 0;
            top ||= 0;
        }

        return {
            top,
            left,
            width: ref.clientWidth,
            height: ref.clientHeight,
        };
    }

    pxToPercent = (oldStyle: WidgetStyle, newStyle: WidgetStyle): null | WidgetStyle => {
        if (!this.refView.current) {
            return null;
        }
        const pRect = {
            left: this.refView.current.clientLeft,
            top: this.refView.current.clientTop,
            height: this.refView.current.clientHeight,
            width: this.refView.current.clientWidth,
        };

        if (oldStyle.position === 'relative') {
            delete newStyle.top;
            delete newStyle.left;
            if (oldStyle.width === '100%') {
                delete newStyle.width;
            }
            if (oldStyle.height === '100%') {
                delete newStyle.height;
            }
        }

        const resultStyle = { ...newStyle };
        if (
            newStyle.top &&
            parseDimension(oldStyle.top).dimension === '%' &&
            parseDimension(newStyle.top).dimension !== '%'
        ) {
            resultStyle.top = (parseDimension(newStyle.top).value * 100) / pRect.height;
            resultStyle.top = `${Math.round(resultStyle.top * 100) / 100}%`;
        }
        if (
            newStyle.left &&
            parseDimension(oldStyle.left).dimension === '%' &&
            parseDimension(newStyle.left).dimension !== '%'
        ) {
            resultStyle.left = (parseDimension(newStyle.left).value * 100) / pRect.width;
            resultStyle.left = `${Math.round(resultStyle.left * 100) / 100}%`;
        }
        if (
            newStyle.width &&
            parseDimension(oldStyle.width).dimension === '%' &&
            parseDimension(newStyle.width).dimension !== '%'
        ) {
            resultStyle.width = (parseDimension(newStyle.width).value / pRect.width) * 100;
            resultStyle.width = `${Math.round(resultStyle.width * 100) / 100}%`;
        }
        if (
            newStyle.height &&
            parseDimension(oldStyle.height).dimension === '%' &&
            parseDimension(newStyle.height).dimension !== '%'
        ) {
            resultStyle.height = (parseDimension(newStyle.height).value / pRect.height) * 100;
            resultStyle.height = `${Math.round(resultStyle.height * 100) / 100}%`;
        }
        return { ...oldStyle, ...resultStyle };
    };

    onPxToPercent = (
        wids: AnyWidgetId[],
        attr: string,
        cb: (results: (string | null)[]) => void,
    ): (string | null)[] => {
        if (!this.refView.current) {
            return [];
        }
        const pRect = {
            // left: this.refView.current.clientLeft,
            // top: this.refView.current.clientTop,
            height: this.refView.current.clientHeight,
            width: this.refView.current.clientWidth,
        };

        const results: (string | null)[] = wids.map(wid => {
            const wRect = this.editWidgetsRect(wid);
            if (!wRect) {
                return null;
            }
            /*
            if (isShift) {
                wRect.top  -= pRect.top;
                wRect.left -= pRect.left;
            }
            */
            let value: number;
            if (attr === 'top') {
                value = (wRect.top * 100) / pRect.height;
            } else if (attr === 'left') {
                value = (wRect.left * 100) / pRect.width;
            } else if (attr === 'width') {
                value = (wRect.width / pRect.width) * 100;
            } else {
                // height
                value = (wRect.height / pRect.height) * 100;
            }

            return `${Math.round(value * 100) / 100}%`;
        });

        cb?.(results);

        return results;
    };

    onPercentToPx = (
        wids: AnyWidgetId[],
        attr: string,
        cb: (results: (string | null)[]) => void,
    ): (string | null)[] => {
        const results = wids.map(wid => {
            const wRect = this.editWidgetsRect(wid);
            if (!wRect) {
                return null;
            }

            return `${Math.round((wRect as Record<string, number>)[attr])}px`;
        });

        cb?.(results);

        return results;
    };

    registerEditorHandlers(unregister?: boolean): void {
        if (this.props.context.registerEditorCallback) {
            if (!unregister && this.props.activeView === this.props.view) {
                if (!this.registerDone) {
                    this.registerDone = true;
                    this.props.context.registerEditorCallback('onStealStyle', this.props.view, this.onStealStyle);
                    this.props.context.registerEditorCallback('onPxToPercent', this.props.view, this.onPxToPercent);
                    this.props.context.registerEditorCallback('pxToPercent', this.props.view, this.pxToPercent);
                    this.props.context.registerEditorCallback('onPercentToPx', this.props.view, this.onPercentToPx);
                    this.props.context.registerEditorCallback('gridDropTarget', this.props.view, this.gridDropTarget);
                }
            } else {
                this.registerDone = false;
                this.props.context.registerEditorCallback('onStealStyle', this.props.view);
                this.props.context.registerEditorCallback('onPxToPercent', this.props.view);
                this.props.context.registerEditorCallback('pxToPercent', this.props.view);
                this.props.context.registerEditorCallback('onPercentToPx', this.props.view);
                this.props.context.registerEditorCallback('gridDropTarget', this.props.view);
            }
        }
    }

    updateViewWidth(): void {
        // the view itself while there is no relative view, see observeRelativeView()
        const element = this.refRelativeView.current || (this.usesWidthVisibility ? this.refView.current : null);
        if (element && element.offsetWidth !== this.state.width) {
            this.setState({ width: element.offsetWidth });
        }
    }

    /**
     * The width the widgets are shown or hidden at, see visWidthVisibility.ts: the width of the view.
     *
     * With a screen size, the editor shows what that screen would show, and a limited screen is that size anyway.
     * The relative view already has that width; without one the view itself is as wide as the editor, so the size
     * is taken directly.
     */
    getVisibilityWidth(): number {
        const settings = store.getState().visProject[this.props.view]?.settings;
        const sizex = parseFloat(settings?.sizex as unknown as string);
        if (!this.refRelativeView.current && sizex > 0 && (this.props.editMode || VisView.isScreenLimited(settings))) {
            return sizex;
        }
        return this.state.width;
    }

    componentDidUpdate(): void {
        // The layer only exists in edit mode, so it appears and goes again while the view lives
        this.announceAdornerLayer();
        this.registerEditorHandlers();
        this.updateViewWidth();
        this.observeRelativeView();
        this.observeGridCells();

        // the selection a press made has arrived through the props, see mouseDownOnView() - it also ends there when
        // the press did not become a gesture at all
        if (this.gestureSelection?.every(wid => this.props.selectedWidgets?.includes(wid))) {
            this.gestureSelection = null;
        }

        this.releaseDroppedOrder();
        // detect filter changes
        if (!this.props.editMode) {
            const newFilter = JSON.stringify(this.props.viewsActiveFilter?.[this.props.view] || []);
            if (this.oldFilter !== newFilter) {
                this.oldFilter = newFilter;
                this.changeFilter({ filter: JSON.parse(newFilter) });
            }
        }
    }

    /**
     * Forget the order - or the sections of the grid layout - a drag was dropped into, and with it the timer that
     * would have done it
     */
    private clearRelativeDrag(): void {
        this.gridDragNow = null;
        if (this.droppedOrderTimer) {
            clearTimeout(this.droppedOrderTimer);
            this.droppedOrderTimer = null;
        }
        if (this.state.relativeDrag || this.state.gridDrag) {
            this.setState({ relativeDrag: null, gridDrag: null });
        }
    }

    /**
     * Let go of the order a drag was dropped into, once `droppedOrderIsDone` says it has served its purpose - or of
     * the sections, once `gridDropIsDone` says so
     */
    private releaseDroppedOrder(): void {
        const relativeDrag = this.state.relativeDrag;
        const gridDrag = this.state.gridDrag;
        if (
            (relativeDrag?.dropped &&
                droppedOrderIsDone(this.lastRelativeOrder, relativeDrag.order, relativeDrag.wid)) ||
            (gridDrag?.dropped && gridDropIsDone(this.lastGridSections, gridDrag.sections, gridDrag.wid))
        ) {
            this.clearRelativeDrag();
        }
    }

    static renderGitter(step?: number, color?: string): React.JSX.Element {
        color ||= '#D0D0D0';
        step ||= 10;
        const bigWidth = step * 5;
        const smallWidth = step;

        const gitterPattern = btoa(`<svg width="${bigWidth}" height="${bigWidth}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <pattern id="grid" width="${bigWidth}" height="${bigWidth}" patternUnits="userSpaceOnUse">
            <path d="M 0 ${smallWidth} L ${bigWidth} ${smallWidth} M ${smallWidth} 0 L ${smallWidth} ${bigWidth} M 0 ${2 * smallWidth} L ${bigWidth} ${2 * smallWidth} M ${2 * smallWidth} 0 L ${2 * smallWidth} ${bigWidth} M 0 ${3 * smallWidth} L ${bigWidth} ${3 * smallWidth} M ${3 * smallWidth} 0 L ${3 * smallWidth} ${bigWidth} M 0 ${4 * smallWidth} L ${bigWidth} ${4 * smallWidth} M ${4 * smallWidth} 0 L ${4 * smallWidth} ${bigWidth}" fill="none" stroke="${color}" opacity="0.2" stroke-width="1"/>
            <path d="M ${bigWidth} 0 L 0 0 0 ${bigWidth}" fill="none" stroke="${color}" stroke-width="1"/>
        </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)"/>
</svg>`);
        const backgroundImage = `url(data:image/svg+xml;base64,${gitterPattern})`;

        return (
            <div
                style={{
                    opacity: 0.2,
                    zIndex: -1,
                    userSelect: 'none',
                    pointerEvents: 'none',
                    width: '100%',
                    height: '100%',
                    backgroundImage,
                    backgroundPosition: '-1px -1px',
                }}
            />
        );
    }

    static getOneWidget(index: number, widget: Widget, options: CreateWidgetOptions): React.JSX.Element | null {
        if (!VisWidgetsCatalog.rxWidgets) {
            return null;
        }

        // Every render path goes through here: the widget loop of render(), BasicGroup for grouped
        // widgets and VisRxWidget.getWidgetInWidget() for embedded ones. Checking the access at this
        // single choke point is what keeps a new caller from bypassing the permissions by accident.
        // The additional check in the render loop is NOT redundant, see the comment there.
        if (
            !hasWidgetAccess({
                view: options.view,
                editMode: options.editMode,
                project: store.getState().visProject,
                user: store.getState().activeUser,
                wid: options.id,
            })
        ) {
            return null;
        }

        // Not shown at this width of the view. The editor shows it anyway, dimmed, so that it can be edited.
        if (!options.editMode && options.viewWidth && !isShownAtWidth(widget?.data, options.viewWidth)) {
            return null;
        }
        // context, id, isRelative, refParent, askView, mouseDownOnView, view,
        // relativeWidgetOrder, moveAllowed, editMode, multiView, ignoreMouseEvents, selectedGroup
        // viewsActiveFilter, customSettings, onIgnoreMouseEvents
        const WidgetEl =
            VisWidgetsCatalog.rxWidgets[widget.tpl] ||
            (VisWidgetsCatalog.allWidgetsList?.includes(widget.tpl) ? VisCanWidget : VisBaseWidget);

        const widgetElement = (
            // @ts-expect-error fix later
            <WidgetEl
                tpl={widget.tpl}
                {...options}
            />
        );

        // Widget sets come from other adapters and are built against their own React/MUI versions, so a widget
        // can throw while rendering. The boundary sits here, at the choke point, so that every render path is
        // covered and one broken widget costs a placeholder instead of the whole view.
        return (
            <VisWidgetErrorBoundary
                key={`${index}_${options.id}`}
                id={options.id}
                tpl={widget.tpl}
                view={options.view}
                isRelative={options.isRelative}
                style={widget.style}
                gridCellStyle={
                    options.gridCell
                        ? VisBaseWidget.getGridCellStyle(
                              widget.style,
                              options.context.views[options.view]?.settings,
                              options.relativeWidgetOrder.indexOf(options.id),
                          )
                        : undefined
                }
                editMode={options.editMode}
                ignoreNotLoaded={options.context.views.___settings?.ignoreNotLoaded}
                onSelect={
                    options.context.setSelectedWidgets
                        ? () => options.context.setSelectedWidgets?.([options.id], options.view)
                        : undefined
                }
            >
                {widgetElement}
            </VisWidgetErrorBoundary>
        );
    }

    async loadJqueryTheme(jQueryTheme: string): Promise<void> {
        if (VisView.themeCache[jQueryTheme] && this.props.view) {
            let data = VisView.themeCache[jQueryTheme];
            const _view = `visview_${this.props.view.replace(/\s/g, '_')}`;
            data = data.replace('.ui-helper-hidden', `\n#${_view} .ui-helper-hidden`);
            data = data.replace(/(}.)/g, `}\n#${_view} .`);
            data = data.replace(/,\./g, `,#${_view} .`);
            data = data.replace(/images/g, `../../lib/css/themes/jquery-ui/${jQueryTheme}/images`);

            this.setState({ loadedjQueryTheme: jQueryTheme, themeCode: data });
        } else {
            try {
                const resp = await fetch(`../../lib/css/themes/jquery-ui/${jQueryTheme}/jquery-ui.min.css`);
                let data = await resp.text();
                VisView.themeCache[jQueryTheme] = data;

                const _view = `visview_${this.props.view.replace(/\s/g, '_')}`;
                data = data.replace('.ui-helper-hidden', `\n#${_view} .ui-helper-hidden`);
                data = data.replace(/(}.)/g, `}\n#${_view} .`);
                data = data.replace(/,\./g, `,#${_view} .`);
                data = data.replace(/images/g, `../../lib/css/themes/jquery-ui/${jQueryTheme}/images`);

                this.setState({ loadedjQueryTheme: jQueryTheme, themeCode: data });
            } catch (e) {
                console.warn(`Cannot load jQueryUI theme "${jQueryTheme}": ${(e as Error).stack}`);
            }
        }

        this.loadingTheme = false;
    }

    getJQueryThemeName(): string {
        const settings = this.props.view ? store.getState().visProject[this.props.view]?.settings : undefined;

        return settings?.theme || 'redmond';
    }

    installKeyHandlers(): void {
        if (!this.keysHandlerInstalled) {
            this.keysHandlerInstalled = true;
            window.addEventListener('keydown', this.onKeyDown, false);
        }
    }

    uninstallKeyHandlers(): void {
        if (this.keysHandlerInstalled) {
            this.keysHandlerInstalled = false;
            window.removeEventListener('keydown', this.onKeyDown, false);
        }
    }

    moveWidgets = (leftShift: number, topShift: number): void => {
        if (!this.moveTimer) {
            this.movement = {
                x: 0,
                y: 0,
            };
            this.selectedWidgets.forEach((_wid: AnyWidgetId) => {
                const onMove = this.widgetsRefs[_wid]?.onMove;
                if (onMove) {
                    onMove(); // indicate the start of movement
                }
            });

            // Indicate about movement start
            Object.keys(this.widgetsRefs).forEach(_wid => {
                const onCommand = this.widgetsRefs[_wid as AnyWidgetId]?.onCommand;
                if (onCommand) {
                    onCommand('startMove');
                }
            });
        }

        if (!this.movement) {
            return;
        }
        this.movement.x += leftShift;
        this.movement.y += topShift;

        this.selectedWidgets.forEach((wid: AnyWidgetId) => {
            const widgetsRefs = this.widgetsRefs;
            const onMove = widgetsRefs[wid]?.onMove;
            if (onMove && this.movement) {
                onMove(this.movement.x, this.movement.y, false);
            }
        });

        this.showRulers();

        this.moveTimer && clearTimeout(this.moveTimer);
        this.moveTimer = setTimeout(() => {
            this.moveTimer = null;
            this.showRulers(true);
            store.dispatch(recalculateFields(true));

            this.selectedWidgets.forEach((wid: AnyWidgetId) => {
                const onMove = this.widgetsRefs[wid]?.onMove;
                if (onMove && this.movement) {
                    onMove(this.movement.x, this.movement.y, true); // indicate the end of movement
                }
            });
            this.movement = null;

            // Indicate about movement start
            Object.keys(this.widgetsRefs).forEach(_wid => {
                const onCommand = this.widgetsRefs[_wid as AnyWidgetId]?.onCommand;
                if (onCommand) {
                    onCommand('stopMove');
                }
            });
        }, 800);
    };

    resizeWidgets = (widthShift: number, heightShift: number): void => {
        if (!this.moveTimer) {
            this.movement = {
                x: 0,
                y: 0,
                isResize: true,
            };
            // Indicate about movement start
            Object.keys(this.widgetsRefs).forEach(_wid => {
                const onCommand = this.widgetsRefs[_wid as AnyWidgetId]?.onCommand;
                if (onCommand) {
                    onCommand('startResize');
                }
            });

            this.selectedWidgets.forEach((_wid: AnyWidgetId) => {
                const onMove = this.widgetsRefs[_wid]?.onMove;
                if (onMove) {
                    onMove(); // indicate the start of resizing
                }
            });
        }
        if (!this.movement) {
            return;
        }

        this.movement.x += widthShift;
        this.movement.y += heightShift;

        this.selectedWidgets.forEach((wid: AnyWidgetId) => {
            const widgetsRefs = this.widgetsRefs;
            const onMove = widgetsRefs[wid]?.onMove;
            if (onMove && this.movement) {
                onMove(this.movement.x, this.movement.y, false);
            }
        });

        this.showRulers();

        this.moveTimer && clearTimeout(this.moveTimer);
        this.moveTimer = setTimeout(() => {
            this.moveTimer = null;
            this.showRulers(true);

            this.selectedWidgets.forEach((wid: AnyWidgetId) => {
                const onMove = this.widgetsRefs[wid]?.onMove;
                // indicate the end of movement
                if (onMove && this.movement) {
                    onMove(this.movement.x, this.movement.y, true);
                }
            });

            // Indicate about movement start
            Object.keys(this.widgetsRefs).forEach(_wid => {
                const onCommand = this.widgetsRefs[_wid as AnyWidgetId]?.onCommand;
                if (onCommand) {
                    onCommand('stopResize');
                }
            });
            this.movement = null;
        }, 800);
    };

    onKeyDown = (e: KeyboardEvent): void => {
        if (!this.props.editMode) {
            return;
        }
        if (document.activeElement?.tagName === 'BODY') {
            if (this.selectedWidgets.length) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this[e.shiftKey ? 'resizeWidgets' : 'moveWidgets'](e.ctrlKey ? -10 : -1, 0);
                }
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this[e.shiftKey ? 'resizeWidgets' : 'moveWidgets'](e.ctrlKey ? 10 : 1, 0);
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this[e.shiftKey ? 'resizeWidgets' : 'moveWidgets'](0, e.ctrlKey ? -10 : -1);
                }
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this[e.shiftKey ? 'resizeWidgets' : 'moveWidgets'](0, e.ctrlKey ? 10 : 1);
                }
            }
        }
    };

    renderScreenSize(): React.JSX.Element[] | null {
        const ww = parseInt(
            (store.getState().visProject[this.props.view].settings?.sizex || 0) as unknown as string,
            10,
        );
        const hh = parseInt(
            (store.getState().visProject[this.props.view].settings?.sizey || 0) as unknown as string,
            10,
        );

        if (!this.props.editMode || !this.props.view || !ww || !hh) {
            return null;
        }
        return [
            <div
                key="black"
                style={{
                    top: 0,
                    left: 0,
                    width: `${ww}px`,
                    height: `${hh}px`,
                    position: 'absolute',
                    borderTopWidth: 0,
                    borderLeftWidth: 0,
                    borderRightWidth: 1,
                    borderBottomWidth: 1,
                    boxSizing: 'content-box',
                    borderStyle: 'dashed',
                    borderColor: 'black',
                    zIndex: 1000,
                    pointerEvents: 'none',
                    userSelect: 'none',
                    opacity: 0.7,
                }}
            />,
            <div
                key="white"
                style={{
                    top: 0,
                    left: 0,
                    width: `${ww + 1}px`,
                    height: `${hh + 1}px`,
                    position: 'absolute',
                    borderTopWidth: 0,
                    borderLeftWidth: 0,
                    borderRightWidth: 1,
                    borderBottomWidth: 1,
                    boxSizing: 'content-box',
                    borderStyle: 'dashed',
                    borderColor: 'white',
                    zIndex: 1000,
                    pointerEvents: 'none',
                    userSelect: 'none',
                    opacity: 0.7,
                }}
            />,
        ];
    }

    getRelativeStyle(settings: ViewSettings, groupId?: GroupWidgetId, limitScreenSize?: boolean): React.CSSProperties {
        const relativeStyle: React.CSSProperties = {};
        if (groupId) {
            const groupWidgetStyle = store.getState().visProject[this.props.view].widgets[groupId].style;
            relativeStyle.width = groupWidgetStyle?.width || '100%';
            relativeStyle.height = groupWidgetStyle?.height || '100%';
        } else {
            // this was only if this.props.editMode
            if (settings.sizex && !limitScreenSize) {
                let ww: number | string = settings.sizex;
                let hh: number | string = settings.sizey || 0;
                if (isVarFinite(ww)) {
                    ww = parseFloat(ww as unknown as string);
                }
                if (isVarFinite(hh)) {
                    hh = parseFloat(hh as unknown as string);
                }

                if (typeof ww === 'number' || (ww as string).match(/\d$/)) {
                    ww = `${ww.toString()}px`;
                }
                if (typeof hh === 'number' || (hh as string).match(/\d$/)) {
                    hh = `${hh.toString()}px`;
                }
                relativeStyle.width = ww;
                relativeStyle.height = hh;
            } else {
                relativeStyle.width = '100%';
                relativeStyle.height = '100%';
            }

            if (settings.layout === 'grid') {
                // The grid is part of the flow of the view and not laid over it: the sections below each other on
                // a phone are much higher than the screen, and the view - and with it its background - has to
                // grow with them. This div is only the frame that is measured; the grid inside it is centered.
                relativeStyle.display = 'block';
                relativeStyle.position = 'relative';
                relativeStyle.minHeight = relativeStyle.height;
                delete relativeStyle.height;
                return relativeStyle;
            }

            relativeStyle.display = settings.style?.display || 'flex';

            if (relativeStyle.display === 'flex') {
                relativeStyle.flexWrap = 'wrap';
                relativeStyle.columnGap = 8;

                if (isVarFinite(settings.columnGap)) {
                    relativeStyle.columnGap = parseInt(settings.columnGap as unknown as string, 10);
                }
            }
        }
        relativeStyle.position = 'absolute';
        relativeStyle.top = 0;
        relativeStyle.left = 0;

        return relativeStyle;
    }

    /**
     * Change the sections of the grid layout in the view settings.
     *
     * @param change - gets a copy of the stored sections and gives the new ones back
     */
    changeGridSections(change: (sections: ViewSection[]) => ViewSection[]): void {
        const stored = store.getState().visProject[this.props.view]?.settings?.sections;
        const sections = (Array.isArray(stored) ? stored : []).map(section =>
            section && typeof section === 'object' ? { ...section } : section,
        );
        this.props.context.onWidgetsChanged?.(null, this.props.view, { sections: change(sections) });
    }

    /**
     * The controls the editor shows under a section: narrower, wider and remove. The widgets of a removed section
     * stay relative and go to the section of the widgets no section lists.
     *
     * @param index - where the section is in the view settings
     * @param maxSections - the most section columns the view has
     */
    renderGridSectionControls(index: number, maxSections: number): React.JSX.Element {
        const stored = store.getState().visProject[this.props.view]?.settings?.sections?.[index];
        const span = Math.max(1, Math.floor(Number(stored?.columnSpan) || 1));
        const setSpan = (columnSpan: number): void =>
            this.changeGridSections(sections => {
                sections[index] = { ...sections[index], columnSpan };
                return sections;
            });

        return (
            <div
                className="vis-grid-section-controls"
                // not the start of a selection frame on the view
                onMouseDown={e => e.stopPropagation()}
            >
                <button
                    type="button"
                    title={I18n.t('Narrower')}
                    disabled={span <= 1}
                    onClick={() => setSpan(span - 1)}
                >
                    −
                </button>
                <button
                    type="button"
                    title={I18n.t('Wider')}
                    disabled={span >= maxSections}
                    onClick={() => setSpan(span + 1)}
                >
                    +
                </button>
                <button
                    type="button"
                    title={I18n.t('Remove section')}
                    onClick={() => this.changeGridSections(sections => sections.filter((_, i) => i !== index))}
                >
                    ✕
                </button>
            </div>
        );
    }

    /**
     * Render the relative widgets in the sections of the grid layout, see visGridLayout.ts.
     *
     * The sections flow over the section columns that fit into the width of the view, and each section is a grid
     * of `GRID_COLUMNS` columns per section column that it occupies. Every widget in it is a cell of that grid.
     *
     * @param widgets - the relative widgets the view shows, in their order
     * @param moveAllowed - the selected widgets may be moved
     * @param viewWidth - the width the widgets are shown or hidden at, see getVisibilityWidth()
     */
    renderGridSections(widgets: AnyWidgetId[], moveAllowed: boolean, viewWidth: number): React.JSX.Element[] | null {
        const view = this.props.view;
        const project = store.getState().visProject;
        const settings = project[view].settings;
        const layout = getGridLayout(settings);
        const columnCount = getSectionColumnCount(this.state.width, layout);
        // the editor keeps the empty sections, so that they can be filled
        this.lastGridSections = buildGridSections(settings?.sections, widgets, columnCount, this.props.editMode);
        // while a widget is dragged, and until the project carries where it was dropped, the drag decides
        const gridDrag = this.state.gridDrag;
        const sections = gridDrag ? gridDrag.sections : this.lastGridSections;
        if (!sections.length && !this.props.editMode) {
            return null;
        }
        // what observeGridCells() compares, to set itself up anew when the arrangement changed
        this.renderedGridLayout = JSON.stringify([
            columnCount,
            !!gridDrag && !gridDrag.dropped,
            sections.map(section => [section.id, section.columnSpan, section.widgets]),
        ]);

        const renderedSections: React.JSX.Element[] = sections.map(section => {
            this.refGridSections[section.id] ||= React.createRef();
            const refSection = this.refGridSections[section.id];
            const columns = GRID_COLUMNS * section.columnSpan;

            const style = {
                // the widgets limit their columns to this, see getGridCellCss()
                [GRID_COLUMNS_VAR]: columns,
                gridColumn: `span ${section.columnSpan}`,
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gridAutoRows: `minmax(${layout.rowHeight}px, auto)`,
                gridAutoFlow: 'row dense',
                gap: layout.gridGap,
                position: 'relative',
                // an empty section, as the editor shows it, would have no height at all
                minHeight: layout.rowHeight,
            } as React.CSSProperties;

            return (
                <div
                    key={section.id}
                    ref={refSection}
                    data-section={section.id}
                    className={Utils.clsx(
                        'vis-grid-section',
                        this.props.editMode && 'vis-grid-section-edit',
                        section.implicit && 'vis-grid-section-implicit',
                    )}
                    style={style}
                >
                    {this.props.editMode && !section.implicit && section.index !== undefined
                        ? this.renderGridSectionControls(section.index, layout.maxSections)
                        : null}
                    {section.widgets.map((id, index) =>
                        // The slot the dragged widget would drop into; the widget itself follows the cursor as a
                        // copy, see createDragGhost()
                        gridDrag && !gridDrag.dropped && id === gridDrag.wid ? (
                            <div
                                key={`placeholder_${id}`}
                                className="vis-editmode-widget-shadow"
                                style={VisBaseWidget.getGridCellStyle(
                                    project[view].widgets[id]?.style,
                                    settings,
                                    index,
                                )}
                            />
                        ) : (
                            VisView.getOneWidget(index, project[view].widgets[id], {
                                context: this.props.context,
                                editMode: this.props.editMode,
                                id,
                                isRelative: true,
                                gridCell: true,
                                viewWidth,
                                mouseDownOnView: this.mouseDownOnView,
                                moveAllowed,
                                ignoreMouseEvents: this.ignoreMouseEvents,
                                onIgnoreMouseEvents: this.onIgnoreMouseEvents,
                                // the can.js widgets are inserted into the section, in the order of the section
                                refParent: refSection,
                                askView: this.askView,
                                relativeWidgetOrder: section.widgets,
                                selectedWidgets: this.movement?.selectedWidgetsWithRectangle || this.selectedWidgets,
                                selectedGroup: null,
                                view,
                                customSettings: this.props.customSettings,
                                viewsActiveFilter: this.props.viewsActiveFilter,
                            })
                        ),
                    )}
                </div>
            );
        });

        if (this.props.editMode) {
            // after the sections of the settings, before the widgets no section lists
            const implicitAt = renderedSections.length - (sections[sections.length - 1]?.implicit ? 1 : 0);
            renderedSections.splice(
                implicitAt,
                0,
                <div
                    key="_add"
                    className="vis-grid-section-add"
                    style={{ minHeight: layout.rowHeight }}
                    title={I18n.t('Add section')}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => this.changeGridSections(list => [...list, { id: newSectionId(list), widgets: [] }])}
                >
                    + {I18n.t('Add section')}
                </div>,
            );
        }

        return [
            <div
                key="grid"
                className="vis-grid-view"
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                    gridAutoFlow: layout.denseSections ? 'row dense' : 'row',
                    // a section is as high as its widgets, not as the highest one next to it
                    alignItems: 'start',
                    gap: layout.sectionGap,
                    padding: layout.gridGap,
                    boxSizing: 'border-box',
                    maxWidth: getGridMaxWidth(columnCount, layout),
                    margin: '0 auto',
                }}
            >
                {renderedSections}
            </div>,
        ];
    }

    getCountOfRelativeColumns(settings: ViewSettings, relativeWidgetsCount: number): number {
        // number of columns
        const width = this.state.width;
        if (width) {
            if (settings.columnWidth && isVarFinite(settings.columnWidth)) {
                return Math.floor(this.state.width / settings.columnWidth) + 1;
            }

            let columns;
            if (width < 600) {
                columns = 1;
            } else if (width < 900) {
                columns = 2;
            } else if (width < 1200) {
                columns = 3;
            } else if (width < 2064) {
                columns = 4;
            } else {
                columns = Math.floor(width / 500) + 1;
            }

            if (columns > relativeWidgetsCount) {
                columns = relativeWidgetsCount;
            }
            if (columns > MAX_COLUMNS) {
                columns = MAX_COLUMNS;
            }

            return columns;
        }

        return 1;
    }

    renderNavigation(content: React.JSX.Element): React.JSX.Element {
        return (
            <VisNavigation
                context={this.props.context}
                activeView={this.props.activeView}
                view={this.props.view}
                editMode={this.props.editMode}
                menuWidth={this.state.menuWidth}
                theme={this.props.context.theme}
                setMenuWidth={(menuWidth: 'hidden' | 'narrow' | 'full'): Promise<void> => {
                    window.localStorage.setItem('vis.menuWidth', menuWidth);
                    this.setState({ menuWidth });

                    return new Promise(resolve => {
                        // re-calculate the width of the view
                        setTimeout(() => {
                            this.updateViewWidth();
                            resolve();
                        }, 400);
                    });
                }}
            >
                {content}
            </VisNavigation>
        );
    }

    /**
     * Check if all widgets of the view are rendered into an own div with the configured screen size,
     * that is centered on the view.
     */
    static isScreenLimited(settings: ViewSettings | undefined): boolean {
        if (!settings?.limitScreen) {
            return false;
        }
        if (settings.limitScreenDesktop && (window.screen.width < 800 || window.screen.height < 800)) {
            return false;
        }
        if (settings.limitForInstances) {
            const visInstance = window.localStorage.getItem('visInstance');
            if (!visInstance) {
                return false;
            }
            const instances = settings.limitForInstances
                .split(',')
                .map(i => i.trim())
                .filter(i => i);
            if (instances.length && !instances.includes(visInstance)) {
                return false;
            }
        }

        // the size of the screen must be known
        return !!(
            isVarFinite(settings.sizex) &&
            parseFloat(settings.sizex as unknown as string) &&
            isVarFinite(settings.sizey) &&
            parseFloat(settings.sizey as unknown as string)
        );
    }

    render(): React.JSX.Element | null {
        let rxAbsoluteWidgets: (React.JSX.Element | null)[] = [];
        let rxRelativeWidgets: React.JSX.Element[] | null = [];
        let rxGroupWidget;

        const contextView = store.getState().visProject[this.props.view];

        if (!this.props.view || !contextView) {
            return null;
        }

        const settings = contextView.settings;
        // the widgets are rendered into the limited screen div, so the CanJS widgets must be placed there too
        const screenLimited = VisView.isScreenLimited(settings);

        // Already before the widgets are rendered for the first time, so that the view is measured before they
        // are. Grouped widgets count too: the width is handed on into their group.
        this.usesWidthVisibility = Object.values(contextView.widgets || {}).some(widget =>
            hasWidthVisibility(widget?.data),
        );

        if (this.props.view === this.props.activeView && this.props.editMode && !this.keysHandlerInstalled) {
            this.installKeyHandlers();
        } else if ((this.props.view !== this.props.activeView || !this.props.editMode) && this.keysHandlerInstalled) {
            this.uninstallKeyHandlers();
        }

        // wait till the view has real div (ref), because of CanJS widgets. they really need a DOM div
        // and wait for themes too
        if (this.state.mounted && this.state.themeCode && this.refView.current) {
            // save initial filter
            if (!this.props.viewsActiveFilter?.[this.props.view]) {
                this.props.viewsActiveFilter[this.props.view] = (contextView.settings?.filterkey || '')
                    .split(',')
                    .map(f => f.trim())
                    .filter(f => f);
            }

            const widgets = contextView.widgets;
            let moveAllowed = true;
            if (widgets) {
                let relativeWidgetOrder: AnyWidgetId[] = [];

                if (this.props.selectedGroup) {
                    relativeWidgetOrder = [...(widgets[this.props.selectedGroup]?.data?.members ?? [])];
                } else if (contextView.settings?.order) {
                    relativeWidgetOrder = [...contextView.settings.order];
                }

                // by group editing first relative, then absolute
                if (this.props.selectedGroup) {
                    relativeWidgetOrder.sort((a, b) => {
                        const widgetA = widgets[a];
                        const widgetB = widgets[b];
                        const isRelativeA =
                            widgetA.style &&
                            (widgetA.style.position === 'relative' ||
                                widgetA.style.position === 'static' ||
                                widgetA.style.position === 'sticky');
                        const isRelativeB =
                            widgetB.style &&
                            (widgetB.style.position === 'relative' ||
                                widgetB.style.position === 'static' ||
                                widgetB.style.position === 'sticky');
                        if (isRelativeA && isRelativeB) {
                            return 0;
                        }
                        if (isRelativeA) {
                            return -1;
                        }
                        return 1;
                    });
                }

                const relativeWidgets = [];
                const absoluteWidgets = [];
                const unknownWidgets = [];

                if (this.props.editMode && this.selectedWidgets?.length) {
                    this.selectedWidgets.forEach((id: AnyWidgetId) => {
                        const widget = contextView.widgets[id];
                        if (!widget || (widget.groupid && !this.props.selectedGroup)) {
                            return;
                        }
                        if (widget.style) {
                            if (widget.style.position === 'relative') {
                                relativeWidgets.push(id);
                            } else if (!widget.style.position || widget.style.position === 'absolute') {
                                absoluteWidgets.push(id);
                            } else {
                                unknownWidgets.push(id);
                            }
                        } else {
                            absoluteWidgets.push(id);
                        }
                    });

                    // sticky widgets cannot be moved
                    if (unknownWidgets.length) {
                        moveAllowed = false;
                    } else if (relativeWidgets.length && absoluteWidgets.length) {
                        // absolute and relative widgets cannot be moved together
                        moveAllowed = false;
                    }
                }

                const listRelativeWidgetsOrder: AnyWidgetId[] = [];
                const listAbsoluteWidgetsOrder: AnyWidgetId[] = [];
                const filterWidgets = contextView.filterWidgets;
                const filterInvert = contextView.filterInvert;
                const viewWidth = this.getVisibilityWidth();

                // calculate the order of relative widgets
                Object.keys(widgets).forEach(id => {
                    // the group will be rendered apart
                    if (id === this.props.selectedGroup) {
                        return;
                    }

                    const widget = contextView.widgets[id as AnyWidgetId];
                    // Ignore grouped widgets in non-group-edit mode. They will be rendered in BasicGroup
                    if (!widget || (widget.grouped && !this.props.selectedGroup)) {
                        return;
                    }

                    if (!this.props.selectedGroup && widget.usedInWidget) {
                        // do not show built-in widgets on view directly
                        return;
                    }

                    // A widget the user must not see may not occupy a slot in the relative widget
                    // order either: that order drives the DOM insertion of can widgets and the
                    // position number and up/down arrows in the editor. So this check has to stay
                    // even though getOneWidget() checks the access again before rendering.
                    if (
                        !hasWidgetAccess({
                            view: this.props.view,
                            editMode: this.props.editMode,
                            project: store.getState().visProject,
                            user: store.getState().activeUser,
                            wid: id as AnyWidgetId,
                        })
                    ) {
                        // do not show widget because user has no access
                        return;
                    }

                    // The same for a widget that is not shown at this width of the view: in the grid layout it
                    // must not leave an empty cell behind. The editor shows it, dimmed, so that it can be edited.
                    if (!this.props.editMode && !isShownAtWidth(widget.data, viewWidth)) {
                        return;
                    }

                    // if group edition, ignore all widgets from other groups
                    if (
                        this.props.selectedGroup &&
                        id !== this.props.selectedGroup &&
                        widget.groupid !== this.props.selectedGroup
                    ) {
                        return;
                    }

                    // filter out the widgets in edit mode
                    if (this.props.editMode && filterWidgets?.length) {
                        if (widget.data?.filterkey) {
                            let filterValues: string[] | string = widget.data.filterkey;
                            if (filterValues && typeof filterValues === 'string') {
                                filterValues = filterValues
                                    .split(',')
                                    .map(f => f.trim())
                                    .filter(f => f);
                            }
                            // if filterInvert, then show only widgets with filterkey
                            if (filterInvert) {
                                if (!filterWidgets.find(f => filterValues.includes(f))) {
                                    return;
                                }
                            } else if (filterWidgets.find(f => filterValues.includes(f))) {
                                // Else hide widgets with filterkey in filterWidgets
                                return;
                            }
                        } else if (filterInvert) {
                            return;
                        }
                    }

                    const isRelative =
                        widget.style &&
                        (widget.style.position === 'relative' ||
                            widget.style.position === 'static' ||
                            widget.style.position === 'sticky');
                    if (isRelative && id !== this.props.selectedGroup) {
                        if (!listRelativeWidgetsOrder.includes(id as AnyWidgetId)) {
                            listRelativeWidgetsOrder.push(id as AnyWidgetId);
                        }
                    } else {
                        const pos = listRelativeWidgetsOrder.indexOf(id as AnyWidgetId);
                        // if this widget is in relative order, remove it
                        pos !== -1 && listRelativeWidgetsOrder.splice(pos, 1);

                        if (!listAbsoluteWidgetsOrder.includes(id as AnyWidgetId)) {
                            listAbsoluteWidgetsOrder.push(id as AnyWidgetId);
                        }
                    }
                });

                if (!this.props.selectedGroup) {
                    for (let t = relativeWidgetOrder.length - 1; t >= 0; t--) {
                        if (!contextView.widgets[relativeWidgetOrder[t]]) {
                            relativeWidgetOrder.splice(t, 1);
                        }
                    }
                }

                // remembered for the drag: the gesture has to know the order without rebuilding it
                this.lastRelativeOrder = listRelativeWidgetsOrder;

                // sort relative widgets according to order
                listRelativeWidgetsOrder.sort((a, b) => {
                    const posA = relativeWidgetOrder.indexOf(a);
                    const posB = relativeWidgetOrder.indexOf(b);
                    if (posA === -1 && posB === -1) {
                        return 0;
                    }
                    if (posA === -1) {
                        return 1;
                    }
                    if (posB === -1) {
                        return -1;
                    }
                    return posA - posB;
                });

                const columns =
                    this.props.selectedGroup || !settings
                        ? 1
                        : this.getCountOfRelativeColumns(settings, listRelativeWidgetsOrder.length);
                const wColumns = new Array(columns);
                for (let w = 0; w < wColumns.length; w++) {
                    wColumns[w] = [];
                }

                const view = this.props.view;

                rxAbsoluteWidgets = listAbsoluteWidgetsOrder.map((id, index) =>
                    VisView.getOneWidget(index, contextView.widgets[id], {
                        context: this.props.context,
                        editMode: this.props.editMode,
                        id,
                        isRelative: false,
                        viewWidth,
                        mouseDownOnView: this.mouseDownOnView,
                        moveAllowed,
                        ignoreMouseEvents: this.ignoreMouseEvents,
                        onIgnoreMouseEvents: this.onIgnoreMouseEvents,
                        refParent: this.props.selectedGroup
                            ? this.refRelativeView
                            : screenLimited
                              ? this.refLimitScreen
                              : this.refView,
                        askView: this.askView,
                        relativeWidgetOrder,
                        selectedGroup: this.props.selectedGroup || null,
                        selectedWidgets: this.movement?.selectedWidgetsWithRectangle || this.selectedWidgets,
                        view,
                        viewsActiveFilter: this.props.viewsActiveFilter,
                        customSettings: this.props.customSettings,
                    }),
                );

                if (this.isGridLayout()) {
                    rxRelativeWidgets = this.renderGridSections(listRelativeWidgetsOrder, moveAllowed, viewWidth);
                } else if (listRelativeWidgetsOrder.length) {
                    let columnIndex = 0;

                    // While a relative widget is dragged, the tentative order decides the layout, so the other
                    // widgets flow around it as the cursor moves.
                    const relativeDrag = this.state.relativeDrag;
                    const renderOrder = relativeDrag
                        ? relativeDrag.order.filter(id => listRelativeWidgetsOrder.includes(id))
                        : listRelativeWidgetsOrder;

                    renderOrder.forEach((id, index) => {
                        const widget = store.getState().visProject[view].widgets[id];
                        // if newLine, start from the beginning
                        if (widget.style.newLine) {
                            columnIndex = 0;
                        }

                        // The copy under the cursor shows the widget itself, so its slot only has to show where
                        // it will land: a box of its size, marked by its own background. The widget is not
                        // rendered at all while it is dragged - putting it somewhere else in the tree would
                        // unmount it, which is exactly what must not happen during a gesture.
                        if (relativeDrag && !relativeDrag.dropped && id === relativeDrag.wid) {
                            wColumns[columnIndex].push(
                                <div
                                    key={`placeholder_${id}`}
                                    className="vis-editmode-widget-shadow"
                                    style={{ width: relativeDrag.width, height: relativeDrag.height }}
                                />,
                            );
                            columnIndex++;
                            if (columnIndex >= columns) {
                                columnIndex = 0;
                            }
                            return;
                        }

                        const w = VisView.getOneWidget(index, widget, {
                            // custom attributes
                            context: this.props.context,
                            editMode: this.props.editMode, // the relative widget cannot be multi-view
                            id,
                            isRelative: true,
                            viewWidth,
                            mouseDownOnView: this.mouseDownOnView,
                            moveAllowed,
                            ignoreMouseEvents: this.ignoreMouseEvents,
                            onIgnoreMouseEvents: this.onIgnoreMouseEvents,
                            refParent: this.props.selectedGroup
                                ? this.refRelativeView
                                : this.refRelativeColumnsView[columnIndex],
                            askView: this.askView,
                            relativeWidgetOrder: this.props.selectedGroup
                                ? relativeWidgetOrder
                                : listRelativeWidgetsOrder,
                            selectedWidgets: this.movement?.selectedWidgetsWithRectangle || this.selectedWidgets,
                            selectedGroup: this.props.selectedGroup || null,
                            view,
                            customSettings: this.props.customSettings,
                            viewsActiveFilter: this.props.viewsActiveFilter,
                        });
                        wColumns[columnIndex].push(w);
                        columnIndex++;
                        if (columnIndex >= columns) {
                            columnIndex = 0;
                        }
                    });

                    if (this.props.selectedGroup) {
                        rxRelativeWidgets = wColumns[0];
                    } else {
                        const style: React.CSSProperties = {};
                        if (settings?.columnWidth && isVarFinite(settings.columnWidth)) {
                            style.maxWidth = parseFloat(settings.columnWidth as unknown as string);
                        }
                        rxRelativeWidgets = wColumns.map((column, i) => (
                            <div
                                ref={this.refRelativeColumnsView[i]}
                                key={i}
                                style={style}
                                className={Utils.clsx('vis-view-column', this.props.editMode && 'vis-view-column-edit')}
                            >
                                {column}
                            </div>
                        ));
                    }
                } else {
                    rxRelativeWidgets = null;
                }

                // render group widget apart
                if (this.props.selectedGroup) {
                    rxGroupWidget = VisView.getOneWidget(0, contextView.widgets[this.props.selectedGroup], {
                        context: this.props.context,
                        editMode: this.props.editMode,
                        id: this.props.selectedGroup,
                        isRelative: false,
                        viewWidth,
                        mouseDownOnView: this.mouseDownOnView,
                        moveAllowed,
                        ignoreMouseEvents: this.ignoreMouseEvents,
                        onIgnoreMouseEvents: this.onIgnoreMouseEvents,
                        refParent: screenLimited ? this.refLimitScreen : this.refView,
                        askView: this.askView,
                        relativeWidgetOrder,
                        selectedGroup: this.props.selectedGroup,
                        selectedWidgets: this.movement?.selectedWidgetsWithRectangle || this.selectedWidgets,
                        view,
                        viewsActiveFilter: this.props.viewsActiveFilter,
                        customSettings: this.props.customSettings,
                    });
                }
            }
        }

        let className = 'vis-view';
        const style: React.CSSProperties = {
            width: '100%',
            // The grid layout is in the flow of the view, so the view grows with it; `.vis-view` keeps it at least
            // as high as the screen. See getRelativeStyle().
            height: this.isGridLayout() && !VisView.isScreenLimited(settings) ? 'auto' : '100%',
        };

        if (this.state.loadedjQueryTheme !== this.getJQueryThemeName() && this.props.view) {
            if (!this.loadingTheme) {
                this.loadingTheme = true;
                setTimeout(
                    () => this.loadJqueryTheme(this.getJQueryThemeName()),
                    this.state.loadedjQueryTheme ? 50 : 0,
                );
            }
        }
        const backgroundStyle: React.CSSProperties = {};
        const backgroundClass: string = settings?.style?.background_class || '';

        settings?.style &&
            Object.keys(settings.style).forEach(attr => {
                if (attr === 'background_class') {
                    className = addClass(className, settings.style?.background_class);
                } else {
                    const isBg = attr.startsWith('background');
                    if (!settings['bg-image'] || !isBg) {
                        const value: string = (settings.style as Record<string, string>)[attr];
                        // convert background-color => backgroundColor
                        attr = attr.replace(/(-\w)/g, text => text[1].toUpperCase());
                        (style as Record<string, string>)[attr] = value;
                        if (isBg) {
                            (backgroundStyle as Record<string, string>)[attr] = value;
                        }
                    }
                }
            });

        // Check if a custom theme should be used
        let theme = this.props.context.theme;
        const customThemeType = this.props.customSettings?.themeType;
        // if a custom theme differs from the current one => create a new theme
        if (this.props.customSettings?.viewStyle?.overrides) {
            // override the theme with custom settings
            theme = createTheme(
                customThemeType || this.props.context.theme.palette.mode,
                this.props.customSettings.viewStyle.overrides,
                false,
            );
        } else if (customThemeType && customThemeType !== theme.palette.mode) {
            if (!this.theme[customThemeType]) {
                // cache theme
                this.theme[customThemeType] = createTheme(customThemeType, undefined, false);
            }
            theme = this.theme[customThemeType];
        }

        if (!style.backgroundColor && !style.background) {
            if (this.props.customSettings?.viewStyle?.backgroundColor) {
                backgroundStyle.backgroundColor = this.props.customSettings.viewStyle.backgroundColor;
            } else if (this.props.customSettings?.themeType === 'dark') {
                backgroundStyle.backgroundColor = '#000';
            } else {
                backgroundStyle.backgroundColor = theme.palette.mode === 'dark' ? '#000' : '#fff';
            }
        }

        if (!style.color) {
            // override the text color from custom settings
            if (this.props.customSettings?.viewStyle?.color) {
                style.color = this.props.customSettings.viewStyle.color;
            } else {
                // or set according to theme
                style.color = theme.palette.mode === 'dark' ? '#fff' : '#000';
            }
        }

        // override font family from custom settings
        if (!style.fontFamily && this.props.customSettings?.viewStyle?.fontFamily) {
            style.fontFamily = this.props.customSettings.viewStyle.fontFamily;
        }

        // if the current view is not active, so hide it and show only if it is active
        if (this.props.view !== this.props.activeView) {
            style.display = 'none';
        }

        if (this.props.context.container) {
            style.overflow = 'hidden';
        }

        let gridDiv = null;
        if (store.getState().visProject[this.props.view].settings?.snapType === 2 && this.props.editMode) {
            gridDiv = VisView.renderGitter(contextView.settings?.gridSize, contextView.settings?.snapColor);
        }

        if (this.props.style) {
            Object.assign(style, this.props.style);
        }

        // apply image
        if (settings?.['bg-image']) {
            backgroundStyle.backgroundImage = `url("../${this.props.context.adapterName}.${this.props.context.instance}/${this.props.context.projectName}${settings['bg-image'].substring(9)}")`; // "_PRJ_NAME".length = 9
            backgroundStyle.backgroundRepeat = 'no-repeat';
            backgroundStyle.backgroundPosition = 'top left';
            if (settings['bg-color']) {
                backgroundStyle.backgroundColor = settings['bg-color'];
            }
            if (settings['bg-position-x']) {
                backgroundStyle.backgroundPositionX = isVarFinite(settings['bg-position-x'])
                    ? `${settings['bg-position-x']}px`
                    : settings['bg-position-x'];
            }
            if (settings['bg-position-y']) {
                backgroundStyle.backgroundPositionY = isVarFinite(settings['bg-position-y'])
                    ? `${settings['bg-position-y']}px`
                    : settings['bg-position-y'];
            }
            if (settings['bg-width'] && settings['bg-height']) {
                const w = isVarFinite(settings['bg-width']) ? `${settings['bg-width']}px` : settings['bg-width'];
                const h = isVarFinite(settings['bg-height']) ? `${settings['bg-height']}px` : settings['bg-height'];
                backgroundStyle.backgroundSize = `${w} ${h}`;
            } else if (settings['bg-width']) {
                backgroundStyle.backgroundSize = `${isVarFinite(settings['bg-width']) ? `${settings['bg-width']}px` : settings['bg-width']} auto`;
            } else if (settings['bg-height']) {
                const w = isVarFinite(settings['bg-height']) ? `${settings['bg-height']}px` : settings['bg-height'];
                backgroundStyle.backgroundSize = `auto ${w}`;
            }
        }
        Object.assign(style, backgroundStyle);

        let renderedWidgets;

        let limitScreenStyle: React.CSSProperties | null = null;
        // limit screen size of desired
        if (screenLimited) {
            const ww = parseFloat(settings.sizex as unknown as string);
            const hh = parseFloat(settings.sizey as unknown as string);
            const borderWidth = parseFloat(settings.limitScreenBorderWidth as unknown as string) || 0;
            const borderColor = settings.limitScreenBorderColor || '#333';
            const borderStyle = settings.limitScreenBorderStyle || 'dotted';
            const bgColor = settings.limitScreenBackgroundColor || null;

            limitScreenStyle = {
                ...backgroundStyle,
                width: ww + borderWidth * 2,
                height: hh + borderWidth * 2,
                minWidth: ww + borderWidth * 2,
                minHeight: hh + borderWidth * 2,
                overflow: 'auto',
                position: 'relative',
                boxSizing: 'border-box',
                borderWidth,
                borderColor,
                borderStyle,
            };
            style.display = 'flex';
            style.justifyContent = 'center';
            style.alignItems = 'center';
            style.backgroundColor = bgColor || undefined;
        }

        if (this.props.selectedGroup) {
            // draw all widgets in div, that has exact size of the group
            renderedWidgets = rxGroupWidget;
        } else if (settings) {
            renderedWidgets = (
                <>
                    {rxRelativeWidgets ? (
                        <div
                            ref={this.refRelativeView}
                            style={this.getRelativeStyle(settings, this.props.selectedGroup, !!limitScreenStyle)}
                            className="vis-relative-view"
                        >
                            {rxRelativeWidgets}
                        </div>
                    ) : null}
                    {rxAbsoluteWidgets}
                </>
            );
        }

        if (limitScreenStyle) {
            renderedWidgets = (
                <div
                    ref={this.refLimitScreen}
                    style={limitScreenStyle}
                    className="vis-limit-screen"
                >
                    {renderedWidgets}
                </div>
            );
        }

        let renderedView = (
            <div
                className={`${className} visview_${this.props.view.replace(/\s/g, '_')}`}
                ref={this.refView}
                id={`visview_${this.props.view.replace(/\s/g, '_')}`}
                onMouseDown={
                    !this.props.context.runtime ? e => this.props.editMode && this.mouseDownLocal?.(e) : undefined
                }
                onDragStart={
                    // Nothing in the editor is dragged natively: the palette and the views list use dnd-kit,
                    // which works on pointer events. What the browser starts on its own - on an image, a link
                    // or a selection that a gesture left behind - cannot be dropped anywhere, so it only puts
                    // its "no drop" sign and a ghost of the element over the view and takes the mouse events
                    // away from the move or resize gesture that is actually running.
                    !this.props.context.runtime && this.props.editMode ? e => e.preventDefault() : undefined
                }
                onDoubleClick={
                    this.props.context.runtime ? () => this.props.editMode && this.doubleClickOnView?.() : undefined
                }
                style={style}
            >
                <style>{this.state.themeCode}</style>
                {gridDiv}
                {limitScreenStyle ? null : this.renderScreenSize()}
                {this.state.rulers.map((ruler, key) => (
                    <div
                        key={key}
                        style={{
                            pointerEvents: 'none',
                            userSelect: 'none',
                            position: 'absolute',
                            width: ruler.type === 'horizontal' ? '100%' : 10,
                            height: ruler.type === 'horizontal' ? 10 : '100%',
                            borderStyle: 'solid',
                            borderColor: 'red',
                            borderWidth: 0,
                            borderLeftWidth: ruler.type === 'horizontal' ? 0 : 1,
                            borderTopWidth: ruler.type === 'horizontal' ? 1 : 0,
                            left: ruler.type === 'horizontal' ? 0 : ruler.value,
                            top: ruler.type === 'horizontal' ? ruler.value : 0,
                            zIndex: 1000,
                        }}
                    />
                ))}
                {renderedWidgets}
                {this.props.editMode ? (
                    <div
                        className="vis-adorner-layer"
                        ref={this.refAdornerLayer}
                        // The layer covers the view and lets every click through; only the marks inside it take
                        // the mouse back (`.vis-editmode-resizer` and `.vis-editmode-widget-name` in vis.css).
                        //
                        // The z-index has to clear the widgets (`visRxWidget` gives a selected one `800 + own`)
                        // and the rulers at 1000, but it must stay BELOW the chrome of the editor, which is
                        // portalled to the body and therefore compares against this layer directly: MUI puts an
                        // app bar at 1100, a drawer at 1200, a dialog at 1300 and a tooltip at 1500. At 1400 a
                        // name plate was drawn over the open dialog.
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                            zIndex: 1050,
                        }}
                    />
                ) : null}
            </div>
        );

        // render the menu if enabled and not in widget;
        // only if the view is now active (not alwaysRender)
        if (settings && (settings.navigation || settings.navigationBar) && this.props.view === this.props.activeView) {
            renderedView = this.renderNavigation(renderedView);
        }

        // apply a view background to a whole document
        if (!this.props.visInWidget && this.props.activeView === this.props.view) {
            const bgStyle = JSON.stringify(backgroundStyle);
            if (!window._lastAppliedStyle || window._lastAppliedStyle !== bgStyle) {
                window._lastAppliedStyle = bgStyle;
                window.document.documentElement.removeAttribute('style');
                // apply background style to html
                Object.keys(backgroundStyle).forEach(
                    attr =>
                        ((window.document.documentElement.style as Record<string, any>)[attr] = (
                            backgroundStyle as Record<string, any>
                        )[attr]),
                );
            }
            window.document.documentElement.className = backgroundClass;
        }

        return (
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={theme}>{renderedView}</ThemeProvider>
            </StyledEngineProvider>
        );
    }
}

export interface VisEngineHandlers {
    onStealStyle: (attr: string, cb: (value: string | number | boolean | null) => void) => void;
    pxToPercent: (oldStyle: WidgetStyle, newStyle: WidgetStyle) => null | WidgetStyle;

    onPxToPercent: (wids: AnyWidgetId[], attr: string, cb: (results: (string | null)[]) => void) => (string | null)[];
    onPercentToPx: (wids: AnyWidgetId[], attr: string, cb: (results: (string | null)[]) => void) => (string | null)[];
    gridDropTarget: VisView['gridDropTarget'];
}

export default VisView;
