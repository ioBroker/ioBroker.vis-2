import type React from 'react';
import type moment from 'moment';
import type {
    CommonColors,
    PaletteAugmentColorOptions,
    PaletteColor,
    PaletteTonalOffset,
    TypeAction,
    TypeBackground,
    TypeDivider,
    TypeText,
} from '@mui/material/styles';
import type { Color, PaletteMode } from '@mui/material';

import type { Connection, ThemeType, IobTheme, ThemeName } from '@iobroker/gui-components';

interface VisView extends React.FC<VisViewProps> {
    getOneWidget(
        index: number,
        widget: SingleWidget | GroupWidget,
        options: CreateWidgetOptions,
    ): React.JSX.Element | null;
}

export type AskViewCommand = 'register' | 'unregister' | 'update' | 'getRef' | 'getViewClass';

export type VisWidgetCommand =
    | 'includePossible'
    | 'includePossibleNOT'
    | 'startStealMode'
    | 'cancelStealMode'
    | 'startMove'
    | 'startResize'
    | 'stopMove'
    | 'stopResize'
    | 'collectFilters'
    | 'changeFilter'
    | 'updateContainers'
    | 'closeDialog'
    | 'openDialog'
    | 'updatePosition'
    | 'include';

export type WidgetReference = {
    id: AnyWidgetId;
    uuid?: string;
    widDiv?: HTMLDivElement | null;
    refService?: React.RefObject<HTMLElement | null>;
    onMove?: (x?: number, y?: number, save?: boolean) => void;
    onResize?: undefined | (() => void);
    onTempSelect?: (selected?: boolean) => void;
    onCommand?: (command: VisWidgetCommand, options?: any) => any;
    canHaveWidgets?: boolean;
    doNotWantIncludeWidgets?: boolean;
};

export interface VisBaseWidgetProps {
    /** Widget ID */
    id: AnyWidgetId;
    /** If edit mode */
    editMode: boolean;
    /** If runtime */
    runtime: boolean;
    /** View where widget is on */
    view: string;
    /** If it is positioned relative */
    isRelative: boolean;
    /** Currently selected widgets */
    selectedWidgets: AnyWidgetId[];
    /** Relative order of widgets */
    relativeWidgetOrder: AnyWidgetId[];
    /** If moving of widget is allowed */
    moveAllowed: boolean;
    /** Currently selected group */
    selectedGroup: GroupWidgetId | null;
    /** Additional context */
    context: VisContext;
    /** TPL type */
    tpl: string;
    /** Some filter */
    viewsActiveFilter: { [view: string]: string[] } | null;
    /** Function to register the widget */
    askView: (command: AskViewCommand, props?: WidgetReference) => any;
    onIgnoreMouseEvents: (bool: boolean) => void;
    onWidgetsChanged: (
        changesOfWidgets:
            | {
                  wid: AnyWidgetId;
                  view: string;
                  style: WidgetStyle;
                  data: WidgetData;
              }[]
            | null,
        view: string,
        viewSettings?: ViewSettings,
    ) => void;
    mouseDownOnView: (
        e: React.MouseEvent,
        wid: AnyWidgetId,
        isRelative: boolean,
        isResize?: boolean,
        isDoubleClick?: boolean,
    ) => void;
    refParent: React.RefObject<HTMLElement | null>;
    customSettings: Record<string, any>;
    /** The widget is a cell of a section of the grid layout: it takes its size from `style.gridColumns/gridRows` */
    gridCell?: boolean;
    /** The width of the view in px, for the data attributes `visibility-min-width` and `visibility-max-width` */
    viewWidth?: number;
}

export type ViewCommand = 'updateContainers' | 'changeFilter' | 'closeDialog' | 'openDialog' | 'collectFilters';
export type ViewCommandOptions = {
    filter?: string[] | string;
    [key: string]: any;
} | null;

export type RxWidgetAttributeType =
    | 'text'
    | 'delimiter'
    | 'help'
    | 'html'
    | 'json'
    | 'id'
    | 'instance'
    | 'select'
    | 'nselect'
    | 'auto'
    | 'checkbox'
    | 'number'
    | 'select-views'
    | 'custom'
    | 'image'
    | 'color'
    | 'password'
    | 'history'
    | 'hid'
    | 'icon'
    | 'dimension'
    | 'fontname'
    | 'groups'
    | 'class'
    | 'filters'
    | 'views'
    | 'style'
    | 'icon64'
    | 'slider'
    | 'widget'
    | 'url';

export interface VisMarketplaceProps {
    language: ioBroker.Languages;
    addPage?: boolean;
    widget: { name: string; date: string; widget_id: string; image_id: string };
    installWidget: (widget: { name: string; date: string; widget_id: string; image_id: string }) => Promise<void>;
    installedWidgets?: { id: string }[];
    themeName: string;
    onAdded?: () => void;
}

export type PromiseName = `_promise_${WidgetSetName}`;
export type WidgetSetName = Branded<string, 'WidgetSetName'>;

export interface RxWidgetInfoCustomComponentContext {
    readonly socket: Connection;
    readonly projectName: string;
    readonly instance: number;
    readonly adapterName: string;
    readonly views: Project;
    readonly theme: VisTheme;
    readonly additionalSets: AdditionalIconSet;
}

export interface RxWidgetInfoCustomComponentProperties {
    readonly context: RxWidgetInfoCustomComponentContext;
    readonly selectedView: string;
    readonly selectedWidgets: AnyWidgetId[];
    readonly selectedWidget: AnyWidgetId;
}

/**
 * Condition of an attribute field (`hidden`, `disabled`, `error`): either the source of a JS
 * expression or a predicate over the widget data.
 *
 * Declared as a method so the parameter is checked bivariantly: widget sets narrow `data` to their
 * own `RxData` type, which a strictly contravariant function parameter would reject.
 */
/**
 * Callback of an attribute field that runs when the value changed.
 *
 * Declared as a method so the parameters are checked bivariantly: widget sets narrow `data` to their
 * own `RxData` type, which strictly contravariant function parameters would reject.
 */
export type RxWidgetInfoFieldChangeHandler = {
    bivarianceHack(
        field: RxWidgetInfoAttributesField,
        data: WidgetData,
        changeData: (newData: WidgetData) => void,
        socket: Connection,
        index?: number,
    ): Promise<void>;
}['bivarianceHack'];

export type RxWidgetInfoFieldPredicate = {
    bivarianceHack(data: WidgetData, index?: number): boolean;
}['bivarianceHack'];

export type RxWidgetInfoAttributesFieldText = {
    /** Field type */
    readonly type: 'text';
    /** Field default value */
    readonly default?: string;
    /** if true, no edit button will be shown. Default is true. */
    readonly noButton?: boolean;

    /** Used by counted fields */
    readonly index?: number;

    /** Name of the widget field */
    readonly name: string;
    /** Field label (i18n) */
    readonly label?: string;
    /** JS Function for conditional visibility */
    readonly hidden?: string | RxWidgetInfoFieldPredicate;
    /** Tooltip (i18n) */
    readonly tooltip?: string;
    /** JS Function for conditional disability */
    readonly disabled?: string | RxWidgetInfoFieldPredicate;
    /** JS Function for error */
    readonly error?: string | RxWidgetInfoFieldPredicate;
    /** Do not show binding symbol fot this field */
    readonly noBinding?: boolean;
    /** Callback called if the field value changed */
    readonly onChange?: RxWidgetInfoFieldChangeHandler;
    /** show clear button near the field */
    readonly clearButton?: boolean;
};

export type RxWidgetInfoAttributesFieldDelimiter = {
    /** Field type */
    readonly type: 'delimiter';
    /** It is not required here */
    readonly name: string;
    /** JS Function for conditional visibility */
    readonly hidden?: string | RxWidgetInfoFieldPredicate;

    /** Used by counted fields */
    readonly index?: number;
};

export type RxWidgetInfoAttributesFieldHelp = {
    /** Field type */
    readonly type: 'help';
    /** i18n help text - This text will be shown without a label */
    readonly text: string;
    /** if true, the text will not be translated  */
    readonly noTranslation?: boolean;
    /** this style will be applied to the text */
    readonly style?: React.CSSProperties;

    /** Used by counted fields */
    readonly index?: number;

    /** Name of the widget field */
    readonly name: string;
    /** Field label (i18n) */
    readonly label?: string;
    /** JS Function for conditional visibility */
    readonly hidden?: string | RxWidgetInfoFieldPredicate;
};

export type RxWidgetInfoAttributesFieldHTML = {
    /** Field type */
    readonly type: 'html' | 'json';
    /** Field default value */
    readonly default?: string;
    /** show multi-line editor */
    readonly multiline?: boolean;

    /** Used by counted fields */
    readonly index?: number;

    /** Name of the widget field */
    readonly name: string;
    /** Field label (i18n) */
    readonly label?: string;
    /** JS Function for conditional visibility */
    readonly hidden?: string | RxWidgetInfoFieldPredicate;
    /** Tooltip (i18n) */
    readonly tooltip?: string;
    /** JS Function for conditional disability */
    readonly disabled?: string | RxWidgetInfoFieldPredicate;
    /** JS Function for error */
    readonly error?: string | RxWidgetInfoFieldPredicate;
    /** Do not show binding symbol fot this field */
    readonly noBinding?: boolean;
    /** Callback called if the field value changed */
    readonly onChange?: RxWidgetInfoFieldChangeHandler;
};

export type RxWidgetInfoAttributesFieldID = {
    /** Field type */
    readonly type: 'id';
    /** Field default value */
    readonly default?: string;
    /** Do not write 'nothing_selected' into the field by creation */
    readonly noInit?: boolean;
    /** Do not subscribe on changes of the object */
    readonly noSubscribe?: boolean;
    /**
     * Filter of objects (not JSON string, it is an object), like:
     - `{common: {custom: true}}` - show only objects with some custom settings
     - `{common: {custom: 'sql.0'}}` - show only objects with sql.0 custom settings (only of the specific instance)
     - `{common: {custom: '_dataSources'}}` - show only objects of adapters `influxdb' or 'sql' or 'history'
     - `{common: {custom: 'adapterName.'}}` - show only objects of the custom settings for specific adapter (all instances)
     - `{type: 'channel'}` - show only channels
     - `{type: ['channel', 'device']}` - show only channels and devices
     - `{common: {type: 'number'}` - show only states of type 'number
     - `{common: {type: ['number', 'string']}` - show only states of type 'number and string
     - `{common: {role: 'switch'}` - show only states with roles starting from switch
     - `{common: {role: ['switch', 'button']}` - show only states with roles starting from `switch` and `button`
     */
    readonly filter?:
        | {
              readonly type?: ioBroker.ObjectType | ioBroker.ObjectType[];
              readonly common?: {
                  readonly type?: ioBroker.CommonType | ioBroker.CommonType[];
                  readonly role?: string | string[];
                  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
                  readonly custom?: '_' | '_dataSources' | true | string | string[];
              };
          }
        // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
        | ioBroker.ObjectType
        | ((data: WidgetData, index: number) => Record<string, any>)
        | string;

    /** Used by counted fields */
    readonly index?: number;

    /** Name of the widget field */
    readonly name: string;
    /** Field label (i18n) */
    readonly label?: string;
    /** JS Function for conditional visibility */
    readonly hidden?: string | RxWidgetInfoFieldPredicate;
    /** Tooltip (i18n) */
    readonly tooltip?: string;
    /** JS Function for conditional disability */
    readonly disabled?: string | RxWidgetInfoFieldPredicate;
    /** JS Function for error */
    readonly error?: string | RxWidgetInfoFieldPredicate;
    /** Do not show binding symbol fot this field */
    readonly noBinding?: boolean;
    /** Callback called if the field value changed */
    readonly onChange?: RxWidgetInfoFieldChangeHandler;
};

export type RxWidgetInfoAttributesFieldInstance = {
    /** Field type */
    readonly type: 'instance';
    /** Field default value */
    readonly default?: string;
    /** Additionally, you can provide `adapter` to filter the instances of specific adapter. With special adapter name `_dataSources` you can get all adapters with flag `common.getHistory`. */
    readonly adapter?: string;
    /** Additionally, you can provide `adapters` to filter the instances of specific adapters. */
    readonly adapters?: string;
    /** In this case, only instance number (like `0`) is shown and not `history.0`. It can be set to true only with non-empty `adapter` setting. */
    readonly isShort?: boolean;

    /** Used by counted fields */
    readonly index?: number;

    /** Name of the widget field */
    readonly name: string;
    /** Field label (i18n) */
    readonly label?: string;
    /** JS Function for conditional visibility */
    readonly hidden?: string | RxWidgetInfoFieldPredicate;
    /** Tooltip (i18n) */
    readonly tooltip?: string;
    /** JS Function for conditional disability */
    readonly disabled?: string | RxWidgetInfoFieldPredicate;
    /** JS Function for error */
    readonly error?: string | RxWidgetInfoFieldPredicate;
    /** Do not show binding symbol fot this field */
    readonly noBinding?: boolean;
    /** Callback called if the field value changed */
    readonly onChange?: RxWidgetInfoFieldChangeHandler;
};

export type RxWidgetInfoAttributesFieldSelect = {
    /** Field type */
    readonly type: 'select' | 'nselect' | 'auto';
    /** Options for a select type */
    readonly options: { value: string | boolean | number; label: string }[] | string[];
    /** Field default value */
    readonly default?: string;
    /** Do not translate options */
    readonly noTranslation?: boolean;

    /** Used by counted fields */
    readonly index?: number;

    /** Name of the widget field */
    readonly name: string;
    /** Field label (i18n) */
    readonly label?: string;
    /** JS Function for conditional visibility */
    readonly hidden?: string | RxWidgetInfoFieldPredicate;
    /** Tooltip (i18n) */
    readonly tooltip?: string;
    /** JS Function for conditional disability */
    readonly disabled?: string | RxWidgetInfoFieldPredicate;
    /** JS Function for error */
    readonly error?: string | RxWidgetInfoFieldPredicate;
    /** Do not show binding symbol fot this field */
    readonly noBinding?: boolean;
    /** Callback called if the field value changed */
    readonly onChange?: RxWidgetInfoFieldChangeHandler;
};

export type RxWidgetInfoAttributesFieldCheckbox = {
    /** Field type */
    readonly type: 'checkbox';
    /** Field default value */
    readonly default?: boolean;
    /** If sizes should be deleted or set to specific value. `false` - delete sizes, or {width: 100, height: 100} */
    readonly desiredSize?: { width: number; height: number } | boolean;

    /** Used by counted fields */
    readonly index?: number;

    /** Name of the widget field */
    readonly name: string;
    /** Field label (i18n) */
    readonly label?: string;
    /** JS Function for conditional visibility */
    readonly hidden?: string | RxWidgetInfoFieldPredicate;
    /** Tooltip (i18n) */
    readonly tooltip?: string;
    /** JS Function for conditional disability */
    readonly disabled?: string | RxWidgetInfoFieldPredicate;
    /** JS Function for error */
    readonly error?: string | RxWidgetInfoFieldPredicate;
    /** Do not show binding symbol fot this field */
    readonly noBinding?: boolean;
    /** Callback called if the field value changed */
    readonly onChange?: RxWidgetInfoFieldChangeHandler;
};

export type RxWidgetInfoAttributesFieldNumber = {
    /** Field type */
    readonly type: 'number';
    /** Field default value */
    readonly default?: number;
    /** Number min value */
    readonly min?: number;
    /** Number max value */
    readonly max?: number;
    /** Number step */
    readonly step?: number;

    /** Used by counted fields */
    readonly index?: number;

    /** Name of the widget field */
    readonly name: string;
    /** Field label (i18n) */
    readonly label?: string;
    /** JS Function for conditional visibility */
    readonly hidden?: string | RxWidgetInfoFieldPredicate;
    /** Tooltip (i18n) */
    readonly tooltip?: string;
    /** JS Function for conditional disability */
    readonly disabled?: string | RxWidgetInfoFieldPredicate;
    /** JS Function for error */
    readonly error?: string | RxWidgetInfoFieldPredicate;
    /** Do not show binding symbol fot this field */
    readonly noBinding?: boolean;
    /** Callback called if the field value changed */
    readonly onChange?: RxWidgetInfoFieldChangeHandler;
    /** show clear button near the field */
    readonly clearButton?: boolean;
};

export type RxWidgetInfoAttributesFieldSlider = {
    /** Field type */
    readonly type: 'slider';
    /** Field default value */
    readonly default?: number;

    /** Used by counted fields */
    readonly index?: number;

    /** Slider min value */
    readonly min: number;
    /** Slider max value */
    readonly max: number;
    /** Slider max value */
    readonly step?: number;
    /** Slider marks?: array of possible marks. Like `[{value: 1, label: 'one'}, {value: 10}, {value: 100}] */
    readonly marks?: { value: number; label: string }[];
    /** Controls when the value label is displayed: `auto` the value label will display when the thumb is hovered or focused. `on` will display persistently. `off` will never display. */
    readonly valueLabelDisplay?: 'on' | 'off' | 'auto';

    /** Name of the widget field */
    readonly name: string;
    /** Field label (i18n) */
    readonly label?: string;
    /** JS Function for conditional visibility */
    readonly hidden?: string | RxWidgetInfoFieldPredicate;
    /** Tooltip (i18n) */
    readonly tooltip?: string;
    /** JS Function for conditional disability */
    readonly disabled?: string | RxWidgetInfoFieldPredicate;
    /** JS Function for error */
    readonly error?: string | RxWidgetInfoFieldPredicate;
    /** Do not show binding symbol fot this field */
    readonly noBinding?: boolean;
    /** Callback called if the field value changed */
    readonly onChange?: RxWidgetInfoFieldChangeHandler;
};

export type RxWidgetInfoAttributesFieldWidget = {
    /** Field type */
    readonly type: 'widget';
    /** Field default value */
    readonly default?: string;

    /** Used by counted fields */
    readonly index?: number;

    /** type of the widget, like `tplMaterial2Switches` */
    readonly tpl?: string;
    /** if true, all widgets of all views will be shown, not only from the current view. Default is false. */
    readonly all?: boolean;
    /**  if true, grouped widgets will be shown too. Default is false. */
    readonly withGroups?: boolean;
    /** if true, the current widget will be shown in the list too. */
    readonly withSelf?: boolean;
    /** if true, it will be checked if the widget is used somewhere else and user will be asked. */
    readonly checkUsage?: boolean;
    /** if true, only widgets will be shown, which are not used in some view. Default is false. */
    readonly hideUsed?: boolean;

    /** Name of the widget field */
    readonly name: string;
    /** Field label (i18n) */
    readonly label?: string;
    /** JS Function for conditional visibility */
    readonly hidden?: string | RxWidgetInfoFieldPredicate;
    /** Tooltip (i18n) */
    readonly tooltip?: string;
    /** JS Function for conditional disability */
    readonly disabled?: string | RxWidgetInfoFieldPredicate;
    /** JS Function for error */
    readonly error?: string | RxWidgetInfoFieldPredicate;
    /** Do not show binding symbol fot this field */
    readonly noBinding?: boolean;
    /** Callback called if the field value changed */
    readonly onChange?: RxWidgetInfoFieldChangeHandler;
};

export type RxWidgetInfoAttributesFieldSelectViews = {
    /** Field type */
    readonly type: 'select-views';
    /** Field default value */
    readonly default?: string;
    /** if false, only one view can be selected. Default is true. */
    readonly multiple?: boolean;

    /** Used by counted fields */
    readonly index?: number;

    /** Name of the widget field */
    readonly name: string;
    /** Field label (i18n) */
    readonly label?: string;
    /** JS Function for conditional visibility */
    readonly hidden?: string | RxWidgetInfoFieldPredicate;
    /** Tooltip (i18n) */
    readonly tooltip?: string;
    /** JS Function for conditional disability */
    readonly disabled?: string | RxWidgetInfoFieldPredicate;
    /** JS Function for error */
    readonly error?: string | RxWidgetInfoFieldPredicate;
    /** Do not show binding symbol fot this field */
    readonly noBinding?: boolean;
    /** Callback called if the field value changed */
    readonly onChange?: RxWidgetInfoFieldChangeHandler;
};

export type RxWidgetInfoAttributesFieldCustom = {
    /** Field type */
    readonly type: 'custom';
    /** Field type */
    readonly name?: string;

    /** Used by counted fields */
    readonly index?: number;

    /** Field default value */
    readonly default?: string | number | boolean;
    /** if false, only one view can be selected. Default is true. */
    readonly component: (
        field: RxWidgetInfoAttributesField,
        data: WidgetData,
        onDataChange: (newData: WidgetData) => void,
        props: RxWidgetInfoCustomComponentProperties,
    ) => React.JSX.Element | React.JSX.Element[];

    /** Field label (i18n) */
    readonly label?: string;
    /** JS Function for conditional visibility */
    readonly hidden?: string | RxWidgetInfoFieldPredicate;
    /** Tooltip (i18n) */
    readonly tooltip?: string;
    /** JS Function for conditional disability */
    readonly disabled?: string | RxWidgetInfoFieldPredicate;
    /** JS Function for error */
    readonly error?: string | RxWidgetInfoFieldPredicate;
    /** Do not show binding symbol fot this field */
    readonly noBinding?: boolean;
    /** Callback called if the field value changed */
    readonly onChange?: RxWidgetInfoFieldChangeHandler;
};

export type RxWidgetInfoAttributesFieldSimple = {
    /** Field type */
    readonly type:
        | 'image'
        | 'color'
        | 'password'
        | 'history'
        | 'hid'
        | 'icon'
        | 'dimension'
        | 'fontname'
        | 'groups'
        | 'class'
        | 'filters'
        | 'views'
        | 'style'
        | 'icon64'
        | 'url';
    /** Field default value */
    readonly default?: string;

    /** Used by counted fields */
    readonly index?: number;

    /** Name of the widget field */
    readonly name: string;
    /** Field label (i18n) */
    readonly label?: string;
    /** JS Function for conditional visibility */
    readonly hidden?: string | RxWidgetInfoFieldPredicate;
    /** Tooltip (i18n) */
    readonly tooltip?: string;
    /** JS Function for conditional disability */
    readonly disabled?: string | RxWidgetInfoFieldPredicate;
    /** JS Function for error */
    readonly error?: string | RxWidgetInfoFieldPredicate;
    /** Do not show binding symbol fot this field */
    readonly noBinding?: boolean;
    /** Callback called if the field value changed */
    readonly onChange?: RxWidgetInfoFieldChangeHandler;
};

export type RxWidgetInfoAttributesFieldDefault = {
    /** Field default value */
    readonly default?: string;

    /** Used by counted fields */
    readonly index?: number;

    /** Name of the widget field */
    readonly name: string;
    /** Field label (i18n) */
    readonly label?: string;
    /** JS Function for conditional visibility */
    readonly hidden?: string | RxWidgetInfoFieldPredicate;
    /** Tooltip (i18n) */
    readonly tooltip?: string;
    /** JS Function for conditional disability */
    readonly disabled?: string | RxWidgetInfoFieldPredicate;
    /** JS Function for error */
    readonly error?: string | RxWidgetInfoFieldPredicate;
    /** Do not show binding symbol fot this field */
    readonly noBinding?: boolean;
    /** Callback called if the field value changed */
    readonly onChange?: RxWidgetInfoFieldChangeHandler;
};

export type RxWidgetInfoAttributesField =
    | RxWidgetInfoAttributesFieldCheckbox
    | RxWidgetInfoAttributesFieldCustom
    | RxWidgetInfoAttributesFieldDefault
    | RxWidgetInfoAttributesFieldDelimiter
    | RxWidgetInfoAttributesFieldHTML
    | RxWidgetInfoAttributesFieldHelp
    | RxWidgetInfoAttributesFieldID
    | RxWidgetInfoAttributesFieldInstance
    | RxWidgetInfoAttributesFieldNumber
    | RxWidgetInfoAttributesFieldSelect
    | RxWidgetInfoAttributesFieldSelectViews
    | RxWidgetInfoAttributesFieldSimple
    | RxWidgetInfoAttributesFieldSlider
    | RxWidgetInfoAttributesFieldText
    | RxWidgetInfoAttributesFieldWidget;

export type RxWidgetInfoAttributesFieldWithType =
    | RxWidgetInfoAttributesFieldCheckbox
    | RxWidgetInfoAttributesFieldCustom
    | RxWidgetInfoAttributesFieldDelimiter
    | RxWidgetInfoAttributesFieldHTML
    | RxWidgetInfoAttributesFieldHelp
    | RxWidgetInfoAttributesFieldID
    | RxWidgetInfoAttributesFieldInstance
    | RxWidgetInfoAttributesFieldNumber
    | RxWidgetInfoAttributesFieldSelect
    | RxWidgetInfoAttributesFieldSimple
    | RxWidgetInfoAttributesFieldSelectViews
    | RxWidgetInfoAttributesFieldSlider
    | RxWidgetInfoAttributesFieldText
    | RxWidgetInfoAttributesFieldWidget;

export type Timer = ReturnType<typeof setTimeout>;

export interface Permissions {
    /** Accessible in Runtime */
    read: boolean;
    /** Accessible in Editor */
    write: boolean;
}

export interface UserPermissions {
    /** Which user has read or write access for the project */
    [user: string]: Permissions;
}

export interface ProjectSettings {
    /** Determines if the loading screen is dark or light */
    darkReloadScreen: boolean;
    /** Organization of views */
    folders: { id: string; name: string; parentId: string }[];
    /** Last state of opened views in the editor */
    openedViews: string[];
    /** If the vis runtime should be updated after the project was edited. `False` means no update. Default is true */
    reloadOnEdit: boolean;
    /** Do not send the command during this period and collect all changes for one object ID */
    statesDebounceTime: number;
    /** Project JavaScript scripts */
    scripts: null | string;
    /** Defines which users have read or write access to the project */
    permissions?: UserPermissions;
    marketplace?: MarketplaceWidgetRevision[];
    /** Last modification time */
    ts?: string;
    bodyOverflow?: 'auto' | 'scroll' | 'hidden' | 'visible';
    /** Browser tab title */
    title?: string;
    /** Favicon as base64 or URL */
    favicon?: string;
    /** Do not show error if the widget is not loaded */
    ignoreNotLoaded?: boolean;
}

export type SingleWidgetId = `w${string}`;
export type GroupWidgetId = `g${string}`;
export type AnyWidgetId = SingleWidgetId | GroupWidgetId;
/** Used for the attributes and variables, where the state ID stored */
export type StateID = string;

export interface WidgetData {
    /** Only exists if given by user in a tab general */
    name?: string;
    filterkey?: string;
    /** Group widget members */
    members?: AnyWidgetId[];
    bindings?: string[];
    [other: string]: any;
}

export interface WidgetStyle {
    bindings?: string[];
    position?: '' | 'absolute' | 'relative' | 'sticky' | 'static' | null;
    display?: '' | 'inline-block' | null;
    top?: string | number | null;
    left?: string | number | null;
    width?: string | number | null;
    right?: string | number | null;
    bottom?: string | number | null;
    /** if widget become relative, here is stored the original width, so when we toggle it to the absolute width again, it has some width  */
    absoluteWidth?: string | number | null;
    height?: string | number | null;
    'z-index'?: number | null;
    'overflow-x'?: '' | 'visible' | 'hidden' | 'scroll' | 'auto' | 'initial' | 'inherit' | null;
    'overflow-y'?: '' | 'visible' | 'hidden' | 'scroll' | 'auto' | 'initial' | 'inherit' | null;
    opacity?: number | null;
    cursor?:
        | 'alias'
        | 'all-scroll'
        | 'auto'
        | 'cell'
        | 'col-resize'
        | 'context-menu'
        | 'copy'
        | 'crosshair'
        | 'default'
        | 'e-resize'
        | 'ew-resize'
        | 'grab'
        | 'grabbing'
        | 'help'
        | 'move'
        | 'n-resize'
        | 'ne-resize'
        | 'nesw-resize'
        | 'ns-resize'
        | 'nw-resize'
        | 'nwse-resize'
        | 'no-drop'
        | 'none'
        | 'not-allowed'
        | 'pointer'
        | 'progress'
        | 'row-resize'
        | 's-resize'
        | 'se-resize'
        | 'sw-resize'
        | 'text'
        | 'vertical-text'
        | 'w-resize'
        | 'wait'
        | 'zoom-in'
        | 'zoom-out'
        | 'initial'
        | 'inherit'
        | null;
    transform?: string;

    color?: string;
    'text-align'?: '' | 'left' | 'right' | 'center' | 'justify' | 'initial' | 'inherit' | null;
    'text-shadow'?: string | null;
    'font-family'?: string | null;
    'font-style'?: '' | 'normal' | 'italic' | 'oblique' | 'initial' | 'inherit' | null;
    'font-variant'?: '' | 'normal' | 'small-caps' | 'initial' | 'inherit' | null;
    'font-weight'?: string;
    'font-size'?: string;
    'line-height'?: string;
    'letter-spacing'?: string;
    'word-spacing'?: string;

    background?: string;
    'background-color'?: string;
    'background-image'?: string;
    'background-repeat'?: '' | 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat' | 'initial' | 'inherit' | null;
    'background-position'?: string | null;
    'background-size'?: string | null;
    'background-clip'?: '' | 'border-box' | 'padding-box' | 'content-box' | 'initial' | 'inherit' | null;
    'background-origin'?: '' | 'padding-box' | 'border-box' | 'content-box' | 'initial' | 'inherit' | null;

    'border-width'?: string | null;
    'border-style'?:
        | ''
        | 'dotted'
        | 'dashed'
        | 'solid'
        | 'double'
        | 'groove'
        | 'ridge'
        | 'inset'
        | 'outset'
        | 'hidden'
        | null;
    'border-color'?: string | null;
    'border-radius'?: string | null;

    padding?: string | null;
    'padding-left'?: string | null;
    'padding-top'?: string | null;
    'padding-right'?: string | null;
    'padding-bottom'?: string | null;
    'box-shadow'?: string | null;
    'margin-left'?: string | null;
    'margin-top'?: string | null;
    'margin-right'?: string | null;
    'margin-bottom'?: string | null;

    /** relative property, if the widget must be shown on the new line */
    newLine?: boolean;
    /** grid layout: how many of the columns of its section the widget occupies (12 per section column), or all */
    gridColumns?: number | 'full' | null;
    /** grid layout: how many rows the widget occupies, or `auto` to take the height of its content */
    gridRows?: number | 'auto' | null;
    'box-sizing'?: 'content-box' | 'border-box' | 'initial' | 'inherit' | null;
    noPxToPercent?: boolean;
}

export interface SingleWidget {
    /** Internal wid */
    _id?: string;
    /** Widget type */
    tpl: string;
    data: WidgetData;
    style: WidgetStyle;
    /** @deprecated The widget set Use widgetSet */
    set?: string;
    /** @deprecated The widget set. Use widgetSet */
    wSet?: string;
    /** The widget set name. Groups have widget set null */
    widgetSet: string | null;
    /** The id of the group, if the widget is grouped */
    groupid?: GroupWidgetId;
    /** If the widget is grouped */
    grouped?: boolean;
    /** @deprecated it was typo */
    groupped?: boolean;
    /** Permissions for each user for the widget */
    permissions?: UserPermissions;
    /** This widget was taken from a marketplace */
    marketplace?: MarketplaceWidgetRevision;
    /** Indicator that this widget is used in another widget (e.g., in panel) */
    usedInWidget?: boolean;
    /** CSS for this widget */
    css?: string;
    /** JavaScript for this widget */
    js?: string;
    /** internal cached value */
    usedInView?: string;
    name?: string;
    isRoot?: boolean;
}

export interface GroupData extends WidgetData {
    /** Widget IDs of the members */
    members: AnyWidgetId[];
}

export interface GroupWidget extends SingleWidget {
    tpl: '_tplGroup';
    data: GroupData;
}

export type Widget = SingleWidget | GroupWidget;

export interface ViewSettings {
    /** Permissions for each user for the view */
    permissions?: UserPermissions;
    comment?: string;
    class?: string;
    filterkey?: string;
    group?: string[];
    theme?: string;
    group_action?: 'disabled' | 'hide' | null | '';

    useBackground?: boolean;
    'bg-image'?: string;
    'bg-position-x'?: string;
    'bg-position-y'?: string;
    'bg-width'?: string;
    'bg-height'?: string;
    'bg-color'?: string;
    style?: {
        display?: 'flex' | 'grid' | 'none' | null | '';
        background_class?: string;
        background?: string;
        'background-color'?: string;
        'background-image'?: string;
        'background-repeat'?: 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat' | 'initial' | 'inherit' | null | '';
        'background-attachment'?: 'scroll' | 'fixed' | 'local' | 'initial' | 'inherit' | null | '';
        'background-position'?:
            | 'left top'
            | 'left center'
            | 'left bottom'
            | 'right top'
            | 'right center'
            | 'right bottom'
            | 'center top'
            | 'center center'
            | 'center bottom'
            | 'initial'
            | 'inherit'
            | null
            | '';
        'background-size'?: 'auto' | 'cover' | 'contain' | 'initial' | 'inherit' | null | '';
        'background-clip'?: 'border-box' | 'padding-box' | 'content-box' | 'initial' | 'inherit' | null | '';
        'background-origin'?: 'padding-box' | 'border-box' | 'content-box' | 'initial' | 'inherit' | null | '';

        color?: string;
        'text-shadow'?: string;
        'font-family'?: string;
        'font-style'?: string;
        'font-variant'?: string;
        'font-weight'?: string;
        'font-size'?: string;
        'line-height'?: string;
        'letter-spacing'?: string;
        'word-spacing'?: string;
    };

    useAsDefault?: boolean;
    alwaysRender?: boolean;
    snapType?: 0 | 1 | 2 | null;
    snapColor?: string;
    gridSize?: number;
    sizex?: number;
    sizey?: number;
    resolution?: string;
    limitScreen?: boolean;
    limitForInstances?: string;
    limitScreenDesktop?: boolean;
    limitScreenBorderWidth?: number;
    limitScreenBorderColor?: string;
    limitScreenBorderStyle?: string;
    limitScreenBackgroundColor?: string;

    navigation?: boolean;
    /** The view shows the navigation menu, but has no entry of its own in it */
    navigationHideEntry?: boolean;
    navigationTitle?: string;
    navigationOrder?: number;
    navigationIcon?: string;
    navigationImage?: string;
    navigationOrientation?: 'horizontal' | 'vertical';
    navigationOnlyIcon?: boolean;
    navigationBackground?: string;
    navigationSelectedBackground?: string;
    navigationSelectedColor?: string;
    navigationHeaderTextColor?: string;
    navigationColor?: string;
    navigationWidth?: number;

    navigationChevronColor?: string;
    navigationHideMenu?: boolean;
    navigationHideOnSelection?: boolean;
    navigationHeaderText?: string;
    navigationNoHide?: boolean;
    navigationButtonBackground?: string;

    navigationBar?: boolean;
    navigationBarColor?: string;
    navigationBarText?: string;
    navigationBarIcon?: string;
    navigationBarImage?: string;

    columnWidth?: number;
    columnGap?: number;
    rowGap?: number | string;
    /** relative widget order */
    order?: AnyWidgetId[];

    /** How the relative widgets are arranged: in the sections of a grid, or - anything else - in columns */
    layout?: 'columns' | 'grid' | null;
    /** grid layout: the sections, in the order they are shown */
    sections?: ViewSection[];
    /** grid layout: the narrowest a section column may get, in px (default 320) */
    sectionMinWidth?: number;
    /** grid layout: the widest a section column may get, in px (default 500) */
    sectionMaxWidth?: number;
    /** grid layout: the space between the sections, in px (default 32) */
    sectionGap?: number;
    /** grid layout: the most section columns next to each other (default 4) */
    maxSections?: number;
    /** grid layout: let a later section fill a gap that an earlier, wider one left */
    denseSections?: boolean;
    /** grid layout: the height of one row inside a section, in px (default 56) */
    gridRowHeight?: number;
    /** grid layout: the space between the widgets inside a section, in px (default 8) */
    gridGap?: number;

    /** For material wizard */
    wizardId?: string;
}

/** A section of the grid layout of a view */
export interface ViewSection {
    /** Unique within the view */
    id: string;
    /** The widgets of the section, in the order they are shown */
    widgets: AnyWidgetId[];
    /**
     * The attributes that are edited as a binding, like `data.bindings` of a widget. Every attribute of a section
     * may hold a binding like `{javascript.0.temp}`; this only says which input the editor shows for it.
     */
    bindings?: string[];
    /** How many section columns the section occupies (default 1) */
    columnSpan?: number;
    /** The title in the header of the section; without title and icon the section has no header */
    title?: string;
    /** The icon in the header of the section, as an `icon64` value */
    icon?: string;
    /** `panel` gives the section the look of a card: the paper color of the theme, rounded corners and a shadow */
    variant?: 'plain' | 'panel' | null;
    /** Any CSS background; wins over the one of the `panel` */
    background?: string | null;
    /** in px; 0 or none is no border */
    borderWidth?: number | null;
    borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double' | null;
    borderColor?: string | null;
    /** in px; wins over the one of the `panel` */
    borderRadius?: number | null;
    /** the space between the border and the widgets, in px; wins over the one of the `panel` */
    padding?: number | null;

    // --- layout
    /** The section starts a new row, even if there is room next to the section before it */
    newRow?: boolean;
    /** in px */
    minHeight?: number | null;
    /** The section is as high as the highest section of its row, and not only as high as its widgets */
    stretch?: boolean;
    /** The height of a row of cells in px; overrides the one of the view */
    rowHeight?: number | null;
    /** The space between the widgets in px; overrides the one of the view */
    gridGap?: number | null;

    // --- header
    /** A second, smaller line below the title */
    subtitle?: string;
    titleColor?: string | null;
    /** in px */
    titleSize?: number | null;
    titleAlign?: 'left' | 'center' | 'right' | null;
    /** Colors an icon that is drawn in `currentColor` */
    iconColor?: string | null;
    /** A line below the header */
    divider?: boolean;
    /** The view the header opens when clicked (runtime only) */
    link?: string | null;

    // --- look
    /** Added to the classes of the section, so the section can be styled by the CSS of the project */
    className?: string;
    backgroundImage?: string | null;
    /** Any CSS box-shadow; wins over the one of the `panel` */
    boxShadow?: string | null;
    /** The text color of the section, which its widgets inherit */
    color?: string | null;
    /** Blurs what lies behind the section, in px - a glass look over a background image */
    glass?: number | null;

    // --- visibility (runtime; the editor only dims a hidden section)
    /** The section is shown only if this state fulfills `visibilityCond` with `visibilityVal` */
    visibilityOid?: string | null;
    visibilityCond?: VisStateCondition | null;
    visibilityVal?: string | number | boolean | null;
    /** The section is shown only to the members of these groups (the part of the id after `system.group.`) */
    visibilityGroups?: string[] | null;
    /** The section is shown only if the view is at least this wide, in px */
    visibilityMinWidth?: number | null;
    /** The section is shown only if the view is at most this wide, in px */
    visibilityMaxWidth?: number | null;

    // --- collapsing (runtime; the editor always shows a section open)
    /** The header opens and closes the section */
    collapsible?: boolean;
    /** The section starts closed */
    collapsed?: boolean;
    /** The section opens when this state fulfills `expandCond` with `expandVal`, and closes when it does not */
    expandOid?: string | null;
    expandCond?: VisStateCondition | null;
    expandVal?: string | number | boolean | null;
}

/** How a condition compares the value of a state, like the visibility of a widget */
export type VisStateCondition =
    | '=='
    | '!='
    | '<='
    | '>='
    | '<'
    | '>'
    | 'consist'
    | 'not consist'
    | 'exist'
    | 'not exist';

export interface View {
    activeWidgets: string[];
    filterList: string[];
    rerender: boolean;
    name?: string;
    /** parent folder */
    parentId?: string;
    settings: ViewSettings;
    /** Widgets on this view */
    widgets: {
        [groupId: GroupWidgetId]: GroupWidget;
        [widgetId: SingleWidgetId]: SingleWidget;
    };
    filterWidgets?: AnyWidgetId[];
    filterInvert?: boolean;
}

export interface Project {
    // @ts-expect-error this type has bad code-style, we should refactor the views in a views: Record<string, View> attribute
    ___settings: ProjectSettings;
    [view: string]: View;
}

export interface RxRenderWidgetProps {
    className: string;
    overlayClassNames: string[];
    style: React.CSSProperties;
    id: string;
    refService: React.RefObject<HTMLElement | null>;
    widget: Widget;
}

export interface ArgumentChanged {
    callback: any;
    arg: string;
    wid: string;
}

export interface Subscribing {
    activeViews: string[];
    byViews: Record<string, string[]>;
    active: string[];
    IDs: string[];
}

export interface VisRxWidgetStateValues {
    /** State value */
    [values: `${string}.val`]: any;
    /** State from */
    [from: `${string}.from`]: string;
    /** State timestamp */
    [timestamp: `${string}.ts`]: number;
    /** State last change */
    [timestamp: `${string}.lc`]: number;
    /** Whether the value was confirmed by the device; the engine fills it like the other fields */
    [ack: `${string}.ack`]: boolean;
    /** Quality code of the state */
    [quality: `${string}.q`]: number;
}

export interface VisCanWidgetStateValues extends VisRxWidgetStateValues {
    attr: (id: string | VisRxWidgetStateValues, val?: string | number | boolean) => any;
    removeAttr: (id: string) => void;
}

export interface LegacyVisConnection {
    namespace: string;
    logError: (errorText: string) => void;
    getIsConnected: () => boolean;
    getGroups: (
        groupName: string | ((result: any) => void) | boolean,
        useCache: boolean | ((result: any) => void),
        cb: (result: any) => void,
    ) => void;
    getConfig: (
        useCache: boolean,
        cb?: (error: string | null, systemConfig?: ioBroker.SystemConfigCommon) => void,
    ) => void;
    getObjects: (useCache?: boolean) => Promise<Record<string, ioBroker.Object>>;
    getLoggedUser: (cb: (isSecure: boolean, user: string) => void) => void;
    subscribe: (ids: string[], cb: () => void) => void;
    unsubscribe: (ids: string[], cb: () => void) => void;
    authenticate: (user: string, password: string, salt: string) => void;
    getStates: (ids: string, cb: (error: Error | null, states?: Record<string, ioBroker.State>) => void) => void;
    setState: (id: string, val: ioBroker.StateValue, cb: (error?: Error | null) => void) => void;
    sendTo: (instance: string, command: string, data: any, cb?: (result: Record<string, any>) => void) => void;
    setReloadTimeout: () => void;
    setReconnectInterval: (interval: number) => void;
    getUser: () => string;
    sendCommand: (instance: string, command: string, data: any, ack?: boolean) => Promise<void>;
    readFile: (
        filename: string,
        cb: (error: Error | null, data?: string | Buffer, filename?: string, mimeType?: string) => void,
    ) => Promise<void>;
    getHistory: (
        id: string,
        options: ioBroker.GetHistoryOptions & { timeout: number },
        cb: (error: Error | null, result?: ioBroker.GetHistoryResult) => void,
    ) => void;
    getHttp: (url: string, callback: (data: any) => void) => boolean;
    _socket: {
        emit: (cmd: string, data: any, cb: (arg1: any, arg2?: any) => void) => void;
    };
}

export interface VisLegacy {
    instance: string;
    navChangeCallbacks: { id: string; cb: (view: string) => void }[];
    findNearestResolution: (width?: number, height?: number) => string;
    version: number;
    states: VisCanWidgetStateValues;
    objects: Record<string, ioBroker.Object>;
    isTouch: boolean;
    activeWidgets: AnyWidgetId[];
    editMode: boolean;
    binds: {
        basic: any;
        table: any;
        jqplot: any;
        jqueryui: any;
        swipe: any;
        [visWidgetSet: string]: any;
    };
    views: Project;
    activeView: string;
    language: ioBroker.Languages;
    user: string;
    projectPrefix: string;
    _: (word: string) => string;
    dateFormat: string;
    loginRequired: false;
    viewsActiveFilter: Record<string, string[]>;
    onChangeCallbacks: ArgumentChanged[];
    subscribing: Subscribing;
    conn: LegacyVisConnection;
    lastChangedView: string | null; // used in vis-2 to save last sent view name over vis-2.0.command
    updateContainers: () => void;
    renderView: (
        viewDiv: string,
        view: string | boolean,
        hidden?: boolean | ((viewDiv: string, view: string) => void),
        cb?: (viewDiv: string, view: string) => void,
    ) => void;
    updateFilter: (view?: string) => string[];
    destroyUnusedViews: () => void;
    changeFilter: (
        view: string,
        filter: string,
        showEffect?: string,
        showDuration?: number,
        hideEffect?: string,
        hideDuration?: number,
    ) => void;
    setValue: (id: string, val: any) => void;
    changeView: (
        viewDiv: string,
        view?: string,
        hideOptions?: any,
        showOptions?: any,
        sync?: boolean,
        cb?: (viewDiv: string, view: string) => void,
    ) => void;
    getCurrentPath: () => string | { view: string; path: string[] };
    navigateInView: (path: string | string[]) => void;
    onWakeUp: (callback: null | (() => void | string), wid?: string) => void;
    inspectWidgets: (viewDiv: string, view: string, addWidget, delWidget, onlyUpdate: boolean) => void;
    showMessage: (
        message: string,
        title: string,
        icon: string,
        width: number,
        callback: (isYes: boolean) => void,
    ) => void;
    showWidgetHelper: (viewDiv: string, view: string, wid: string, isShow: boolean) => void;
    addFont: (fontName: string) => void;
    registerOnChange: (
        callback: (itemArg: any, wid: string, val: ioBroker.StateValue, ack: boolean, ts: number) => void,
        itemArg: any,
        wid: AnyWidgetId,
    ) => void;
    unregisterOnChange: (
        callback: (itemArg: any, wid: string, val: ioBroker.StateValue, ack: boolean, ts: number) => void,
        arg: itemArg,
        wid: AnyWidgetId,
    ) => void;
    generateInstance: () => string;
    findByRoles: (stateId: string, roles: string[]) => Record<string, string>;
    findByName: (stateId: string, objName: string) => string | false;
    hideShowAttr: (widAttr: string) => void;
    bindingsCache: Record<string, VisBinding[]>;
    extractBinding: (format: string, doNotIgnoreEditMode?: boolean) => VisBinding[] | null;
    formatBinding: (
        format: string,
        view: string,
        wid: AnyWidgetId,
        widget: Widget,
        widgetData: WidgetData,
        values: VisRxWidgetStateValues,
    ) => string;
    getViewOfWidget: (wid: AnyWidgetId) => string | null;
    confirmMessage: (message: string, title: string, icon: string, width: number, callback: () => boolean) => void;
    // @deprecated
    config: object; // storage of dialog positions and size (Deprecated)
    showCode: (code: string, title: string, mode?: 'html' | 'json' | 'css') => void;
    findCommonAttributes: (/* view, widgets */) => void;
    bindWidgetClick: () => void;
    preloadImages: (sources: string[]) => void;
    updateStates: (data: Record<string, ioBroker.State>) => void;
    getHistory: (id: string, options: any, callback: (arg1: any, arg2?: any) => void) => void;
    getHttp: (url: string, callback: (data?: any) => string) => void;
    formatDate: (dateObj: Date | string | number, isDuration?: boolean, _format?: string) => string;
    widgets: any;
    editSelect:
        | null
        | ((
              widAttr: string,
              values: any,
              notTranslate: boolean,
              init: () => void,
              onchange: () => void,
          ) =>
              | string
              | {
                    input: string;
                    init?: () => void;
                    onchange?: () => void;
                }
              | null);
    isWidgetHidden: (
        view: string,
        widget: AnyWidgetId,
        visibilityOidValue: null | number | string | undefined | boolean,
        widgetData: any,
    ) => boolean;
    getUserGroups: () => Record<string, ioBroker.GroupObject>;
    detectBounce: (el: any, isUp?: boolean) => boolean;
    isFloatComma?: boolean;
    subscribe: (IDs: string[], cb: () => void) => void;
    unsubscribe: (IDs: string[], cb: () => void) => void;
}
export interface IconSetDescription {
    // Name of icons
    name?: ioBroker.StringOrTranslated;
    icon?: string; // base64 svg or png
    // Path to file
    url: string;
}
export interface AdditionalIconSet {
    // customIcons, 'baseline', 'outline', 'round', 'sharp', 'twotone', 'knx-uf', 'upload' are reserved
    [iconSet: string]: IconSetDescription;
}
export interface MaterialIconSelectorProps {
    onClose: (icon: string | null) => void; // close dialog
    value?: string; // current icon
    filter?: string; // filter for icon list
    iconType?: string; // icon type (baseline, outlined
    customIcons?: string; // path to additional icons file
    customColor?: string; // additional icons color
    themeType: ThemeType;
    theme: VisTheme;
    additionalSets: AdditionalIconSet;
}

export interface MarketplaceWidgetRevision {
    id: string;
    widget: (GroupWidget | SingleWidget)[];
    date: string;
    widget_id: string;
    description: string;
    whatsnew: string;
    widgetsets: string[];
    version: number;
    rating: any;
    install_count: number;
    name: string;
    is_last: 0 | 1;
    widgets: string[];
    image_id: string;
    delete_status: 0 | 1;
    verified: null;
    revision_id: string;
    categories: string[];
}

export interface Marketplace {
    api: {
        apiGetWidget(widgetId: string): Promise<MarketplaceWidgetRevision>;
        apiGetWidgetRevision(widgetId: string, id: string): Promise<MarketplaceWidgetRevision>;
    };
    default: React.Component<VisMarketplaceProps>;
}

export interface ClassesValue {
    name: string;
    file: string;
    attrs?: React.CSSProperties;
    parentStyle?: React.CSSProperties;
    parentClass?: string;
}

declare global {
    interface Window {
        vis: VisLegacy;
        systemDictionary?: Record<string, Record<ioBroker.Languages, string>>;
        systemLang?: ioBroker.Languages;
        addWords: (words: Record<string, Record<ioBroker.Languages, string>>) => void;
        VisMarketplace?: Marketplace;
        translateWord: (text: string, lang?: string, dictionary?: Record<string, Record<string, string>>) => string;

        [promiseName: PromiseName]: Promise<any>;

        [widgetSetName: WidgetSetName]: {
            __initialized: boolean;
            get: (module: string) => () => void;
            init?: (shareScope: any) => Promise<void>;
        };

        visSets: Record<
            string,
            {
                color?: string;
            }
        >;

        visWidgetTypes: WidgetType[];

        __widgetsLoadIndicator: (process: number, max: number) => void;
        _lastAppliedStyle: string;
        /** Marketplace API server */
        apiUrl: string;
        /** Prefix for the marketplace client */
        webPrefix: string;
        /** Marketplace GUI location to load as a component */
        marketplaceClient: string;
        collectClassesValue: Record<string, ClassesValue>;
        _: (word: string, ...args: (string | number | boolean)[]) => string;
        jQuery: JQuery;

        VisMaterialIconSelector: React.ComponentType<MaterialIconSelectorProps>;
    }
}

export type ResizeHandler = 'n' | 'e' | 's' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

export interface BaseWidgetState extends React.ComponentState {
    width: number;
    height: number;
    defaultView: string;
    draggable: boolean;
    data: Record<string, string | number | boolean>;
    style: Record<string, string | number>;
    applyBindings: boolean;
    editMode: boolean;
    multiViewWidget: boolean;
    selected: boolean;
    selectedOne: boolean;
    resizable: boolean;
    resizeHandles: ResizeHandler[];
    widgetHint: string;
    isHidden: boolean;
    gap: number;
}

export interface RxWidgetState extends BaseWidgetState {
    rxData: Record<string, string | number | boolean>;
    rxStyle: Record<string, string | number>;
    values: Record<string, string | number | boolean | null>;
    visible: boolean;
    disabled: boolean;
}

export interface CanWidgetStore {
    style: CanObservable<WidgetStyle>;
    data: CanObservable<WidgetData>;
    wid: string;
}

export type VisBindingOperationType =
    | 'eval'
    | '*'
    | '+'
    | '-'
    | '/'
    | '%'
    | 'min'
    | 'max'
    | 'date'
    | 'momentDate'
    | 'value'
    | 'array'
    | 'pow'
    | 'round'
    | 'random'
    | 'json'
    | 'sqrt'
    | 'hex'
    | 'HEX'
    | 'HEX2'
    | 'hex2'
    | 'floor'
    | 'ceil'
    | '';

export interface VisBindingOperationArgument {
    name: string;
    /** ioBroker state ID plus '.val', '.ts', '.ack' or '.lc' */
    visOid: StateID;
    /** ioBroker state ID */
    systemOid: StateID;
}

export interface VisBindingOperation {
    op: VisBindingOperationType;
    arg?: VisBindingOperationArgument[] | string | number | string[];
    formula?: string;
}

export interface VisBinding {
    /** ioBroker state ID plus '.val', '.ts', '.ack' or '.lc' */
    visOid: StateID;
    /** ioBroker state ID */
    systemOid: StateID;
    /** Part of the string, like {id.ack} */
    token: string;
    operations?: VisBindingOperation[];
    format: string;
    isSeconds: boolean;
}

export interface VisLinkContextBinding extends VisBinding {
    type: 'style' | 'data';
    attr: string;
    view: string;
    widget: AnyWidgetId;
}

export interface VisLinkContextItem {
    view: string;
    widget: AnyWidgetId;
}

export interface VisLinkContextSignalItem extends VisLinkContextItem {
    index: number;
}

export interface VisStateUsage {
    /** list of widgets, that depends on this state */
    visibility: Record<string, VisLinkContextItem[]>;
    signals: Record<string, VisLinkContextSignalItem[]>;
    lastChanges: Record<string, VisLinkContextItem[]>;
    /** list of widgets, that depends on this state */
    bindings: Record<StateID, VisLinkContextBinding[]>;
    IDs: StateID[];
    byViews?: Record<string, string[]>;
    widgetAttrInfo?: Record<string, RxWidgetInfoAttributesField>;
}

export type VisChangeHandlerCallback = (
    type: 'style' | 'signal' | 'visibility' | 'lastChange' | 'binding',
    item: VisLinkContextBinding | VisLinkContextItem,
    stateId: string,
    state: ioBroker.State,
) => void;

export interface VisLinkContext extends VisStateUsage {
    unregisterChangeHandler: (wid: AnyWidgetId, cb: VisChangeHandlerCallback) => void;
    registerChangeHandler: (wid: AnyWidgetId, cb: VisChangeHandlerCallback) => void;
    subscribe: (stateId: string | string[]) => void;
    unsubscribe: (stateId: string | string[]) => void;
    getViewRef: (view: string) => React.RefObject<HTMLDivElement | null> | null;
    registerViewRef: (
        view: string,
        ref: React.RefObject<HTMLDivElement | null>,
        onCommand: (command: ViewCommand, options?: ViewCommandOptions) => any,
    ) => void;
    unregisterViewRef: (view: string, ref: React.RefObject<HTMLDivElement | null>) => void;
}

export interface VisFormatUtils {
    formatValue(value: number | string, decimals?: number | string, _format?: string): string;
    extractBinding(format: string): VisBinding[] | null;
    formatBinding(options: {
        format: string;
        view: string;
        wid: AnyWidgetId;
        widget: SingleWidget | GroupWidget;
        widgetData: WidgetData;
        values?: VisRxWidgetStateValues;
        moment: any;
    }): string;
    formatDate(dateObj: string | Date | number, isDuration?: boolean | string, _format?: string): string;
}

export interface ExTypeText extends TypeText {
    danger: { color: string };
    success: { color: string };
}

export interface ExtendedMuiPalette {
    common: CommonColors;
    mode: PaletteMode;
    contrastThreshold: number;
    tonalOffset: PaletteTonalOffset;
    primary: PaletteColor;
    secondary: PaletteColor;
    error: PaletteColor;
    warning: PaletteColor;
    info: PaletteColor;
    success: PaletteColor;
    grey: Color;
    text: ExTypeText;
    divider: TypeDivider;
    action: TypeAction;
    background: TypeBackground;
    getContrastText: (background: string) => string;
    augmentColor: (options: PaletteAugmentColorOptions) => PaletteColor;
}

export interface ExtendedPalette extends ExtendedMuiPalette {
    mode: ThemeType;
    expert: string;
    grey: {
        main: string;
        dark: string;
        50: string;
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
        A100: string;
        A200: string;
        A400: string;
        A700: string;
    };
}

export interface VisTheme extends IobTheme {
    palette: ExtendedPalette;
    classes: {
        blockHeader: React.CSSProperties;
        viewTabs: React.CSSProperties;
        viewTab: React.CSSProperties;
        lightedPanel: React.CSSProperties;
        toolbar: React.CSSProperties;
        viewManageBlock: React.CSSProperties;
        viewManageButtonActions: React.CSSProperties;
    };
}

export type CanObservable<T> = T & {
    attr: (
        id: VisRxWidgetStateValues | string,
        val?: string | number | boolean,
    ) => string | number | boolean | undefined | null;
    removeAttr: (id: string) => void;
};

export interface VisContext {
    $$: any;
    VisView: VisView;
    activeView: string;
    adapterName: string;
    additionalSets: AdditionalIconSet;
    allWidgets: Record<string, CanWidgetStore>;
    askAboutInclude?: (
        wid: AnyWidgetId,
        toWid: AnyWidgetId,
        cb: (_wid: AnyWidgetId, _toWid: AnyWidgetId) => void,
    ) => void;
    buildLegacyStructures: () => void;
    can: {
        // https://v2.canjs.com/docs/can.Map.html
        Map: any;
        // https://v2.canjs.com/docs/can.view.html
        // Loads a template, renders it with data and helper functions and returns the HTML of the template
        view: (
            templateName: string,
            data: {
                data: CanWidgetStore['data'];
                viewDiv: string;
                view: string;
                style: WidgetStyle;
                val?: string | number | boolean;
            },
        ) => HTMLElement;
    };
    canStates: CanObservable<VisRxWidgetStateValues>;
    changeProject: (project: Project, ignoreHistory?: boolean) => Promise<void>;
    changeView: (view: string, subView?: string) => void;
    dateFormat: string;
    disableInteraction: boolean;
    editModeComponentStyle: React.CSSProperties;
    formatUtils: VisFormatUtils;
    instance: number; // vis instance number (not browser instance)
    jQuery: JQuery;
    lang: ioBroker.Languages;
    linkContext: VisLinkContext;
    lockDragging: boolean;
    moment: typeof moment;
    onCommand: (view: string, command: ViewCommand, options?: ViewCommandOptions) => any;
    onWidgetsChanged:
        | null
        | ((
              changedData:
                  | {
                        wid: AnyWidgetId;
                        view: string;
                        style?: WidgetStyle;
                        data?: WidgetData;
                    }[]
                  | null,
              view?: string,
              viewSettings?: ViewSettings,
          ) => void | null);
    onIgnoreMouseEvents: null | ((ignore: boolean) => void);
    projectName: string;
    registerEditorCallback:
        | null
        | ((
              name: 'onStealStyle' | 'onPxToPercent' | 'pxToPercent' | 'onPercentToPx' | 'gridDropTarget',
              view: string,
              cb?: (...args: any) => any,
          ) => void);
    runtime: boolean;
    setSelectedGroup: null | ((groupId: GroupWidgetId) => void);
    /** Select a section of the grid layout, to edit it in the attributes; only the editor passes it */
    setSelectedSection?: null | ((sectionId: string | null) => void);
    setSelectedWidgets: null | ((widgets: AnyWidgetId[], view?: string, cb?: () => void) => void);
    setTimeInterval: (timeInterval: string) => void;
    setTimeStart: (timeStart: string) => void;
    setValue: (id: string, value: string | boolean | number | null) => void;
    showWidgetNames: boolean;
    socket: Connection;
    systemConfig: ioBroker.SystemConfigObject;
    theme: VisTheme;
    themeName: string;
    themeType: ThemeType;
    timeInterval: string;
    timeStart: string;
    toggleTheme: (newThemeName?: ThemeName) => void;
    user: string;
    userGroups: Record<string, ioBroker.Object>;
    views: Project; // project
    widgetHint: 'light' | 'dark' | 'hide';
    container?: boolean;
}

export interface VisViewProps {
    context: VisContext;
    view: string;
    activeView: string;
    editMode: boolean;
    selectedWidgets?: AnyWidgetId[];
    selectedGroup?: GroupWidgetId;
    /** The section of the grid layout that is edited in the attributes, by its id */
    selectedSection?: string | null;
    viewsActiveFilter: Record<string, string[]>;
    customSettings?: Record<string, any>;
    onIgnoreMouseEvents?: (ignore: boolean) => void;
    style?: React.CSSProperties;
    visInWidget?: boolean;
    theme: VisTheme;
}

export interface RxWidgetProps extends RxRenderWidgetProps {
    id: string;
    context: VisContext;
    view: string;
    editMode: boolean;
    isRelative: boolean;
    // refParent: React.RefObject<any>,
    // askView: (command: string, props?: any) => any,
    selectedWidgets: string[];
    viewsActiveFilter: Record<string, string[]>;
}

export interface ObjectForDetector {
    _id: string;
    common: ioBroker.StateCommon | ioBroker.EnumCommon;
    name?: ioBroker.StringOrTranslated;
    type: ioBroker.ObjectType;
}

export interface DetectorDevice {
    _id: string;
    common: ioBroker.StateCommon;
    type: ioBroker.ObjectType;
    deviceType: Types;
    states: ObjectForDetector[];
    name?: ioBroker.StringOrTranslated;
    roomName?: ioBroker.StringOrTranslated;
}

export interface DetectorResult {
    _id: string;
    common: ioBroker.StateCommon;
    devices: DetectorDevice[];
}

export interface CustomPaletteProperties {
    socket: Connection;
    project: Project;
    changeProject: (project: Project, ignoreHistory?: boolean) => Promise<void>;
    selectedView: string;
    changeView: (newView: string) => void;
    themeType: 'dark' | 'light';
    helpers: {
        deviceIcons: Record<string, React.JSX.Element>;
        detectDevices: (socket: Connection) => Promise<DetectorResult[]>;
        getObjectIcon: (obj: ioBroker.Object, id?: string, imagePrefix?: string) => string | undefined;
        allObjects: (socket: Connection) => Promise<Record<string, ioBroker.Object>>;
        getNewWidgetId: (project: Project, offset?: number) => SingleWidgetId;
        /** @deprecated use "getNewWidgetId" instead, it will give you the full wid like "w000001" */
        getNewWidgetIdNumber: (isWidgetGroup: boolean, project: Project, offset?: number) => number;
    };
}

export interface RxWidgetInfoGroup {
    /** Name of the attributes section */
    readonly name: string;
    /** Fields of this attribute section */
    fields: readonly RxWidgetInfoAttributesField[];
    /** I18n Label */
    readonly label?: string;
    readonly indexFrom?: number;
    readonly indexTo?: string;
    readonly hidden?: string | RxWidgetInfoFieldPredicate;
}

/** The size of a widget type in the grid layout, see `RxWidgetInfo.visDefaultGrid` */
export interface RxWidgetInfoGrid {
    /** Columns of a section - it has 12 per section column it occupies - or `full` for its whole width */
    readonly columns?: number | 'full';
    /** Rows of a section, or `auto` to take the height of the content */
    readonly rows?: number | 'auto';
    readonly minColumns?: number;
    readonly maxColumns?: number;
    readonly minRows?: number;
    readonly maxRows?: number;
}

export interface RxWidgetInfo {
    /** Unique ID of the widget. Starts with 'tpl...' */
    readonly id: string;

    /** Name of a widget set */
    readonly visSet: string;
    /** Label of widget set for GUI (normally it exists a translation in i18n for it) */
    readonly visSetLabel?: string;
    /** Icon of a widget set */
    readonly visSetIcon?: string;
    /** Color of a widget set */
    readonly visSetColor?: string;

    /** Name of widget */
    readonly visName: string;
    /** Label of widget for GUI (normally it exists a translation in i18n for it) */
    readonly visWidgetLabel?: string;
    /** Preview link (image URL, like 'widgets/basic/img/Prev_RedNumber.png') */
    readonly visPrev: string;
    /**
     * What the widget does, shown in the tooltip of the palette under the preview. Normally a translation key,
     * like `visWidgetLabel`. The counterpart of `data-vis-help` of a vis-1 widget.
     */
    readonly visHelp?: string;
    /** Color of widget in palette. If not set, the visSetColor will be taken */
    readonly visWidgetColor?: string;

    /** Groups of attributes */
    visAttrs: readonly RxWidgetInfoGroup[];
    /** Default style for widget */
    readonly visDefaultStyle?: WidgetStyle;
    /**
     * How many cells of the grid layout a widget of this type occupies when it is put into a section, and within
     * which limits it may be resized there. What is missing is derived from the width and height of
     * `visDefaultStyle`.
     */
    readonly visDefaultGrid?: RxWidgetInfoGrid;
    /** Position in the widget set */
    readonly visOrder?: number;
    /** required, that width is always equal to height (quadratic widget) */
    readonly visResizeLocked?: boolean;
    /** if false, if widget is not resizable */
    readonly visResizable?: boolean;
    /** @deprecated use visResizable */
    readonly resizable?: boolean;
    /** if false, if widget is not draggable  */
    readonly visDraggable?: boolean;
    /** Show specific handlers  */
    readonly visResizeHandles?: ResizeHandler[];
    /** @deprecated use visResizeHandles */
    readonly resizeHandles?: ResizeHandler[];

    /** Function to generate custom palette element */
    readonly customPalette?: (context: CustomPaletteProperties) => React.JSX.Element;
}

export interface CustomWidgetProperties {
    context: {
        socket: Connection;
        projectName: string;
        instance: number;
        adapterName: string;
        views: Project;
    };
    selectedView: string;
    selectedWidgets: AnyWidgetId[];
    selectedWidget: AnyWidgetId;
}

export type Writeable<T> = { -readonly [P in keyof T]: Writeable<T[P]> };

export type RxWidgetInfoWriteable = Writeable<RxWidgetInfo>;

export type AttributeTypeToDataType<TType extends RxWidgetAttributeType> = TType extends 'checkbox'
    ? boolean
    : TType extends 'number' | 'slider'
      ? number
      : string;

/** Infer the RxData from VisAttrs */
export type GetRxDataFromVisAttrs<T extends Record<string, any>> = {
    [K in T['visAttrs'][number]['fields'][number] as K['name']]: AttributeTypeToDataType<K['type']>;
};

/** Infers the RxData from a given Widget */
export type GetRxDataFromWidget<T extends { getWidgetInfo: () => Record<string, any> }> = GetRxDataFromVisAttrs<
    ReturnType<T['getWidgetInfo']>
>;

/** Branded type functionality */
declare const __brand: unique symbol;
type Brand<B> = { [__brand]: B };
export type Branded<T, B> = T & Brand<B>;

export { type VisRxWidget, type VisRxWidgetState, type VisRxWidgetProps, type VisRxData } from './visRxWidget';
export {
    type WidgetDataState,
    type GroupDataState,
    type WidgetStyleState,
    type VisBaseWidgetState,
} from './visBaseWidget';
import VisBaseWidget from './visBaseWidget';
export { VisBaseWidget };

declare global {
    interface Window {
        visRxWidget: typeof VisRxWidget;
    }
}
