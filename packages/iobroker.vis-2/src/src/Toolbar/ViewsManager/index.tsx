import React, { useEffect, useState } from 'react';

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';

import { AppBar, IconButton, Tooltip } from '@mui/material';

import {
    Add as AddIcon,
    CreateNewFolder as CreateNewFolderIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { BiImport } from 'react-icons/bi';

import { I18n, type ThemeName, type ThemeType } from '@iobroker/adapter-react-v5';

import type Editor from '@/Editor';
import type { View as ViewType, AnyWidgetId, VisTheme } from '@iobroker/types-vis-2';
import IODialog from '../../Components/IODialog';
import Folder from './Folder';
import Root from './Root';
import View from './View';
import ExportDialog from './ExportDialog';
import ImportDialog from './ImportDialog';
import FolderDialog from './FolderDialog';
import { DndPreview, isTouchDevice } from '../../Utils';
import { store } from '../../Store';
import { deepClone, getNewWidgetId, hasViewAccess, isGroup, pasteGroup } from '../../Utils/utils';

const styles: Record<string, any> = {
    dialog: {
        minWidth: 400,
        minHeight: 300,
    },
    topBar: {
        flexDirection: 'row',
        borderRadius: 4,
        marginBottom: 12,
    },
    folderContainer: {
        clear: 'right',
        '& $viewManageButtonActions': {
            visibility: 'hidden',
        },
        '&:hover $viewManageButtonActions': {
            visibility: 'initial',
        },
    },
    viewContainer: {
        clear: 'right',
        '& $viewManageButtonActions': {
            visibility: 'hidden',
        },
        '&:hover $viewManageButtonActions': {
            visibility: 'initial',
        },
    },
};

interface ViewsManagerProps {
    changeProject: Editor['changeProject'];
    name?: string;
    onClose: () => void;
    showDialog: (
        type: 'add' | 'rename' | 'delete' | 'copy',
        view?: string,
        parentId?: string,
        cb?: (dialogName: string) => void,
    ) => void;
    themeName: ThemeName;
    themeType: ThemeType;
    theme: VisTheme;
    toggleView: Editor['toggleView'];
    editMode: boolean;
    selectedView: string;
}

const ViewsManager: React.FC<ViewsManagerProps> = props => {
    const [exportDialog, setExportDialog] = useState<string | false>(false);
    const [importDialog, setImportDialog] = useState<string | false>(false);

    const [folderDialog, setFolderDialog] = useState<'add' | 'rename' | 'delete'>(null);
    const [folderDialogName, setFolderDialogName] = useState('');
    const [folderDialogId, setFolderDialogId] = useState(null);
    const [folderDialogParentId, setFolderDialogParentId] = useState(null);
    const [isDragging, setIsDragging] = useState('');
    const [isOverRoot, setIsOverRoot] = useState(false);

    const [foldersCollapsed, setFoldersCollapsed] = useState<string[]>([]);
    useEffect(() => {
        if (window.localStorage.getItem('ViewsManager.foldersCollapsed')) {
            setFoldersCollapsed(JSON.parse(window.localStorage.getItem('ViewsManager.foldersCollapsed')));
        }
    }, []);

    const { visProject, activeUser } = store.getState();

    const moveFolder = (id: string, parentId: string): void => {
        const project = deepClone(visProject);
        project.___settings.folders.find(folder => folder.id === id).parentId = parentId;
        void props.changeProject(project);
    };

    const moveView = (name: string, parentId: string): void => {
        const project = deepClone(visProject);
        project[name].parentId = parentId;
        void props.changeProject(project);
    };

    const importViewAction = (view: string, data: string): void => {
        const project = deepClone(visProject);
        const viewObject: ViewType = JSON.parse(data);

        if (viewObject.parentId !== undefined) {
            delete viewObject.parentId;
        }

        if (!viewObject || !viewObject.settings || !viewObject.widgets) {
            console.warn(
                'Cannot import view: view is non-existing or missing one of the required properties "settings, widgets"',
            );
            return;
        }

        const originalWidgets = deepClone(viewObject.widgets);

        project[view] = { ...viewObject, widgets: {}, activeWidgets: [] };

        for (const [wid, widget] of Object.entries(originalWidgets)) {
            if (isGroup(widget)) {
                pasteGroup({
                    group: widget,
                    widgets: project[view].widgets,
                    groupMembers: originalWidgets,
                    project,
                });
            } else if (!widget.groupid) {
                const newWid = getNewWidgetId(project);
                project[view].widgets[newWid] = originalWidgets[wid as AnyWidgetId];
            }
        }

        viewObject.name = view;
        void props.changeProject(project);
    };

    const renderViews = (parentId?: string): React.JSX.Element[] =>
        Object.keys(visProject)
            .filter(name => !name.startsWith('___'))
            .filter(name => (parentId ? visProject[name].parentId === parentId : !visProject[name].parentId))
            .sort((name1, name2) => name1.toLowerCase().localeCompare(name2.toLowerCase()))
            .map((name, key) => (
                <div
                    key={key}
                    style={styles.viewContainer}
                >
                    <View
                        name={name}
                        setIsDragging={setIsDragging}
                        isDragging={isDragging}
                        moveView={moveView}
                        setExportDialog={setExportDialog}
                        setImportDialog={setImportDialog}
                        selectedView={props.selectedView}
                        theme={props.theme}
                        openedViews={store.getState().visProject.___settings.openedViews}
                        {...props}
                        hasPermissions={hasViewAccess({
                            view: name,
                            user: activeUser,
                            project: visProject,
                            editMode: props.editMode,
                        })}
                    />
                </div>
            ));

    const renderFolders = (parentId?: string): React.JSX.Element[] => {
        const folders = visProject.___settings.folders
            .filter(folder => (parentId ? folder.parentId === parentId : !folder.parentId))
            .sort((folder1, folder2) => folder1.name.toLowerCase().localeCompare(folder2.name.toLowerCase()));

        return folders.map((folder, key) => (
            <div key={key}>
                <div style={styles.folderContainer}>
                    <Folder
                        setIsDragging={setIsDragging}
                        isDragging={isDragging}
                        folder={folder}
                        theme={props.theme}
                        editMode={props.editMode}
                        setFolderDialog={setFolderDialog}
                        setFolderDialogName={setFolderDialogName}
                        setFolderDialogId={setFolderDialogId}
                        setFolderDialogParentId={setFolderDialogParentId}
                        moveFolder={moveFolder}
                        foldersCollapsed={foldersCollapsed}
                        setFoldersCollapsed={setFoldersCollapsed}
                        showDialog={props.showDialog}
                    />
                </div>
                {foldersCollapsed.includes(folder.id) ? null : (
                    <div style={{ paddingLeft: 10 }}>
                        {renderFolders(folder.id)}
                        {renderViews(folder.id)}
                    </div>
                )}
            </div>
        ));
    };

    return (
        <IODialog
            onClose={props.onClose}
            title="Manage views"
            closeTitle="Close"
        >
            <div style={styles.dialog}>
                <DndProvider backend={isTouchDevice() ? TouchBackend : HTML5Backend}>
                    <DndPreview />
                    {props.editMode ? (
                        <AppBar
                            position="static"
                            style={styles.topBar}
                        >
                            {props.editMode ? (
                                <Tooltip
                                    title={I18n.t('Add view')}
                                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                >
                                    <IconButton
                                        size="small"
                                        onClick={() =>
                                            props.showDialog('add', props.name, null, (newView: string) => {
                                                newView && props.onClose();
                                            })
                                        }
                                    >
                                        <AddIcon />
                                    </IconButton>
                                </Tooltip>
                            ) : null}
                            {props.editMode ? (
                                <Tooltip
                                    title={I18n.t('Import')}
                                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                >
                                    <IconButton
                                        onClick={() => setImportDialog('')}
                                        size="small"
                                    >
                                        <BiImport />
                                    </IconButton>
                                </Tooltip>
                            ) : null}
                            {props.editMode ? (
                                <Tooltip
                                    title={I18n.t('Add folder')}
                                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                >
                                    <IconButton
                                        size="small"
                                        onClick={() => {
                                            setFolderDialog('add');
                                            setFolderDialogName('');
                                            setFolderDialogParentId(null);
                                        }}
                                    >
                                        <CreateNewFolderIcon />
                                    </IconButton>
                                </Tooltip>
                            ) : null}
                            {props.editMode ? (
                                <Tooltip
                                    title={I18n.t('Show all views')}
                                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                >
                                    <IconButton
                                        size="small"
                                        onClick={async () => {
                                            const proj = deepClone(store.getState().visProject);

                                            const views = Object.keys(proj).filter(name => !name.startsWith('___'));

                                            for (const view of views) {
                                                proj.___settings.openedViews.push(view);
                                            }

                                            await props.changeProject(proj, false);
                                        }}
                                    >
                                        <VisibilityIcon />
                                    </IconButton>
                                </Tooltip>
                            ) : null}
                            {props.editMode ? (
                                <Tooltip
                                    title={I18n.t('Hide all views')}
                                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                >
                                    <IconButton
                                        size="small"
                                        onClick={async () => {
                                            const proj = deepClone(store.getState().visProject);
                                            proj.___settings.openedViews = [];

                                            await props.changeProject(proj, false);
                                        }}
                                    >
                                        <VisibilityOffIcon />
                                    </IconButton>
                                </Tooltip>
                            ) : null}
                        </AppBar>
                    ) : null}
                    <div
                        style={{
                            width: '100%',
                            borderStyle: 'dashed',
                            borderRadius: 4,
                            borderWidth: 1,
                            borderColor: isOverRoot ? 'rgba(200, 200, 200, 1)' : 'rgba(128, 128, 128, 0)',
                            lineHeight: '32px',
                            verticalAlign: 'middle',
                        }}
                    >
                        {renderFolders()}
                        {renderViews()}
                        <Root
                            isDragging={isDragging}
                            setIsOverRoot={setIsOverRoot}
                        />
                    </div>
                </DndProvider>
            </div>
            {folderDialog ? (
                <FolderDialog
                    dialog={folderDialog}
                    dialogFolder={folderDialogId}
                    dialogName={folderDialogName}
                    dialogParentId={folderDialogParentId}
                    closeDialog={() => setFolderDialog(null)}
                    setDialogFolder={setFolderDialogId}
                    setDialogName={setFolderDialogName}
                    changeProject={props.changeProject}
                />
            ) : null}
            {importDialog !== false ? (
                <ImportDialog
                    onClose={() => setImportDialog(false)}
                    view={importDialog || ''}
                    importViewAction={importViewAction}
                    themeType={props.themeType}
                />
            ) : null}
            {exportDialog !== false ? (
                <ExportDialog
                    onClose={() => setExportDialog(false)}
                    view={exportDialog || ''}
                    themeType={props.themeType}
                />
            ) : null}
        </IODialog>
    );
};

export default ViewsManager;
