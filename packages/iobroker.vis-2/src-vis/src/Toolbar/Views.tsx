import React, { useState } from 'react';

import { Tooltip } from '@mui/material';

import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Menu as MenuIcon } from '@mui/icons-material';

import { I18n, type ThemeName, type ThemeType } from '@iobroker/gui-components';

import type Editor from '@/Editor';
import type { GroupWidgetId, VisTheme } from '@iobroker/types-vis-2';
import ViewsManager from './ViewsManager';

import ToolbarItems, { type ToolbarItem } from './ToolbarItems';
import ViewDialog from './ViewsManager/ViewDialog';

const styles: Record<string, React.CSSProperties> = {
    label: {
        maxWidth: 180,
        textOverflow: 'ellipsis',
        display: 'inline-block',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
    },
    projectLabel: {
        cursor: 'pointer',
        fontWeight: 'bold',
    },
};

interface ViewsProps {
    projectName: string;
    selectedView: string;
    setViewsManager: Editor['setViewsManager'];
    viewsManager: boolean;
    selectedGroup?: GroupWidgetId;
    editMode: boolean;
    setProjectsDialog: Editor['setProjectsDialog'];
    changeProject: Editor['changeProject'];
    theme: VisTheme;
    changeView: Editor['changeView'];
    setSelectedWidgets: Editor['setSelectedWidgets'];
    themeType: ThemeType;
    toolbarHeight: 'full' | 'narrow' | 'veryNarrow';
    themeName: ThemeName;
    toggleView: Editor['toggleView'];
}

const Views = (props: ViewsProps): React.JSX.Element => {
    const [dialog, setDialog] = useState<'add' | 'rename' | 'delete' | 'copy' | null>(null);
    const [dialogCallback, setDialogCallback] = useState<{ cb: (dialogName: string) => void } | null>(null);
    const [dialogName, setDialogName] = useState('');
    const [dialogView, setDialogView] = useState<string | undefined>(undefined);
    const [dialogParentId, setDialogParentId] = useState<string | undefined>(undefined);

    const showDialog = (
        type: 'add' | 'rename' | 'delete' | 'copy',
        view?: string | null,
        parentId?: string | null,
        cb?: (dialogName: string) => void,
    ): void => {
        view = view || props.selectedView;

        const dialogDefaultName: Record<string, string> = {
            add: I18n.t('New view'),
            rename: view,
            copy: `${view} ${I18n.t('Copy noun')}`,
        };

        setDialog(type);
        setDialogView(view || undefined);
        setDialogParentId(parentId || undefined);
        setDialogName(dialogDefaultName[type]);
        setDialogCallback(cb ? { cb } : null);
    };

    const toolbar: {
        name: React.JSX.Element;
        items: (ToolbarItem | ToolbarItem[] | ToolbarItem[][])[];
    } = {
        name: (
            <span style={styles.label}>
                <Tooltip
                    title={I18n.t('Current project')}
                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                >
                    <span
                        style={styles.projectLabel}
                        onClick={() => props.setProjectsDialog(true)}
                    >
                        {props.projectName}
                    </span>
                </Tooltip>
            </span>
        ),
        items: [
            {
                type: 'icon-button',
                Icon: AddIcon,
                name: 'Add new view',
                onAction: () => showDialog('add'),
                disabled: !!props.selectedGroup || !props.editMode,
            },
            [
                [
                    {
                        type: 'icon-button',
                        Icon: EditIcon,
                        name: 'Rename view',
                        onAction: () => showDialog('rename'),
                        disabled: !!props.selectedGroup || !props.editMode,
                    },
                ],
                [
                    {
                        type: 'icon-button',
                        Icon: DeleteIcon,
                        name: 'Delete actual view',
                        onAction: () => showDialog('delete'),
                        disabled: !!props.selectedGroup || !props.editMode,
                    },
                ],
            ],
            {
                type: 'icon-button',
                Icon: MenuIcon,
                name: 'Manage views',
                onAction: () => props.setViewsManager(true),
                disabled: !!props.selectedGroup,
            },
        ],
    };

    return (
        <>
            <ToolbarItems
                group={toolbar}
                theme={props.theme}
                changeProject={props.changeProject}
                selectedView={props.selectedView}
                setSelectedWidgets={props.setSelectedWidgets}
                themeType={props.themeType}
                toolbarHeight={props.toolbarHeight}
            />
            {props.viewsManager ? (
                <ViewsManager
                    onClose={() => props.setViewsManager(false)}
                    showDialog={showDialog}
                    theme={props.theme}
                    changeProject={props.changeProject}
                    editMode={props.editMode}
                    selectedView={props.selectedView}
                    themeName={props.themeName}
                    themeType={props.themeType}
                    toggleView={props.toggleView}
                />
            ) : null}
            {dialog ? (
                <ViewDialog
                    dialog={dialog}
                    dialogView={dialogView}
                    dialogName={dialogName}
                    dialogCallback={dialogCallback}
                    noTranslation
                    dialogParentId={dialogParentId}
                    closeDialog={() => setDialog(null)}
                    setDialogView={setDialogView}
                    setDialogName={setDialogName}
                    setDialogParentId={setDialogParentId}
                    changeProject={props.changeProject}
                    changeView={props.changeView}
                    selectedView={props.selectedView}
                />
            ) : null}
        </>
    );
};

export default Views;
