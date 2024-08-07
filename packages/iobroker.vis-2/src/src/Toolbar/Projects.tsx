import React, { useState } from 'react';

import {
    Menu as MenuIcon,
    Settings as SettingsIcon,
    List as ListIcon,
    FileCopy as FilesIcon,
} from '@mui/icons-material';

import {
    SelectID,
    I18n,
    SelectFile as SelectFileDialog,
    Utils,
    type Connection, type ThemeType, type LegacyConnection,
} from '@iobroker/adapter-react-v5';

import type { VisTheme } from '@iobroker/types-vis-2';
import type Editor from '@/Editor';
import type { ToolbarItem } from './ToolbarItems';
import ToolbarItems from './ToolbarItems';
import Settings from './Settings';
import ProjectsManager from './ProjectsManager';

interface ToolsProps {
    adapterName: string;
    addProject: Editor['addProject'];
    changeProject: Editor['changeProject'];
    deleteProject: Editor['deleteProject'];
    instance: number;
    loadProject: Editor['loadProject'];
    projectName: string;
    projects: string[];
    projectsDialog: boolean;
    refreshProjects: Editor['refreshProjects'];
    renameProject: Editor['renameProject'];
    selectedView: string;
    setProjectsDialog: Editor['setProjectsDialog'];
    setSelectedWidgets: Editor['setSelectedWidgets'];
    socket: LegacyConnection;
    theme: VisTheme;
    themeType: ThemeType;
    toolbarHeight: 'full' | 'narrow' | 'veryNarrow';
}

const Tools = (props: ToolsProps) => {
    const [settingsDialog, setSettingsDialog] = useState(false);
    const [objectsDialog, setObjectsDialog] = useState(false);
    const [filesDialog, setFilesDialog] = useState(false);

    const toolbar: {
        name: string;
        items: (ToolbarItem | ToolbarItem[] | ToolbarItem[][])[];
    } = {
        name: 'Projects',
        items: [
            {
                type: 'icon-button', Icon: SettingsIcon, name: 'Settings', onClick: () => setSettingsDialog(true),
            },
            {
                type: 'icon-button', Icon: MenuIcon, name: 'Manage projects', onClick: () => props.setProjectsDialog(true),
            },
            {
                type: 'icon-button', Icon: ListIcon, name: 'Objects', onClick: () => setObjectsDialog(true),
            },
            {
                type: 'icon-button', Icon: FilesIcon, name: 'Files', onClick: () => setFilesDialog(true),
            },
        ],
    };

    return <>
        <ToolbarItems
            group={toolbar}
            last
            changeProject={props.changeProject}
            theme={props.theme}
            selectedView={props.selectedView}
            setSelectedWidgets={props.setSelectedWidgets}
            themeType={props.themeType}
            toolbarHeight={props.toolbarHeight}
        />
        {settingsDialog ? <Settings
            onClose={() => setSettingsDialog(false)}
            adapterName={props.adapterName}
            instance={props.instance}
            projectName={props.projectName}
            changeProject={props.changeProject}
            socket={props.socket}
        /> : null}
        {props.projectsDialog ? <ProjectsManager
            open={!0}
            onClose={() => props.setProjectsDialog(false)}
            adapterName={props.adapterName}
            instance={props.instance}
            addProject={props.addProject}
            changeProject={props.changeProject}
            deleteProject={props.deleteProject}
            loadProject={props.loadProject}
            projectName={props.projectName}
            projects={props.projects}
            refreshProjects={props.refreshProjects}
            renameProject={props.renameProject}
            selectedView={props.selectedView}
            socket={props.socket}
            themeType={props.themeType}
            theme={props.theme}
        /> : null}
        {
            objectsDialog ? <SelectID
                imagePrefix="../"
                onClose={() => setObjectsDialog(false)}
                socket={props.socket as any as Connection}
                title={I18n.t('Browse objects')}
                columns={['role', 'func', 'val', 'name']}
                notEditable={false}
                theme={props.theme}
                onOk={_selected => {
                    const selected: string = Array.isArray(_selected) ? _selected[0] : _selected as string;
                    Utils.copyToClipboard(selected);
                    setObjectsDialog(false);
                    window.alert(I18n.t('Copied'));
                }}
                ok={I18n.t('Copy to clipboard')}
                cancel={I18n.t('ra_Close')}
            /> : null
        }
        {
            filesDialog ? <SelectFileDialog
                title={I18n.t('Browse files')}
                onClose={() => setFilesDialog(false)}
                restrictToFolder={`${props.adapterName}.${props.instance}/${props.projectName}`}
                allowNonRestricted
                allowUpload
                allowDownload
                allowCreateFolder
                allowDelete
                allowView
                showToolbar
                theme={props.theme}
                imagePrefix="../"
                selected=""
                showTypeSelector
                onOk={_selected => {
                    let selected: string = Array.isArray(_selected) ? _selected[0] : _selected as string;

                    const projectPrefix = `${props.adapterName}.${props.instance}/${props.projectName}/`;
                    if (selected.startsWith(projectPrefix)) {
                        selected = `_PRJ_NAME/${selected.substring(projectPrefix.length)}`;
                    } else if (selected.startsWith('/')) {
                        selected = `..${selected}`;
                    } else if (!selected.startsWith('.')) {
                        selected = `../${selected}`;
                    }
                    Utils.copyToClipboard(selected);
                    setFilesDialog(false);
                    window.alert(I18n.t('ra_Copied %s', selected));
                }}
                socket={props.socket as any as Connection}
                ok={I18n.t('Copy to clipboard')}
                cancel={I18n.t('ra_Close')}
            /> : null
        }
    </>;
};

export default Tools;
