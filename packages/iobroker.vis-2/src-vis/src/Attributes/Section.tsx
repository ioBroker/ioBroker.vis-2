import React, { useEffect, useState } from 'react';

import { Accordion, AccordionDetails, AccordionSummary, Box } from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    FormatPaint as FormatPaintIcon,
    Info as InfoIcon,
    Link as LinkIcon,
    LinkOff as LinkOffIcon,
    Title as TitleIcon,
    UnfoldMore as UnfoldMoreIcon,
    ViewQuilt as ViewQuiltIcon,
    Visibility as VisibilityIcon,
} from '@mui/icons-material';

import { Utils, I18n, type Connection, type ThemeType } from '@iobroker/gui-components';

import { store } from '@/Store';
import { deepClone } from '@/Utilities/utils';
import commonStyles from '@/Utilities/styles';
import { getGridLayout } from '@/Vis/visGridLayout';
import { conditionNeedsValue } from '@/Vis/visConditions';
import type {
    AdditionalIconSet,
    Project,
    ViewSection,
    ViewSettings,
    VisStateCondition,
    VisTheme,
} from '@iobroker/types-vis-2';

import type { Field } from './View/Items';
import getEditField from './View/EditField';
import FieldHelp, { hasFieldHelp } from './FieldHelp';
import BindingField from './BindingField';
import { ConditionSelect, ConditionValueField, StateIdField } from './StateCondition';

/**
 * The attributes of a section of the grid layout: its header, its look, its layout, when it is shown and whether it
 * opens and closes.
 *
 * It shows the section of the selected widget, or the one selected by a click on it in the view where no widget is -
 * also one without widgets. The fields are the ones of the view attributes, see View/EditField.tsx: they read and
 * write `project[view].settings`, so they are handed a project in which the section stands in for the settings of
 * the view, and every change is put back into the section.
 */

interface SectionAttributesProps {
    selectedView: string;
    selectedWidgets: string[];
    /** The id of the section selected by a click on it, see Editor.setSelectedSection() */
    selectedSection: string | null;
    editMode: boolean;
    changeProject: (project: Project) => void | Promise<void>;
    userGroups: Record<string, ioBroker.GroupObject>;
    adapterName: string;
    themeType: ThemeType;
    theme: VisTheme;
    instance: number;
    projectName: string;
    socket: Connection;
    additionalSets: AdditionalIconSet;
    // the buttons "expand all" and "collapse all" above the tabs, see Attributes/index.tsx
    triggerAllOpened: number;
    triggerAllClosed: number;
    setIsAllOpened: (opened: boolean) => void;
    setIsAllClosed: (closed: boolean) => void;
}

/**
 * The mark in front of the name of a group, so that a group is found by its shape and not by reading every
 * label - the same idea as in the attributes of a view and of a widget.
 */
const GROUP_ICONS: Record<string, React.JSX.Element> = {
    header: <TitleIcon fontSize="small" />,
    appearance: <FormatPaintIcon fontSize="small" />,
    layout: <ViewQuiltIcon fontSize="small" />,
    visibility: <VisibilityIcon fontSize="small" />,
    collapsing: <UnfoldMoreIcon fontSize="small" />,
};

// the groups look exactly like the ones of a view and of a widget, see Attributes/View.tsx
const styles: Record<string, any> = {
    groupTitle: {
        padding: '6px 8px 2px',
        fontSize: '80%',
        fontWeight: 'bold',
        opacity: 0.7,
    },
    groupSurface: (theme: VisTheme): React.CSSProperties => ({
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
    }),
    accordionRoot: {
        // Surfaces instead of lines: the group header carries its own background, so the border MUI
        // draws above and below every accordion is only noise. A 2px gap lets the darker panel show
        // through between the groups - that sliver is the separator, not a drawn line.
        border: 'none',
        p: 0,
        // after `m: 0`, otherwise the shorthand wipes it again
        m: 0,
        marginBottom: '2px',
        minHeight: 0,
        '&:before': {
            opacity: 0,
        },
    },
    accordionOpenedSummary: {
        fontWeight: 'bold',
    },
    accordionDetails: (theme: VisTheme) => ({
        ...theme.classes.lightedPanel,
        borderRadius: '0 0 4px 4px',
        flexDirection: 'column',
        p: 0,
        m: 0,
    }),
    groupSummary: {
        p: '2px',
        pl: '8px',
        minHeight: 0,
    },
    groupSummaryExpanded: {
        p: '2px',
        pl: '8px',
        minHeight: 0,
    },
    fieldTitle: {
        width: 140,
        fontSize: '80%',
    },
    fieldTitleContent: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    fieldHelpIcon: {
        fontSize: 16,
        flexShrink: 0,
        opacity: 0.6,
    },
    fieldIcons: {
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
    },
    bindIconSpan: {
        display: 'flex',
        alignItems: 'center',
        marginLeft: 3,
        cursor: 'pointer',
    },
    bindIcon: {
        width: 16,
        height: 16,
        opacity: 0.6,
    },
    hint: {
        padding: 16,
        fontSize: '90%',
        opacity: 0.7,
    },
};

/** The groups of fields, by their key; the header and the look are open at first */
const GROUPS = ['header', 'appearance', 'layout', 'visibility', 'collapsing'] as const;
type GroupKey = (typeof GROUPS)[number];
const OPENED_STORAGE_KEY = 'Attributes.sectionGroups';

interface SectionGroup {
    key: GroupKey;
    label: string;
    fields: Field[];
}

interface GroupsContext {
    section: ViewSection;
    view: string;
    project: Project;
    socket: Connection;
    theme: VisTheme;
    editMode: boolean;
    /** Writes these attributes of the section at once; null or '' removes one */
    change: (values: Record<string, unknown>) => void;
}

/**
 * The three inputs of a condition on a state as fields of the table: the ID, how it is compared, and the value
 * in the input that fits the state
 *
 * @param context - the section and how to change it
 * @param attrs - the attributes of the section that hold the condition
 * @param attrs.oid - the attribute with the ID of the state
 * @param attrs.cond - the attribute with the condition
 * @param attrs.val - the attribute with the value to compare with
 * @param hidden - hides all three, as `hidden` of a field does
 * @param oidHelp - the picture and the explanation of the ID
 * @param oidHelp.image - the picture
 * @param oidHelp.title - the explanation
 */
function conditionFields(
    context: GroupsContext,
    attrs: { oid: keyof ViewSection; cond: keyof ViewSection; val: keyof ViewSection },
    hidden: string | undefined,
    oidHelp: { image: string; title: string },
): Field[] {
    const { section, socket, theme, editMode, change } = context;
    const oid = section[attrs.oid] as string | null | undefined;
    const cond = section[attrs.cond] as VisStateCondition | null | undefined;
    const noOid = `!data.${attrs.oid}`;
    return [
        {
            type: 'raw',
            // a section has no style: its attributes are all read from the section itself
            notStyle: true,
            label: 'Object ID',
            attr: attrs.oid,
            helpImage: oidHelp.image,
            title: oidHelp.title,
            hidden,
            Component: (
                <StateIdField
                    value={oid}
                    socket={socket}
                    theme={theme}
                    disabled={!editMode}
                    // a state picked anew has other values: its condition and value start over
                    onChange={(newOid, picked) =>
                        change(
                            picked
                                ? { [attrs.oid]: newOid, [attrs.cond]: null, [attrs.val]: null }
                                : { [attrs.oid]: newOid },
                        )
                    }
                />
            ),
        },
        {
            type: 'raw',
            notStyle: true,
            label: 'Condition',
            attr: attrs.cond,
            hidden: hidden ? `${hidden} || ${noOid}` : noOid,
            Component: (
                <ConditionSelect
                    oid={oid}
                    value={cond}
                    socket={socket}
                    disabled={!editMode}
                    onChange={condition =>
                        change(
                            conditionNeedsValue(condition)
                                ? { [attrs.cond]: condition }
                                : { [attrs.cond]: condition, [attrs.val]: null },
                        )
                    }
                />
            ),
        },
        {
            type: 'raw',
            notStyle: true,
            label: 'Value',
            attr: attrs.val,
            hidden: `${hidden ? `${hidden} || ` : ''}${noOid} || data.${attrs.cond} === "exist" || data.${attrs.cond} === "not exist"`,
            Component: (
                <ConditionValueField
                    oid={oid}
                    value={section[attrs.val] as string | number | boolean | null | undefined}
                    socket={socket}
                    disabled={!editMode}
                    onChange={value => change({ [attrs.val]: value })}
                />
            ),
        },
    ] as Field[];
}

/** The fields of a section, grouped; the values that depend on the section are filled in here */
function getGroups(context: GroupsContext): SectionGroup[] {
    const { section, project, view } = context;
    const panel = section.variant === 'panel';
    const layout = getGridLayout(project[view]?.settings);
    const views = Object.keys(project).filter(name => name !== '___settings');

    return [
        {
            key: 'header',
            label: 'Header',
            fields: [
                {
                    type: 'text',
                    label: 'Title',
                    attr: 'title',
                    notStyle: true,
                    clearButton: true,
                    helpImage: 'sectionTitle',
                    title: 'help_section_title',
                },
                {
                    type: 'text',
                    label: 'Subtitle',
                    attr: 'subtitle',
                    notStyle: true,
                    clearButton: true,
                    helpImage: 'sectionSubtitle',
                    title: 'help_section_title',
                },
                { type: 'icon64', label: 'Icon', attr: 'icon', notStyle: true, helpImage: 'sectionIcon' },
                {
                    type: 'color',
                    label: 'Icon color',
                    attr: 'iconColor',
                    notStyle: true,
                    helpImage: 'sectionIcon',
                    title: 'help_section_icon_color',
                    hidden: '!data.icon',
                },
                { type: 'color', label: 'Title color', attr: 'titleColor', notStyle: true, helpImage: 'sectionTitle' },
                {
                    type: 'slider',
                    label: 'Title size',
                    attr: 'titleSize',
                    notStyle: true,
                    helpImage: 'sectionTitle',
                    min: 10,
                    max: 48,
                    step: 1,
                    default: 16,
                },
                {
                    type: 'select',
                    label: 'Title alignment',
                    attr: 'titleAlign',
                    notStyle: true,
                    helpImage: 'sectionTitleAlign',
                    value: section.titleAlign || 'left',
                    options: [
                        { label: 'Left', value: 'left' },
                        { label: 'Center', value: 'center' },
                        { label: 'Right', value: 'right' },
                    ],
                },
                {
                    type: 'checkbox',
                    label: 'Line below the header',
                    attr: 'divider',
                    notStyle: true,
                    helpImage: 'sectionDivider',
                },
                {
                    type: 'select',
                    label: 'Link to view',
                    attr: 'link',
                    notStyle: true,
                    noTranslation: true,
                    helpImage: 'sectionLink',
                    title: 'help_section_link',
                    value: section.link || '',
                    options: [{ label: '', value: '' }, ...views.map(name => ({ label: name, value: name }))],
                },
            ] as Field[],
        },
        {
            key: 'appearance',
            label: 'Appearance',
            fields: [
                {
                    type: 'select',
                    label: 'Look',
                    attr: 'variant',
                    helpImage: 'sectionLook',
                    title: 'help_section_look',
                    notStyle: true,
                    // a section from before this attribute has none, and that is the plain one
                    value: panel ? 'panel' : 'plain',
                    options: [
                        { label: 'Plain', value: 'plain' },
                        { label: 'Panel', value: 'panel' },
                    ],
                },
                { type: 'color', label: 'Background', attr: 'background', notStyle: true, helpImage: 'background' },
                {
                    type: 'image',
                    label: 'Background image',
                    attr: 'backgroundImage',
                    notStyle: true,
                    helpImage: 'background',
                },
                {
                    type: 'color',
                    label: 'Text color',
                    attr: 'color',
                    notStyle: true,
                    helpImage: 'sectionTextColor',
                    title: 'help_section_text_color',
                },
                {
                    type: 'slider',
                    label: 'Border width',
                    attr: 'borderWidth',
                    helpImage: 'border',
                    notStyle: true,
                    min: 0,
                    max: 10,
                    step: 1,
                    default: 0,
                },
                {
                    type: 'select',
                    label: 'Border style',
                    attr: 'borderStyle',
                    helpImage: 'border',
                    notStyle: true,
                    value: section.borderStyle || 'solid',
                    hidden: '!data.borderWidth',
                    options: [
                        { label: 'Solid', value: 'solid' },
                        { label: 'Dashed', value: 'dashed' },
                        { label: 'Dotted', value: 'dotted' },
                        { label: 'Double', value: 'double' },
                    ],
                },
                {
                    type: 'color',
                    label: 'Border color',
                    attr: 'borderColor',
                    helpImage: 'border',
                    notStyle: true,
                    hidden: '!data.borderWidth',
                },
                {
                    type: 'slider',
                    label: 'Border radius',
                    attr: 'borderRadius',
                    helpImage: 'borderRadius',
                    notStyle: true,
                    min: 0,
                    max: 50,
                    step: 1,
                    // what the panel brings, while the section does not set its own
                    default: panel ? 12 : 0,
                },
                {
                    type: 'slider',
                    label: 'Inner spacing',
                    attr: 'padding',
                    helpImage: 'padding',
                    title: 'help_section_padding',
                    notStyle: true,
                    min: 0,
                    max: 50,
                    step: 1,
                    default: panel ? 12 : 0,
                },
                {
                    type: 'text',
                    label: 'Shadow',
                    attr: 'boxShadow',
                    notStyle: true,
                    clearButton: true,
                    helpImage: 'boxShadow',
                    title: 'help_section_shadow',
                },
                {
                    type: 'slider',
                    label: 'Glass effect',
                    attr: 'glass',
                    notStyle: true,
                    helpImage: 'glass',
                    title: 'help_section_glass',
                    min: 0,
                    max: 30,
                    step: 1,
                    default: 0,
                },
                {
                    type: 'text',
                    label: 'CSS Class',
                    attr: 'className',
                    notStyle: true,
                    clearButton: true,
                    title: 'help_section_class',
                },
            ] as Field[],
        },
        {
            key: 'layout',
            label: 'Layout',
            fields: [
                {
                    type: 'slider',
                    label: 'Width in section columns',
                    attr: 'columnSpan',
                    notStyle: true,
                    helpImage: 'sectionSpan',
                    title: 'help_section_span',
                    min: 1,
                    max: Math.max(1, layout.maxSections),
                    step: 1,
                    default: 1,
                },
                {
                    type: 'checkbox',
                    label: 'Start a new row',
                    attr: 'newRow',
                    notStyle: true,
                    helpImage: 'sectionNewRow',
                    title: 'help_section_new_row',
                },
                {
                    type: 'checkbox',
                    label: 'As high as its row',
                    attr: 'stretch',
                    notStyle: true,
                    helpImage: 'sectionStretch',
                    title: 'help_section_stretch',
                },
                {
                    type: 'slider',
                    label: 'Min. height',
                    attr: 'minHeight',
                    notStyle: true,
                    helpImage: 'sectionMinHeight',
                    min: 0,
                    max: 1000,
                    step: 10,
                    default: 0,
                },
                {
                    type: 'slider',
                    label: 'Grid row height',
                    attr: 'rowHeight',
                    notStyle: true,
                    helpImage: 'gridRowHeight',
                    title: 'help_section_cells',
                    min: 20,
                    max: 200,
                    step: 1,
                    default: layout.rowHeight,
                },
                {
                    type: 'slider',
                    label: 'Grid gap',
                    attr: 'gridGap',
                    notStyle: true,
                    helpImage: 'gridGap',
                    title: 'help_section_cells',
                    min: 0,
                    max: 50,
                    step: 1,
                    default: layout.gridGap,
                },
            ] as Field[],
        },
        {
            key: 'visibility',
            label: 'Visibility',
            fields: [
                {
                    type: 'groups',
                    label: 'Only for groups',
                    attr: 'visibilityGroups',
                    notStyle: true,
                    helpImage: 'sectionGroups',
                    title: 'help_section_groups',
                },
                {
                    type: 'number',
                    label: 'Only from view width (px)',
                    attr: 'visibilityMinWidth',
                    notStyle: true,
                    helpImage: 'visibilityMinWidth',
                },
                {
                    type: 'number',
                    label: 'Only up to view width (px)',
                    attr: 'visibilityMaxWidth',
                    notStyle: true,
                    helpImage: 'visibilityMaxWidth',
                },
                ...conditionFields(
                    context,
                    { oid: 'visibilityOid', cond: 'visibilityCond', val: 'visibilityVal' },
                    undefined,
                    {
                        image: 'sectionVisibilityState',
                        title: 'help_section_visibility_state',
                    },
                ),
            ] as Field[],
        },
        {
            key: 'collapsing',
            label: 'Opening and closing',
            fields: [
                {
                    type: 'checkbox',
                    label: 'Can be closed',
                    attr: 'collapsible',
                    notStyle: true,
                    helpImage: 'sectionCollapse',
                    title: 'help_section_collapsible',
                },
                {
                    type: 'checkbox',
                    label: 'Closed at the start',
                    attr: 'collapsed',
                    notStyle: true,
                    helpImage: 'sectionCollapse',
                    hidden: '!data.collapsible || !!data.expandOid',
                },
                ...conditionFields(
                    context,
                    { oid: 'expandOid', cond: 'expandCond', val: 'expandVal' },
                    '!data.collapsible',
                    {
                        image: 'sectionExpandState',
                        title: 'help_section_expand_state',
                    },
                ),
            ] as Field[],
        },
    ];
}

/** Evaluates the `hidden` of a field against the section, the way the view attributes do against the view */
function checkFunction(
    funcText: boolean | string | ((settings: Record<string, any>) => boolean) | undefined,
    settings: Record<string, any>,
): boolean {
    if (funcText === true || funcText === false || funcText === undefined) {
        return !!funcText;
    }
    try {
        const func =
            typeof funcText === 'function'
                ? funcText
                : // eslint-disable-next-line no-new-func
                  (new Function('data', `return ${funcText}`) as (data: Record<string, any>) => boolean);
        return func(settings);
    } catch (e) {
        console.error(`Cannot execute hidden on "${funcText.toString()}": ${e as Error}`);
    }
    return false;
}

/**
 * Which group is open, as the accordions of the other tabs count it: 1 open, 2 closing, 0 closed.
 *
 * A group that is closing still renders its fields, so the accordion has something to fold away; only
 * afterwards does it fall to 0 and the fields go.
 */
type OpenState = Record<string, 0 | 1 | 2>;

function readOpenedGroups(): OpenState {
    const result: OpenState = {};
    GROUPS.forEach(key => (result[key] = 0));
    try {
        const stored = JSON.parse(window.localStorage.getItem(OPENED_STORAGE_KEY) || 'null');
        if (Array.isArray(stored)) {
            stored.forEach(key => GROUPS.includes(key) && (result[key as GroupKey] = 1));
            return result;
        }
    } catch {
        // nothing stored, or no storage in this browser
    }
    result.header = 1;
    result.appearance = 1;
    return result;
}

/** Only what is open is worth storing: a group that was closing is simply closed the next time */
function storeOpenedGroups(open: OpenState): void {
    try {
        window.localStorage.setItem(OPENED_STORAGE_KEY, JSON.stringify(GROUPS.filter(key => open[key] === 1)));
    } catch {
        // no storage in this browser: the groups are open as before when the editor is loaded again
    }
}

const SectionAttributes = (props: SectionAttributesProps): React.JSX.Element | null => {
    const [opened, setOpened] = useState<OpenState>(readOpenedGroups);

    const changeOpened = (open: OpenState): void => {
        setOpened(open);
        storeOpenedGroups(open);
    };

    // the buttons above the tabs open and close all groups, and are enabled by what is open
    const { setIsAllOpened, setIsAllClosed } = props;
    useEffect(() => {
        setIsAllOpened(GROUPS.every(key => opened[key] === 1));
        setIsAllClosed(GROUPS.every(key => opened[key] !== 1));
    }, [opened, setIsAllOpened, setIsAllClosed]);
    useEffect(() => {
        if (props.triggerAllOpened) {
            const open: OpenState = {};
            GROUPS.forEach(key => (open[key] = 1));
            setOpened(open);
            storeOpenedGroups(open);
        }
    }, [props.triggerAllOpened]);
    useEffect(() => {
        if (props.triggerAllClosed) {
            const open: OpenState = {};
            GROUPS.forEach(key => (open[key] = 0));
            setOpened(open);
            storeOpenedGroups(open);
        }
    }, [props.triggerAllClosed]);

    const project: Project = store.getState().visProject;
    const view = project[props.selectedView];
    if (!view) {
        return null;
    }

    const sections: ViewSection[] = Array.isArray(view.settings?.sections) ? view.settings.sections : [];
    // the section of the selected widget; without a selected widget the one clicked on
    let index = -1;
    if (props.selectedWidgets.length === 1) {
        index = sections.findIndex(section => section?.widgets?.includes(props.selectedWidgets[0] as never));
    } else if (!props.selectedWidgets.length && props.selectedSection) {
        index = sections.findIndex(section => section?.id === props.selectedSection);
    }
    const section = index === -1 ? null : sections[index];

    if (!section) {
        return (
            <div style={styles.hint}>
                {I18n.t(props.selectedWidgets.length === 1 ? 'section_widget_in_none' : 'section_hint')}
            </div>
        );
    }

    // EditField reads `project[view].settings` - here the section stands there instead, see above
    const sectionProject = {
        [props.selectedView]: { ...view, settings: section as unknown as ViewSettings },
    } as unknown as Project;

    const changeValues = (values: Record<string, unknown>): void => {
        const newProject: Project = deepClone(store.getState().visProject);
        const newSections = newProject[props.selectedView].settings.sections || [];
        const target: Record<string, unknown> = { ...newSections[index] };
        Object.entries(values).forEach(([attr, value]) => {
            // an emptied field is no value, and the section falls back to the plain look or to the panel
            if (value === null || value === '' || (typeof value === 'number' && isNaN(value))) {
                delete target[attr];
            } else {
                target[attr] = value;
            }
        });
        newSections[index] = target as unknown as ViewSection;
        newProject[props.selectedView].settings.sections = newSections;
        void props.changeProject(newProject);
    };

    const changeSection = (changed: Project): void =>
        changeValues(changed[props.selectedView].settings as unknown as Record<string, unknown>);

    // the attributes that are edited as a binding, like `data.bindings` of a widget
    const bindings: string[] = Array.isArray(section.bindings) ? section.bindings : [];
    const toggleBinding = (attr: string): void => {
        const next = bindings.includes(attr) ? bindings.filter(bound => bound !== attr) : [...bindings, attr];
        changeValues({ bindings: next.length ? next : null });
    };

    const groups = getGroups({
        section,
        view: props.selectedView,
        project,
        socket: props.socket,
        theme: props.theme,
        editMode: props.editMode,
        change: changeValues,
    });

    return (
        <div style={{ height: '100%', overflowY: 'auto' }}>
            <div style={styles.groupTitle}>
                {I18n.t('Section')} {section.id}
            </div>
            {groups.map(group => {
                const isOpen = opened[group.key] === 1;
                return (
                    <Accordion
                        sx={{
                            '&.MuiAccordion-root': styles.accordionRoot,
                            '& .Mui-expanded': commonStyles.clearPadding,
                        }}
                        square
                        key={group.key}
                        elevation={0}
                        expanded={isOpen}
                        onChange={(_e, expanded) => {
                            const open: OpenState = { ...opened, [group.key]: expanded ? 1 : 2 };
                            changeOpened(open);
                            if (!expanded) {
                                // the fields stay while the accordion folds up, and go once it is closed
                                setTimeout(() => changeOpened({ ...open, [group.key]: 0 }), 200);
                            }
                        }}
                    >
                        <AccordionSummary
                            sx={{
                                '&.MuiAccordionSummary-root': Utils.getStyle(
                                    props.theme,
                                    commonStyles.clearPadding,
                                    isOpen ? styles.groupSummaryExpanded : styles.groupSummary,
                                    styles.groupSurface,
                                ),
                                '& .MuiAccordionSummary-content': Utils.getStyle(
                                    props.theme,
                                    commonStyles.clearPadding,
                                    isOpen && styles.accordionOpenedSummary,
                                ),
                                '& .Mui-expanded': commonStyles.clearPadding,
                                '& .MuiAccordionSummary-expandIconWrapper': commonStyles.clearPadding,
                            }}
                            expandIcon={<ExpandMoreIcon />}
                        >
                            {/* the gap keeps the icon off the label; without it they touch at `fontSize="small"` */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {GROUP_ICONS[group.key] || null}
                                {I18n.t(group.label)}
                            </div>
                        </AccordionSummary>
                        {opened[group.key] !== 0 ? (
                            <AccordionDetails sx={styles.accordionDetails}>
                                <table style={{ width: '100%' }}>
                                    <tbody>
                                        {group.fields.map(field => {
                                            const bound = bindings.includes(field.attr);
                                            // the binding is a text, whatever the field is otherwise
                                            const control = bound ? (
                                                checkFunction(field.hidden, section) ? null : (
                                                    <BindingField
                                                        value={(section as Record<string, any>)[field.attr]}
                                                        disabled={!props.editMode}
                                                        socket={props.socket}
                                                        theme={props.theme}
                                                        onChange={value => changeValues({ [field.attr]: value })}
                                                    />
                                                )
                                            ) : (
                                                getEditField({
                                                    field,
                                                    disabled: false,
                                                    view: props.selectedView,
                                                    editMode: props.editMode,
                                                    changeProject: changeSection,
                                                    userGroups: props.userGroups,
                                                    adapterName: props.adapterName,
                                                    themeType: props.themeType,
                                                    instance: props.instance,
                                                    projectName: props.projectName,
                                                    socket: props.socket,
                                                    checkFunction,
                                                    project: sectionProject,
                                                    theme: props.theme,
                                                    additionalSets: props.additionalSets,
                                                })
                                            );
                                            if (!control) {
                                                return null;
                                            }
                                            const helpText = field.title ? I18n.t(field.title) : undefined;
                                            return (
                                                <tr key={field.attr}>
                                                    <td style={styles.fieldTitle}>
                                                        <FieldHelp
                                                            image={field.helpImage}
                                                            text={helpText}
                                                        >
                                                            <div style={styles.fieldTitleContent}>
                                                                {I18n.t(field.label)}
                                                                <span style={styles.fieldIcons}>
                                                                    {hasFieldHelp(field.helpImage, helpText) ? (
                                                                        <InfoIcon style={styles.fieldHelpIcon} />
                                                                    ) : null}
                                                                    <span
                                                                        style={styles.bindIconSpan}
                                                                        title={I18n.t(
                                                                            bound
                                                                                ? 'Deactivate binding and use field as standard input'
                                                                                : 'Use field as binding',
                                                                        )}
                                                                        onClick={e => {
                                                                            // the label opens no tooltip and selects nothing
                                                                            e.stopPropagation();
                                                                            props.editMode && toggleBinding(field.attr);
                                                                        }}
                                                                    >
                                                                        {bound ? (
                                                                            <LinkOffIcon style={styles.bindIcon} />
                                                                        ) : (
                                                                            <LinkIcon style={styles.bindIcon} />
                                                                        )}
                                                                    </span>
                                                                </span>
                                                            </div>
                                                        </FieldHelp>
                                                    </td>
                                                    <Box
                                                        component="td"
                                                        sx={{ ...commonStyles.fieldContent, width: '100%' }}
                                                    >
                                                        {control}
                                                    </Box>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </AccordionDetails>
                        ) : null}
                    </Accordion>
                );
            })}
        </div>
    );
};

export default SectionAttributes;
