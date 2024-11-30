import React from 'react';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, FileCopy as FileCopyIcon } from '@mui/icons-material';

import { TextField } from '@mui/material';

import { I18n } from '@iobroker/adapter-react-v5';

import { store } from '@/Store';
import { deepClone, getNewWidgetId, isGroup, pasteGroup } from '@/Utils/utils';
import { useFocus } from '@/Utils';
import IODialog from '@/Components/IODialog';
import type { Project, SingleWidgetId, View } from '@iobroker/types-vis-2';

interface ViewDialogProps {
    changeProject: (project: Project) => Promise<void>;
    changeView: (viewName: string) => Promise<void>;
    dialog: string;
    /** Name of view */
    dialogName: string;
    dialogView: string;
    dialogCallback?: { cb: (dialogName: string) => void };
    selectedView: string;
    closeDialog: () => void;
    setDialogName: (dialogName: string) => void;
    setDialogView: (action: null) => void;
    dialogParentId?: string;
    noTranslation: boolean;
    setDialogParentId: (action: null) => void;
}

const ViewDialog = (props: ViewDialogProps): React.JSX.Element => {
    const inputField = useFocus(!!props.dialog && props.dialog !== 'delete', props.dialog === 'add');

    const deleteView = async (): Promise<void> => {
        const view = props.dialogView || props.selectedView;
        const project = deepClone(store.getState().visProject);
        delete project[view];
        await props.changeView(Object.keys(project).filter(foundView => !foundView.startsWith('__'))[0]);
        await props.changeProject(project);
        props.closeDialog(); // close dialog
    };

    const addView = async (): Promise<void> => {
        const project: Project = deepClone(store.getState().visProject);
        project[props.dialogName.trim()] = {
            name: props.dialogName,
            parentId: props.dialogParentId,
            settings: {
                style: {},
            },
            widgets: {},
            activeWidgets: [],
        } as View;
        await props.changeProject(project);
        await props.changeView(props.dialogName.trim());
        props.closeDialog(); // close dialog
        props.dialogCallback?.cb(props.dialogName.trim());
    };

    interface RenameReferencesOptions {
        /** The project to rename references in */
        project: Project;
        /** The view name to rename */
        oldViewName: string;
    }

    /**
     * Rename the references to this view
     * This currently affects View in Widget (8)
     *
     * @param options the project to rename the references in and the old view name
     */
    const renameReferences = (options: RenameReferencesOptions): void => {
        const { project, oldViewName } = options;

        for (const [viewName, view] of Object.entries(project)) {
            if (viewName === '___settings') {
                continue;
            }

            for (const widget of Object.values(view.widgets)) {
                if (widget.tpl === 'tplContainerView') {
                    if (widget.data.contains_view === oldViewName) {
                        widget.data.contains_view = props.dialogName;
                    }
                }

                if (widget.tpl === 'tplStatefulContainerView8') {
                    for (const [key, val] of Object.entries(widget.data)) {
                        if (key.startsWith('contains_view') && val === oldViewName) {
                            widget.data[key] = props.dialogName;
                        }
                    }
                }
            }
        }
    };

    const renameView = async (): Promise<void> => {
        const oldViewName = props.dialogView || props.selectedView;
        const newViewName = props.dialogName.trim();
        const project = deepClone(store.getState().visProject);
        project[newViewName] = project[oldViewName];
        delete project[oldViewName];

        // Rename view where applicable
        renameReferences({ project, oldViewName });

        await props.changeProject(project);
        await props.changeView(newViewName);
        props.closeDialog();
        props.dialogCallback?.cb(newViewName);
    };

    const copyView = async (): Promise<void> => {
        const view = props.dialogView || props.selectedView;
        const project = deepClone(store.getState().visProject);
        project[props.dialogName] = { ...project[view], widgets: {}, activeWidgets: [] } as View;
        const originalWidgets = deepClone(project[view].widgets);

        for (const [wid, widget] of Object.entries(originalWidgets)) {
            if (isGroup(widget)) {
                pasteGroup({
                    group: widget,
                    widgets: project[props.dialogName].widgets,
                    groupMembers: originalWidgets,
                    project,
                });
            } else if (!widget.groupid) {
                const newWid = getNewWidgetId(project);
                project[props.dialogName].widgets[newWid] = originalWidgets[wid as SingleWidgetId];
            }
        }

        await props.changeProject(project);
        await props.changeView(props.dialogName);
        props.closeDialog();
        props.dialogCallback?.cb(props.dialogName);
    };

    const dialogTitles: Record<string, string> = {
        delete: I18n.t('Do you want to delete view "%s"?', props.dialogView || props.selectedView),
        copy: I18n.t('Copy view "%s"', props.dialogView || props.selectedView),
        rename: I18n.t('Rename view "%s"', props.dialogView || props.selectedView),
        add: I18n.t('Add view'),
    };

    const dialogButtons: Record<string, string> = {
        delete: I18n.t('Delete'),
        copy: I18n.t('Create copy'),
        rename: I18n.t('Rename'),
        add: I18n.t('Add'),
    };

    const dialogActions: Record<string, () => Promise<void>> = {
        delete: deleteView,
        copy: copyView,
        rename: renameView,
        add: addView,
    };

    const dialogInputs: Record<string, string> = {
        copy: I18n.t('Name of copy'),
        rename: I18n.t('New name'),
        add: I18n.t('Name'),
    };

    const dialogIcons: Record<string, unknown> = {
        delete: DeleteIcon,
        copy: FileCopyIcon,
        rename: EditIcon,
        add: AddIcon,
    };

    const DialogIcon = dialogIcons[props.dialog];

    let dialogDisabled = false;
    if (props.dialog !== 'delete') {
        if (!props.dialogName || store.getState().visProject[props.dialogName.trim()]) {
            dialogDisabled = true;
        }
    }

    if (!props.dialog) {
        return null;
    }

    return (
        <IODialog
            title={dialogTitles[props.dialog]}
            noTranslation={props.noTranslation}
            actionTitle={dialogButtons[props.dialog]}
            onClose={() => {
                props.closeDialog();
                props.setDialogView(null);
                props.setDialogParentId(null);
            }}
            ActionIcon={DialogIcon || null}
            action={dialogActions[props.dialog]}
            actionColor={props.dialog === 'delete' ? 'secondary' : 'primary'}
            actionDisabled={dialogDisabled}
        >
            {props.dialog === 'delete' ? null : (
                <TextField
                    inputRef={inputField}
                    variant="standard"
                    label={dialogInputs[props.dialog]}
                    fullWidth
                    value={props.dialogName}
                    onChange={e => props.setDialogName(e.target.value)}
                />
            )}
        </IODialog>
    );
};

export default ViewDialog;
