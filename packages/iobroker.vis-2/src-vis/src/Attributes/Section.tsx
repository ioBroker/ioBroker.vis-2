import React from 'react';

import { Box } from '@mui/material';

import { I18n, type Connection, type ThemeType } from '@iobroker/gui-components';

import { store } from '@/Store';
import { deepClone } from '@/Utilities/utils';
import commonStyles from '@/Utilities/styles';
import type { AdditionalIconSet, Project, ViewSection, ViewSettings, VisTheme } from '@iobroker/types-vis-2';

import type { Field } from './View/Items';
import getEditField from './View/EditField';

/**
 * The attributes of a section of the grid layout: its header and its look.
 *
 * It shows the section of the selected widget, or - for a section without widgets - the one selected with the
 * pencil below it in the view. The fields are the ones of the view attributes, see View/EditField.tsx: they read and
 * write `project[view].settings`, so they are handed a project in which the section stands in for the settings of
 * the view, and every change is put back into the section.
 */

interface SectionAttributesProps {
    selectedView: string;
    selectedWidgets: string[];
    /** The id of the section selected with its pencil, see Editor.setSelectedSection() */
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
}

const styles: Record<string, React.CSSProperties> = {
    groupTitle: {
        padding: '6px 8px 2px',
        fontSize: '80%',
        fontWeight: 'bold',
        opacity: 0.7,
    },
    fieldTitle: {
        width: 140,
        fontSize: '80%',
    },
    hint: {
        padding: 16,
        fontSize: '90%',
        opacity: 0.7,
    },
};

/** The fields of a section, grouped; the values that depend on the section are filled in by getGroups() */
function getGroups(section: ViewSection): { label: string; fields: Field[] }[] {
    const panel = section.variant === 'panel';
    return [
        {
            label: 'Header',
            fields: [
                { type: 'text', label: 'Title', attr: 'title', notStyle: true, clearButton: true },
                { type: 'icon64', label: 'Icon', attr: 'icon', notStyle: true },
            ] as Field[],
        },
        {
            label: 'Appearance',
            fields: [
                {
                    type: 'select',
                    label: 'Look',
                    attr: 'variant',
                    notStyle: true,
                    // a section from before this attribute has none, and that is the plain one
                    value: panel ? 'panel' : 'plain',
                    options: [
                        { label: 'Plain', value: 'plain' },
                        { label: 'Panel', value: 'panel' },
                    ],
                },
                { type: 'color', label: 'Background', attr: 'background', notStyle: true },
                {
                    type: 'slider',
                    label: 'Border width',
                    attr: 'borderWidth',
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
                    notStyle: true,
                    hidden: '!data.borderWidth',
                },
                {
                    type: 'slider',
                    label: 'Border radius',
                    attr: 'borderRadius',
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
                    notStyle: true,
                    min: 0,
                    max: 50,
                    step: 1,
                    default: panel ? 12 : 0,
                },
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

const SectionAttributes = (props: SectionAttributesProps): React.JSX.Element | null => {
    const project: Project = store.getState().visProject;
    const view = project[props.selectedView];
    if (!view) {
        return null;
    }

    const sections: ViewSection[] = Array.isArray(view.settings?.sections) ? view.settings.sections : [];
    // the section of the selected widget; without a selected widget the one of the pencil
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

    const changeSection = (changed: Project): void => {
        const values = changed[props.selectedView].settings as unknown as Record<string, unknown>;
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

    return (
        <div style={{ height: '100%', overflowY: 'auto' }}>
            <div style={styles.groupTitle}>
                {I18n.t('Section')} {section.id}
            </div>
            {getGroups(section).map(group => (
                <div key={group.label}>
                    <div style={styles.groupTitle}>{I18n.t(group.label)}</div>
                    <table style={{ width: '100%' }}>
                        <tbody>
                            {group.fields.map(field => {
                                const control = getEditField({
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
                                });
                                if (!control) {
                                    return null;
                                }
                                return (
                                    <tr key={field.attr}>
                                        <td style={styles.fieldTitle}>{I18n.t(field.label)}</td>
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
                </div>
            ))}
        </div>
    );
};

export default SectionAttributes;
