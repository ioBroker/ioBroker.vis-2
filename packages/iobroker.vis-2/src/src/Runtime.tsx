import React from 'react';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';

import {
    DialogContent,
    DialogTitle,
    LinearProgress,
    Snackbar,
    ListItemButton,
    Dialog,
    ListItemText,
    MenuList,
    Paper,
    DialogActions,
    TextField,
    Button,
    ListItemIcon,
} from '@mui/material';

import { Add as IconAdd, Close as IconClose, FileCopy as IconDocument } from '@mui/icons-material';
import { BiImport } from 'react-icons/bi';

import {
    I18n,
    Loader,
    LegacyConnection,
    LoaderMV,
    LoaderPT,
    LoaderVendor,
    GenericApp,
    type GenericAppProps,
    type GenericAppState,
    type ThemeName,
    Utils,
} from '@iobroker/adapter-react-v5';

import type {
    AnyWidgetId,
    GroupWidgetId,
    Project,
    SingleWidgetId,
    ViewSettings,
    VisTheme,
    WidgetData,
    WidgetStyle,
} from '@iobroker/types-vis-2';
import VisEngine from './Vis/visEngine';
import { extractBinding, findWidgetUsages, readFile } from './Vis/visUtils';
import { registerWidgetsLoadIndicator } from './Vis/visLoadWidgets';
import VisWidgetsCatalog from './Vis/visWidgetsCatalog';

import { store, updateActiveUser, updateProject } from './Store';
import createTheme from './theme';
import { hasProjectAccess, hasViewAccess } from './Utils/utils';

import enLang from './i18n/en.json';
import deLang from './i18n/de.json';
import ruLang from './i18n/ru.json';
import ptLang from './i18n/pt.json';
import nlLang from './i18n/nl.json';
import frLang from './i18n/fr.json';
import itLang from './i18n/it.json';
import esLang from './i18n/es.json';
import plLang from './i18n/pl.json';
import ukLang from './i18n/uk.json';
import zhLang from './i18n/zh-cn.json';

const styles: { editModeComponentStyle: React.CSSProperties } = {
    editModeComponentStyle: {
        zIndex: 1002,
    },
};

export interface RuntimeProps extends GenericAppProps {
    runtime?: boolean;
    setBackground: () => void;
}

export interface RuntimeState extends GenericAppState {
    theme: VisTheme;
    alert: boolean;
    alertType: 'info' | 'warning' | 'error' | 'success';
    alertMessage: string;
    runtime: boolean;
    projectName: string;
    selectedWidgets: AnyWidgetId[];
    editMode: boolean;
    widgetsLoaded: number;
    fonts: string[];
    visCommonCss: string | null;
    visUserCss: string | null;
    showProjectsDialog: boolean;
    showNewProjectDialog: boolean;
    showImportDialogDialog: boolean;
    newProjectName: string;
    projects: string[] | null;
    projectDoesNotExist: boolean;
    showProjectUpdateDialog: boolean;
    history: Project[];
    historyCursor: number;
    selectedView: string;
    createFirstProjectDialog: boolean;
    messageDialog: {
        text: string | React.JSX.Element;
        title: string;
        ok: string;
        callback: () => void;
        noClose?: boolean;
    } | null;
    currentUser: ioBroker.UserObject;
    userGroups: Record<ioBroker.ObjectIDs.Group, ioBroker.GroupObject>;
    splitSizes: [number, number, number];
    alignType: 'width' | 'height';
    alignIndex: number;
    alignValues: number[];
    selectedGroup: GroupWidgetId | null;
    projectsDialog: boolean;
    showImportDialog: boolean;
    lockDragging: boolean;
    disableInteraction: boolean;
    widgetHint: 'light' | 'dark' | 'hide';
    ignoreMouseEvents: boolean;
    confirmDialog: {
        message: string;
        title: string;
        callback: (isYes: boolean) => void;
    };
    showCodeDialog: {
        code: string;
        title: string;
        mode: string;
    };
}

declare global {
    interface Window {
        sentryDSN?: string;
        disableDataReporting?: boolean;
        visAdapterInstance?: number;
    }
}

class Runtime<P extends RuntimeProps = RuntimeProps, S extends RuntimeState = RuntimeState> extends GenericApp<P, S> {
    static WIDGETS_LOADING_STEP_NOT_STARTED = 0;

    static WIDGETS_LOADING_STEP_HTML_LOADED = 1;

    static WIDGETS_LOADING_STEP_ALL_LOADED = 2;

    alert: typeof window.alert;

    adapterId: string;

    checkTimeout: ReturnType<typeof setTimeout> | null;

    resolutionTimer: ReturnType<typeof setTimeout> | null;

    lastProjectJSONfile: string;

    subscribedProject: string;

    changeTimer: ReturnType<typeof setTimeout> | null;

    needRestart: boolean;

    lastUploadedState: ioBroker.StateValue;

    protected checkForUpdates?: () => Promise<void>;

    protected getNewWidgetId?: (project: Project) => SingleWidgetId;

    protected getNewGroupId?: (project: Project) => GroupWidgetId;

    protected changeProject?: (project: Project, ignoreHistory?: boolean) => Promise<void>;

    protected renderImportProjectDialog?(): React.JSX.Element;

    protected setSelectedWidgets: (
        selectedWidgets: AnyWidgetId[],
        selectedView?: string | (() => void),
        cb?: () => void,
    ) => Promise<void>;

    protected setSelectedGroup?: (selectedGroup: GroupWidgetId) => void;

    protected onWidgetsChanged?: (
        changedData: {
            wid: AnyWidgetId;
            view: string;
            style: WidgetStyle;
            data: WidgetData;
        }[],
        view: string,
        viewSettings: ViewSettings,
    ) => void;

    protected onFontsUpdate?(fonts: string[]): void;

    protected registerCallback?: (name: string, view: string, cb: () => void) => void;

    protected onIgnoreMouseEvents?: (ignore: boolean) => void;

    // eslint-disable-next-line no-shadow
    protected askAboutInclude?: (
        wid: AnyWidgetId,
        toWid: AnyWidgetId,
        cb: (wid: AnyWidgetId, toWid: AnyWidgetId) => void,
    ) => void;

    protected showConfirmDialog?(dialog: {
        message: string;
        title: string;
        icon: string;
        width: number;
        callback: (isYes: boolean) => void;
    }): void;

    protected showCodeDialog?(dialog: { code: string; title: string; mode: string }): void;

    protected showLegacyFileSelector?: (
        callback: (data: { path: string; file: string }, userArg: any) => void,
        options: {
            path?: string;
            userArg?: any;
        },
    ) => void;

    protected initState?: (newState: Partial<S | RuntimeState>) => void;

    protected setLoadingText?: (text: string) => void;

    constructor(props: P) {
        const extendedProps = { ...props };
        extendedProps.translations = {
            en: enLang,
            de: deLang,
            ru: ruLang,
            pt: ptLang,
            nl: nlLang,
            fr: frLang,
            it: itLang,
            es: esLang,
            pl: plLang,
            uk: ukLang,
            'zh-cn': zhLang,
        };

        extendedProps.Connection = LegacyConnection as unknown as LegacyConnection;
        if (!window.disableDataReporting) {
            extendedProps.sentryDSN = window.sentryDSN;
        }

        if (window.location.port === '3000') {
            extendedProps.socket = {
                port: '8082',
                // host: '192.168.178.45',
            };
        }
        if (window.socketUrl && window.socketUrl.startsWith(':')) {
            window.socketUrl = `${window.location.protocol}//${window.location.hostname}${window.socketUrl}`;
        }

        // for projects starting with numbers, adapter-react extracts the wrong instance number, as we have no instance in url explicitly
        extendedProps.instance = window.visAdapterInstance;

        super(props, extendedProps);

        // do not control this state
        this.socket.setStateToIgnore('nothing_selected');

        this.alert = window.alert;

        window.alert = message => {
            if (message && message.toString().toLowerCase().includes('error')) {
                console.error(message);
                this.showAlert(message.toString(), 'error');
            } else {
                console.log(message);
                this.showAlert(message.toString(), 'info');
            }
        };

        this.adapterId = `${this.adapterName}.0`;

        // temporary disable translation warnings
        // I18n.disableWarning(true);
        registerWidgetsLoadIndicator(this.setWidgetsLoadingProgress);
    }

    // eslint-disable-next-line class-methods-use-this
    createTheme(name?: ThemeName | null): VisTheme {
        return createTheme(Utils.getThemeName(name));
    }

    setWidgetsLoadingProgress: (step: number, total: number) => void;

    setStateAsync(newState: Partial<RuntimeState | S>): Promise<void> {
        return new Promise(resolve => {
            this.setState(newState as RuntimeState, () => resolve());
        });
    }

    componentDidMount(): void {
        super.componentDidMount();

        const newState: Partial<RuntimeState> = {
            alert: false,
            alertType: 'info',
            alertMessage: '',
            runtime: true,
            projectName: 'main',
            selectedWidgets: [],
            editMode: false,
            widgetsLoaded: Runtime.WIDGETS_LOADING_STEP_NOT_STARTED,
            fonts: [],
            visCommonCss: null,
            visUserCss: null,
            showProjectsDialog: false,
            showNewProjectDialog: false,
            showImportDialogDialog: false,
            newProjectName: '',
            projects: null,
            projectDoesNotExist: false,
        };

        if (this.initState) {
            // get edit states
            this.initState(newState);
        }

        this.setState(newState as S);

        window.addEventListener('hashchange', this.onHashChange, false);

        if (!this.state.runtime) {
            // Listen for resize changes
            window.addEventListener('orientationchange', this.orientationChange, false);
            window.addEventListener('resize', this.orientationChange, false);
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        window.removeEventListener('hashchange', this.onHashChange, false);
        this.checkTimeout && clearTimeout(this.checkTimeout);
        this.checkTimeout = null;

        this.resolutionTimer && clearTimeout(this.resolutionTimer);
        this.resolutionTimer = null;

        if (!this.state.runtime) {
            window.removeEventListener('orientationchange', this.orientationChange, false);
            window.removeEventListener('resize', this.orientationChange, false);
        }
        window.alert = this.alert;
    }

    onHashChange = (): void => {
        const currentPath = VisEngine.getCurrentPath();
        this.changeView(currentPath.view).catch(e => console.error(`Cannot change view: ${e}`));
    };

    onProjectChange = (_id: string, fileName: string): void => {
        if (fileName.endsWith('.json')) {
            this.checkTimeout && clearTimeout(this.checkTimeout);
            // if runtime => just update project
            if (this.state.runtime) {
                this.checkTimeout = setTimeout(() => {
                    this.checkTimeout = null;
                    void this.loadProject(this.state.projectName);
                }, 500);
            } else if (fileName.endsWith(`${this.state.projectName}/vis-views.json`)) {
                // wait a little bit to avoid multiple calls
                this.checkTimeout = setTimeout(() => {
                    this.checkTimeout = null;
                    // compare last executed file with new one
                    void readFile(this.socket as unknown as LegacyConnection, this.adapterId, fileName).then(file => {
                        try {
                            const ts = (JSON.parse((file as any).file || file) as Project).___settings.ts;
                            if (ts === store.getState().visProject.___settings.ts) {
                                return;
                            }
                            const tsInt = parseInt(ts.split('.')[0], 10);
                            if (tsInt < parseInt(store.getState().visProject.___settings.ts.split('.')[0], 10)) {
                                // ignore older files
                                return;
                            }
                        } catch (e) {
                            console.warn(`Cannot parse project file "${fileName}": ${e}`);
                        }

                        this.setState({ showProjectUpdateDialog: true });
                    });
                }, 500);
            }
        }
    };

    fixProject(project: Project): void {
        project.___settings = project.___settings || ({} as Project['___settings']);
        project.___settings.folders = project.___settings.folders || [];
        project.___settings.openedViews = project.___settings.openedViews || [];

        // fix project
        Object.keys(project).forEach(view => {
            if (view === '___settings') {
                // rename all "set" to "widgetSet" in marketplace
                project.___settings.marketplace?.forEach(group => {
                    group.widget?.forEach(widget => {
                        if (widget.set) {
                            widget.widgetSet = widget.set;
                            delete widget.set;
                        }
                    });
                });

                return;
            }
            if (!project[view]) {
                delete project[view];
                return;
            }
            project[view].settings = project[view].settings || {};
            project[view].settings.style = project[view].settings.style || {};
            project[view].widgets = project[view].widgets || {};
            if (project[view].widgets) {
                Object.keys(project[view].widgets).forEach((wid: AnyWidgetId) => {
                    const widget = project[view].widgets[wid];
                    if (!widget) {
                        delete project[view].widgets[wid];
                        return;
                    }
                    widget.data = widget.data || {};
                    widget.style = widget.style || {};

                    if (widget.data.members && !Array.isArray(widget.data.members)) {
                        widget.data.members = [];
                    }

                    // delete box-sizing as it is always 'border-box' now
                    delete widget.style['box-sizing'];

                    // collect all attributes with bindings
                    if (!widget.data.bindings && !Array.isArray(widget.data.bindings)) {
                        widget.data.bindings = [];
                        Object.keys(widget.data).forEach(attr => {
                            if (
                                attr === 'bindings' ||
                                !widget.data[attr] ||
                                attr.startsWith('g_') ||
                                typeof widget.data[attr] !== 'string'
                            ) {
                                return;
                            }

                            // Process bindings in data attributes
                            const OIDs = extractBinding(widget.data[attr]);
                            if (OIDs) {
                                widget.data.bindings.push(attr);
                            }
                        });
                    }
                    if (!widget.style.bindings && !Array.isArray(widget.style.bindings)) {
                        widget.style.bindings = [];
                        Object.keys(widget.style).forEach((attr: keyof typeof widget.style) => {
                            if (
                                attr === 'bindings' ||
                                !widget.style[attr] ||
                                attr.startsWith('g_') ||
                                typeof widget.data[attr] !== 'string'
                            ) {
                                return;
                            }

                            // Process bindings in data attributes
                            const OIDs = extractBinding(widget.style[attr].toString());
                            if (OIDs) {
                                widget.style.bindings.push(attr);
                            }
                        });
                    }

                    if (widget.data.members) {
                        widget.data.members.forEach(
                            (_wid, i) => (widget.data.members[i] = _wid.replace(/\s/g, '_') as AnyWidgetId),
                        );
                    }

                    if (wid.includes(' ')) {
                        const newWid: SingleWidgetId = wid.replace(/\s/g, '_') as SingleWidgetId;
                        delete project[view].widgets[wid];
                        project[view].widgets[newWid] = widget;
                    }

                    if (!this.state.runtime && this.getNewWidgetId) {
                        // If the widget is not unique, change its name (only in editor mode)
                        if (
                            Object.keys(project).find(v => v !== view && project[v].widgets && project[v].widgets[wid])
                        ) {
                            const _newWid: AnyWidgetId =
                                wid[0] === 'g' ? this.getNewGroupId(project) : this.getNewWidgetId(project);
                            console.log(`Rename widget ${wid} to ${_newWid}`);
                            delete project[view].widgets[wid];
                            project[view].widgets[_newWid as SingleWidgetId] = widget;
                        }
                    }

                    // fix Groups
                    if (widget.tpl === '_tplGroup' && widget.data.attrCount !== undefined) {
                        widget.data.members = widget.data.members || [];
                        // replace attrNameX with attrName_groupAttrX and attrTypeX with attrType_groupAttrX
                        for (let i = 1; i <= widget.data.attrCount; i++) {
                            const attrName = widget.data[`attrName${i}`];
                            const attrType = widget.data[`attrType${i}`];
                            widget.data[`attrName_groupAttr${i}`] = attrName || `groupAttr${i}`;
                            widget.data[`attrType_groupAttr${i}`] = attrType || '';
                            delete widget.data[`attrName${i}`];
                            delete widget.data[`attrType${i}`];
                        }
                        delete widget.data.attrCount;
                    }
                });
            }
        });
    }

    static syncMultipleWidgets(project: Project): void {
        project = project || store.getState().visProject;
        Object.keys(project).forEach(view => {
            if (view === '___settings') {
                return;
            }

            const oView = project[view];
            const widgetIDs: AnyWidgetId[] = Object.keys(oView.widgets) as AnyWidgetId[];
            widgetIDs.forEach(widgetId => {
                const oWidget = oView.widgets[widgetId];
                // if widget must be shown in more than one view
                if (oWidget.data && oWidget.data['multi-views']) {
                    const views: string[] = oWidget.data['multi-views'].split(',');
                    views.forEach(viewId => {
                        if (viewId !== view && project[viewId]) {
                            // copy all widgets, that must be shown in this view too
                            project[viewId].widgets[`${view}_${widgetId}` as AnyWidgetId] = JSON.parse(
                                JSON.stringify(oWidget),
                            );
                            delete project[viewId].widgets[`${view}_${widgetId}` as AnyWidgetId].data['multi-views'];
                            if (oWidget.tpl === '_tplGroup' && oWidget.data.members?.length) {
                                // copy all group widgets too
                                const newWidget = project[viewId].widgets[`${view}_${widgetId}` as AnyWidgetId];
                                newWidget.data.members.forEach((memberId, i) => {
                                    const newId: AnyWidgetId = `${view}_${memberId}` as AnyWidgetId;
                                    project[viewId].widgets[newId] = JSON.parse(
                                        JSON.stringify(oView.widgets[memberId]),
                                    );
                                    delete project[viewId].widgets[newId].data['multi-views']; // do not allow multi-multi-views
                                    newWidget.data.members[i] = newId;
                                    // do not copy members of multi-group
                                    if (project[viewId].widgets[newId].data.members) {
                                        project[viewId].widgets[newId].data.members = [];
                                    }
                                });
                            }
                        }
                    });
                }

                // try to find this widget in other widgets under "widget" or "widgetX" name
                if (findWidgetUsages(project, view, widgetId).length) {
                    oWidget.usedInWidget = true;
                } else if (oWidget.usedInWidget) {
                    delete oWidget.usedInWidget;
                }
            });
        });
    }

    static findViewWithNearestResolution(project: Project, resultRequired?: boolean): string {
        const w = window.innerWidth;
        const h = window.innerHeight;

        let result = null;
        const views: string[] = [];
        let difference = 10000;

        // First, find all with the best fitting width
        project &&
            Object.keys(project).forEach(view => {
                if (view === '___settings') {
                    return;
                }
                if (
                    project[view].settings?.useAsDefault &&
                    // If difference less than 20%
                    Math.abs(project[view].settings.sizex - w) / project[view].settings.sizex < 0.2
                ) {
                    views.push(view);
                }
            });

        for (let i = 0; i < views.length; i++) {
            if (Math.abs(project[views[i]].settings.sizey - h) < difference) {
                result = views[i];
                difference = Math.abs(parseInt(project[views[i]].settings.sizey.toString(), 10) - h);
            }
        }

        // try to find by ratio
        if (!result) {
            const ratio = w / h;
            difference = 10000;

            project &&
                Object.keys(project).forEach(view => {
                    if (view === '___settings') {
                        return;
                    }
                    if (
                        project[view].settings?.useAsDefault &&
                        // If difference less than 20%
                        parseInt(project[view].settings.sizey.toString(), 10) &&
                        Math.abs(
                            ratio -
                                parseInt(project[view].settings.sizex.toString(), 10) /
                                    parseInt(project[view].settings.sizey.toString(), 10),
                        ) < difference
                    ) {
                        result = view;
                        difference = Math.abs(
                            ratio -
                                parseInt(project[view].settings.sizex.toString(), 10) /
                                    parseInt(project[view].settings.sizey.toString(), 10),
                        );
                    }
                });
        }
        if (!result && resultRequired) {
            result =
                project &&
                Object.keys(project).find(view => !view.startsWith('__') && project[view].settings?.useAsDefault);
        }
        if (!result && resultRequired) {
            return (project && Object.keys(project).find(view => !view.startsWith('__'))) || '';
        }

        return result;
    }

    loadProject = async (projectName: string): Promise<void> => {
        let fileStr: string;
        this.setLoadingText && this.setLoadingText('Load project file...');
        try {
            const file: string | { file: string; mimeType: string } = await readFile(
                this.socket as unknown as LegacyConnection,
                this.adapterId,
                `${projectName}/vis-views.json`,
            );
            if (typeof file === 'object') {
                fileStr = file.file;
            } else {
                fileStr = file;
            }
        } catch (err) {
            console.warn(`Cannot read project file "${projectName}/vis-views.json": ${err}`);
            fileStr = '{}';
        }
        this.setLoadingText && this.setLoadingText(null);

        if (!fileStr || fileStr === '{}') {
            // read if show projects dialog allowed
            const obj = await this.socket.getObject(`system.adapter.${this.adapterName}.${this.instance}`);
            if (this.state.runtime && obj.native.doNotShowProjectDialog) {
                this.setState({ projectDoesNotExist: true });
            } else {
                !this.state.projects && (await this.refreshProjects());
                // show project dialog
                this.setState({ showProjectsDialog: true });
            }
            return;
        }

        fileStr = fileStr.toString();

        if (!this.state.runtime) {
            // remember the last loaded project file
            this.lastProjectJSONfile = fileStr;
        }

        let project: Project;
        try {
            project = JSON.parse(fileStr);
        } catch {
            window.alert('Cannot parse project file!');
            project = {
                'Cannot parse project file!': {
                    widgets: {},
                },
            } as unknown as Project;
        }

        this.fixProject(project);

        // take selected view from hash
        const currentPath = VisEngine.getCurrentPath();
        let selectedView = currentPath.view;
        if (!selectedView || !project[selectedView]) {
            if (this.state.runtime) {
                selectedView = Runtime.findViewWithNearestResolution(project, true);
            } else {
                // take from local storage
                if (Object.keys(project).includes(window.localStorage.getItem('selectedView'))) {
                    selectedView = window.localStorage.getItem('selectedView');
                }
                // take first view
                if (!selectedView || !project[selectedView]) {
                    selectedView = Object.keys(project).find(view => !view.startsWith('__')) || '';
                }
            }
        }

        const len = project.___settings.openedViews.length;

        for (let i = len - 1; i >= 0; i--) {
            if (!project[project.___settings.openedViews[i]]) {
                project.___settings.openedViews.splice(i, 1);
            }
        }

        if (!project.___settings.openedViews.length) {
            const view = Object.keys(project).find(_view => _view !== '___settings');
            if (view) {
                project.___settings.openedViews[0] = view;
            }
        }

        // check that selectedView and openedViews exist
        if (!project[selectedView]) {
            selectedView = project.___settings.openedViews[0] || '';
            window.localStorage.setItem('selectedView', selectedView);
        } else if (
            project.___settings.openedViews &&
            !project.___settings.openedViews.includes(selectedView) &&
            !this.state.runtime
        ) {
            selectedView = project.___settings.openedViews[0];
            window.localStorage.setItem('selectedView', selectedView);
        }

        window.localStorage.setItem('projectName', projectName);

        if (
            this.subscribedProject &&
            (this.subscribedProject !== projectName || project.___settings.reloadOnEdit === false)
        ) {
            this.subscribedProject = null;
            this.socket.unsubscribeFiles(this.adapterId, `${this.subscribedProject}/*`, this.onProjectChange);
        }

        // copy multi-views to corresponding views
        Runtime.syncMultipleWidgets(project);

        if (this.state.runtime) {
            if (project.___settings.reloadOnEdit !== false) {
                this.subscribedProject = projectName;
                // subscribe on changes
                await this.socket.subscribeFiles(this.adapterId, `${projectName}/*`, this.onProjectChange);
            }

            // set overflow mode in runtime mode
            window.document.body.style.overflow = project.___settings?.bodyOverflow || 'auto';
        } else {
            this.subscribedProject = projectName;
            // subscribe on changes
            await this.socket.subscribeFiles(this.adapterId, `${projectName}/*`, this.onProjectChange);
        }

        store.dispatch(updateProject(project));

        await this.setStateAsync({
            visCommonCss: null,
            visUserCss: null,
            history: [project],
            historyCursor: 0,
            projectName,
        });

        await this.changeView(selectedView);

        // only in edit mode and only after VisMarketplace was loaded
        if (!this.state.runtime && this.checkForUpdates) {
            // check if some marketplace widgets were updated
            await this.checkForUpdates();
        }
    };

    orientationChange = (): void => {
        if (this.resolutionTimer) {
            clearTimeout(this.resolutionTimer);
        }
        this.resolutionTimer = setTimeout(async () => {
            this.resolutionTimer = null;
            const view = Runtime.findViewWithNearestResolution(store.getState().visProject);
            if (view && view !== this.state.selectedView) {
                await this.changeView(view);
            }
        }, 200);
    };

    // this function is required here if the project not defined
    refreshProjects = async (reloadCurrentProject?: boolean): Promise<void> => {
        let projects: ioBroker.ReadDirResult[];

        try {
            projects = await this.socket.readDir(this.adapterId, '');
        } catch {
            projects = [];
        }

        await this.setStateAsync({
            projects: projects.filter(dir => dir.isDir).map(dir => dir.file),
            createFirstProjectDialog: !projects.length,
        });
        if (reloadCurrentProject) {
            await this.loadProject(this.state.projectName);
        }
    };

    onVisChanged(): void {
        this.setState({
            messageDialog: {
                text: I18n.t('Detected new version of vis files. Reloading in 2 seconds...'),
                title: I18n.t('Reloading'),
                ok: I18n.t('Reload now'),
                callback: () => {
                    if (!this.state.runtime && this.changeTimer) {
                        this.needRestart = true;
                    } else {
                        setTimeout(() => window.location.reload(), 2000);
                    }
                },
            },
        });
        if (!this.state.runtime && this.changeTimer) {
            this.needRestart = true;
        } else {
            setTimeout(() => window.location.reload(), 2000);
        }
    }

    onWidgetSetsChanged = (id: string, state: ioBroker.State): void => {
        if (state && this.lastUploadedState && state.val !== this.lastUploadedState) {
            this.lastUploadedState = state.val;
            this.onVisChanged();
        }
    };

    async onConnectionReady(): Promise<void> {
        // preload all widgets first
        if (this.state.widgetsLoaded === Runtime.WIDGETS_LOADING_STEP_HTML_LOADED) {
            await VisWidgetsCatalog.collectRxInformation(
                this.socket as unknown as LegacyConnection,
                store.getState().visProject,
                this.changeProject,
            );
            await this.setStateAsync({ widgetsLoaded: Runtime.WIDGETS_LOADING_STEP_ALL_LOADED });
        }

        const userName = await this.socket.getCurrentUser(); // just name, like "admin"

        const currentUser = await this.socket.getObject(`system.user.${userName || 'admin'}`);

        store.dispatch(updateActiveUser(currentUser.common.name));

        const groups = await this.socket.getGroups();
        const userGroups: Record<ioBroker.ObjectIDs.Group, ioBroker.GroupObject> = {};
        groups.forEach(group => (userGroups[group._id] = group));

        await this.setStateAsync({
            currentUser,
            userGroups,
            selectedView: '',
            splitSizes: window.localStorage.getItem('Vis.splitSizes')
                ? JSON.parse(window.localStorage.getItem('Vis.splitSizes'))
                : [20, 60, 20],
        });

        // subscribe on info.uploaded
        await this.socket.subscribeState(
            `${this.adapterName}.${this.instance}.info.uploaded`,
            this.onWidgetSetsChanged,
        );

        const uploadedState = await this.socket.getState(`${this.adapterName}.${this.instance}.info.uploaded`);
        if (uploadedState && uploadedState.val !== this.lastUploadedState) {
            if (this.lastUploadedState) {
                this.onVisChanged();
            } else {
                this.lastUploadedState = uploadedState.val;
            }
        }

        // read project name from URL
        let projectName = window.location.search.replace('?', '');
        if (projectName) {
            projectName = decodeURIComponent(projectName.split('&')[0]).split('/')[0];
            if (projectName.includes('=')) {
                projectName = '';
            }
        }
        projectName = projectName || window.localStorage.getItem('projectName') || 'main';

        let projects = this.state.projects;
        if (!this.state.runtime) {
            await this.refreshProjects();
            projects = null;
        }

        if (!projects || projects.includes(projectName)) {
            await this.loadProject(projectName);
        } else {
            // read if show projects dialog allowed
            const obj =
                this.state.runtime &&
                (await this.socket.getObject(`system.adapter.${this.adapterName}.${this.instance}`));
            if (this.state.runtime && obj.native.doNotShowProjectDialog) {
                this.setState({ projectDoesNotExist: true });
            } else {
                !projects && (await this.refreshProjects());
                // show project dialog
                this.setState({ showProjectsDialog: true });
            }
        }
    }

    changeView = async (selectedView: string): Promise<void> => {
        if (selectedView === this.state.selectedView) {
            // inform about inView navigation
            if (this.state.runtime || !this.state.editMode) {
                const currentPath = VisEngine.getCurrentPath();
                const newHash = VisEngine.buildPath(currentPath.view, currentPath.path);
                window.vis.lastChangedView = this.state.projectName
                    ? `${this.state.projectName}/${newHash.replace(/^#/, '')}`
                    : newHash.replace(/^#/, '');
                window.vis.conn.sendCommand(window.vis.instance, 'changedView', window.vis.lastChangedView);
            }
            return;
        }
        const newState: Partial<RuntimeState> = {
            selectedView,
        };

        let selectedWidgets: AnyWidgetId[] =
            JSON.parse(window.localStorage.getItem(`${this.state.projectName}.${selectedView}.widgets`) || '[]') || [];

        // Check that all selectedWidgets exist
        for (let i = selectedWidgets.length - 1; i >= 0; i--) {
            if (
                !store.getState().visProject[selectedView] ||
                !store.getState().visProject[selectedView].widgets ||
                !store.getState().visProject[selectedView].widgets[selectedWidgets[i]]
            ) {
                selectedWidgets = selectedWidgets.splice(i, 1);
            }
        }
        if (JSON.stringify(newState.selectedWidgets) !== JSON.stringify(selectedWidgets)) {
            newState.selectedWidgets = selectedWidgets;
        }
        if (newState.alignType !== null) {
            newState.alignType = null;
        }
        if (newState.alignIndex !== 0) {
            newState.alignIndex = 0;
        }
        if (newState.alignValues?.length > 0) {
            newState.alignValues = [];
        }

        if (!this.state.runtime && !store.getState().visProject.___settings.openedViews.includes(selectedView)) {
            const project = JSON.parse(JSON.stringify(store.getState().visProject));
            project.___settings.openedViews.push(selectedView);
            await this.changeProject(project, true);
        }

        if ((this.state.runtime || !this.state.editMode) && window.vis) {
            const currentPath = VisEngine.getCurrentPath();
            const newHash = VisEngine.buildPath(currentPath.view, currentPath.path);

            window.vis.lastChangedView = this.state.projectName
                ? `${this.state.projectName}/${newHash.replace(/^#/, '')}`
                : newHash.replace(/^#/, '');
            window.vis.conn.sendCommand(window.vis.instance, 'changedView', window.vis.lastChangedView);

            // inform the legacy widgets
            window.jQuery && (window.jQuery as any)(window).trigger('viewChanged', selectedView);
        }

        // disable group edit if view changed
        if (this.state.selectedGroup) {
            newState.selectedGroup = null;
        }

        window.localStorage.setItem('selectedView', selectedView);

        const currentPath = VisEngine.getCurrentPath();
        const newPath = VisEngine.buildPath(selectedView, currentPath.path);

        if (window.location.hash !== newPath) {
            window.location.hash = newPath;
        }

        await this.setStateAsync(newState);
    };

    showAlert(message: string, type: 'error' | 'warning' | 'info' | 'success'): void {
        if (type !== 'error' && type !== 'warning' && type !== 'info' && type !== 'success') {
            type = 'info';
        }

        this.setState({
            alert: true,
            alertType: type,
            alertMessage: message,
        });
    }

    renderAlertDialog = (): React.JSX.Element => (
        <Snackbar
            key="__snackbar_134__"
            style={
                this.state.alertType === 'error'
                    ? { backgroundColor: '#f44336' }
                    : this.state.alertType === 'success'
                      ? { backgroundColor: '#4caf50' }
                      : undefined
            }
            open={this.state.alert}
            autoHideDuration={6000}
            onClick={() => this.setState({ alert: false })}
            onClose={(e, reason) => {
                if (reason === 'clickaway') {
                    return;
                }
                this.setState({ alert: false });
            }}
            message={this.state.alertMessage}
        />
    );

    async onWidgetsLoaded(): Promise<void> {
        let widgetsLoaded = Runtime.WIDGETS_LOADING_STEP_HTML_LOADED;
        if (this.socket.isConnected()) {
            await VisWidgetsCatalog.collectRxInformation(
                this.socket as unknown as LegacyConnection,
                store.getState().visProject,
                this.changeProject,
            );
            widgetsLoaded = Runtime.WIDGETS_LOADING_STEP_ALL_LOADED;
        }
        this.setState({ widgetsLoaded });
    }

    addProject = async (projectName: string, doNotLoad?: boolean): Promise<void> => {
        try {
            const project: Project = {
                ___settings: {
                    folders: [],
                    openedViews: [],
                },
                default: {
                    name: 'Default',
                    settings: {
                        style: {},
                    },
                    widgets: {},
                    activeWidgets: {},
                },
            } as unknown as Project;
            await this.socket.writeFile64(this.adapterId, `${projectName}/vis-views.json`, JSON.stringify(project));
            await this.socket.writeFile64(this.adapterId, `${projectName}/vis-user.css`, '');
            if (!doNotLoad) {
                await this.refreshProjects();
                await this.loadProject(projectName);
                // close dialog
                this.setState({ projectsDialog: false });
            }
        } catch (e) {
            window.alert(`Cannot create project: ${e.toString()}`);
        }
    };

    showCreateNewProjectDialog(): React.JSX.Element | null {
        if (!this.state.showNewProjectDialog) {
            return null;
        }
        return (
            <Dialog
                open={!0}
                onClose={() => this.setState({ showNewProjectDialog: false })}
            >
                <DialogTitle>{I18n.t('Create new project')}</DialogTitle>
                <DialogContent>
                    <TextField
                        variant="standard"
                        label={I18n.t('Project name')}
                        autoFocus
                        fullWidth
                        onKeyDown={async e => {
                            if (
                                e.key === 'Enter' &&
                                this.state.newProjectName &&
                                !this.state.projects.includes(this.state.newProjectName)
                            ) {
                                await this.addProject(this.state.newProjectName);
                                window.location.href = `edit.html?${this.state.newProjectName}`;
                            }
                        }}
                        value={this.state.newProjectName}
                        onChange={e => this.setState({ newProjectName: e.target.value })}
                        margin="dense"
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        id="create_new_project_ok_buton"
                        variant="contained"
                        // default
                        color="primary"
                        disabled={!this.state.newProjectName || this.state.projects.includes(this.state.newProjectName)}
                        onClick={async () => {
                            await this.addProject(this.state.newProjectName, true);
                            window.location.href = `edit.html?${this.state.newProjectName}`;
                        }}
                        startIcon={<IconAdd />}
                    >
                        {I18n.t('Create')}
                    </Button>
                    <Button
                        variant="contained"
                        // default
                        color="grey"
                        onClick={() => this.setState({ showNewProjectDialog: false })}
                        startIcon={<IconClose />}
                    >
                        {I18n.t('Cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    showSmallProjectsDialog(): React.JSX.Element {
        return (
            <Dialog
                open={!0}
                maxWidth="sm"
                onClose={() => {
                    /* do nothing */
                }}
            >
                <DialogTitle>
                    <img
                        src={this.props.runtime ? './favicon.ico' : './faviconEdit.ico'}
                        alt="vis-2"
                        style={{ width: 24, marginRight: 10, marginTop: 4 }}
                    />
                    {!this.state.projects.length
                        ? I18n.t('Create or import new "vis-2" project')
                        : I18n.t('Select vis-2 project')}
                </DialogTitle>
                <DialogContent>
                    {!this.state.projects ? (
                        <LinearProgress />
                    ) : (
                        <Paper>
                            {!this.state.projects.length ? (
                                <div style={{ width: '100%', fontSize: 20, padding: 10 }}>
                                    {I18n.t('welcome_message')}
                                </div>
                            ) : null}
                            <MenuList>
                                {this.state.projects.map(project => (
                                    <ListItemButton
                                        key={project}
                                        onClick={() => (window.location.href = `?${project}`)}
                                    >
                                        <ListItemIcon>
                                            <IconDocument />
                                        </ListItemIcon>
                                        <ListItemText>{project}</ListItemText>
                                    </ListItemButton>
                                ))}
                                <ListItemButton
                                    id="create_new_project"
                                    onClick={() =>
                                        this.setState({
                                            showNewProjectDialog: true,
                                            newProjectName: this.state.projects.length ? '' : 'main',
                                        })
                                    }
                                    style={{ backgroundColor: '#112233', color: '#ffffff' }}
                                >
                                    <ListItemIcon>
                                        <IconAdd />
                                    </ListItemIcon>
                                    <ListItemText>{I18n.t('Create new project')}</ListItemText>
                                </ListItemButton>
                                {this.renderImportProjectDialog ? (
                                    <ListItemButton
                                        onClick={() => this.setState({ showImportDialog: true })}
                                        style={{ backgroundColor: '#112233', color: '#4b9ed3' }}
                                    >
                                        <ListItemIcon>
                                            <BiImport fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText>{I18n.t('Import project')}</ListItemText>
                                    </ListItemButton>
                                ) : null}
                            </MenuList>
                        </Paper>
                    )}
                </DialogContent>
                {this.showCreateNewProjectDialog()}
                {this.renderImportProjectDialog ? this.renderImportProjectDialog() : null}
                {this.renderAlertDialog()}
            </Dialog>
        );
    }

    renderProjectDoesNotExist(): React.JSX.Element {
        return (
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 36,
                    color: '#982828',
                }}
            >
                {I18n.t('Project "%s" does not exist', this.state.projectName)}
            </div>
        );
    }

    getVisEngine(): React.JSX.Element {
        if (!this.state.runtime && this.state.projectDoesNotExist) {
            return this.renderProjectDoesNotExist();
        }

        if (!this.state.runtime && this.state.showProjectsDialog) {
            return this.showSmallProjectsDialog();
        }

        const { visProject, activeUser } = store.getState();

        if (
            !hasProjectAccess({
                editMode: this.state.editMode,
                project: visProject,
                user: activeUser,
            }) ||
            !hasViewAccess({
                editMode: this.state.editMode,
                project: visProject,
                user: activeUser,
                view: this.state.selectedView,
            })
        ) {
            console.warn(
                `User "${activeUser}" has no permissions for ${this.state.editMode ? 'edit mode' : 'runtime'} of project "${this.state.projectName}" with view "${this.state.selectedView}"`,
            );
            if (this.state.projects) {
                return this.showSmallProjectsDialog();
            }

            this.refreshProjects().then(() => {
                this.setState({ showProjectsDialog: true });
            });
            return null;
        }

        return (
            <VisEngine
                key={this.state.projectName}
                widgetsLoaded={this.state.widgetsLoaded}
                activeView={this.state.selectedView || ''}
                editMode={!this.state.runtime && this.state.editMode}
                runtime={this.state.runtime}
                socket={this.socket as unknown as LegacyConnection}
                visCommonCss={this.state.visCommonCss}
                visUserCss={this.state.visUserCss}
                lang={this.socket.systemLang}
                adapterName={this.adapterName}
                instance={this.instance}
                selectedWidgets={this.state.selectedWidgets}
                setSelectedWidgets={this.setSelectedWidgets}
                onLoaded={() => this.onWidgetsLoaded()}
                selectedGroup={this.state.selectedGroup}
                setSelectedGroup={this.setSelectedGroup}
                onWidgetsChanged={this.onWidgetsChanged}
                projectName={this.state.projectName}
                lockDragging={this.state.lockDragging}
                disableInteraction={this.state.disableInteraction}
                widgetHint={this.state.widgetHint}
                onFontsUpdate={this.state.runtime ? null : (fonts: string[]) => this.onFontsUpdate(fonts)}
                registerEditorCallback={this.state.runtime ? null : this.registerCallback}
                themeType={this.state.themeType}
                themeName={this.state.themeName}
                theme={this.state.theme as VisTheme}
                adapterId={this.adapterId}
                editModeComponentStyle={styles.editModeComponentStyle}
                onIgnoreMouseEvents={this.onIgnoreMouseEvents}
                setLoadingText={this.setLoadingText}
                onConfirmDialog={(
                    message: string,
                    title: string,
                    icon: string,
                    width: number,
                    callback: (isYes: boolean) => void,
                ) =>
                    this.showConfirmDialog &&
                    this.showConfirmDialog({
                        message,
                        title,
                        icon,
                        width,
                        callback,
                    })
                }
                onShowCode={(code: string, title: string, mode: string) =>
                    this.showCodeDialog && this.showCodeDialog({ code, title, mode })
                }
                currentUser={this.state.currentUser}
                userGroups={this.state.userGroups}
                renderAlertDialog={this.renderAlertDialog}
                showLegacyFileSelector={this.showLegacyFileSelector}
                toggleTheme={(newThemeName: ThemeName) => this.toggleTheme(newThemeName)}
                askAboutInclude={this.askAboutInclude}
                changeProject={this.changeProject}
            />
        );
    }

    renderLoader(): React.JSX.Element | null {
        if (window.loadingHideLogo === 'true') {
            return null;
        }
        if (window.vendorPrefix === 'MV') {
            return (
                <LoaderMV
                    themeType={this.state.themeType}
                    backgroundColor={window.loadingBackgroundColor}
                    backgroundImage={window.loadingBackgroundImage}
                />
            );
        }
        if (window.vendorPrefix === 'PT') {
            return (
                <LoaderPT
                    themeType={this.state.themeType}
                    backgroundColor={window.loadingBackgroundColor}
                    backgroundImage={window.loadingBackgroundImage}
                />
            );
        }
        if (window.vendorPrefix && window.vendorPrefix !== '@@vendorPrefix@@') {
            return (
                <LoaderVendor
                    themeType={this.state.themeType}
                    backgroundColor={window.loadingBackgroundColor}
                    backgroundImage={window.loadingBackgroundImage}
                />
            );
        }
        return (
            <Loader
                themeType={this.state.themeType}
                backgroundColor={window.loadingBackgroundColor}
                backgroundImage={window.loadingBackgroundImage}
            />
        );
    }

    render(): React.JSX.Element {
        return (
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={this.state.theme}>
                    {!this.state.loaded || !store.getState().visProject.___settings
                        ? this.renderLoader()
                        : this.getVisEngine()}
                    {this.state.projectDoesNotExist ? this.renderProjectDoesNotExist() : null}
                    {this.state.showProjectsDialog ? this.showSmallProjectsDialog() : null}
                </ThemeProvider>
            </StyledEngineProvider>
        );
    }
}

export default Runtime;
