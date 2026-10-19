import React from 'react';

import { IconButton, Tooltip, Menu as DropMenu, MenuItem as DropMenuItem, Box, LinearProgress } from '@mui/material';

import {
    Close as CloseIcon,
    Sync as SyncIcon,
    PlayArrow as PlayArrowIcon,
    ArrowDropDown as ArrowDropDownIcon,
    Person as PersonIcon,
    ExitToApp as ExitToAppIcon,
    KeyboardArrowUp as HeightFullIcon,
    KeyboardDoubleArrowUp as HeightNarrowIcon,
    KeyboardDoubleArrowDown as HeightVeryNarrowIcon,
    Save as SaveIcon,
} from '@mui/icons-material';

import {
    Icon,
    Utils,
    I18n,
    ToggleThemeMenu,
    type Connection,
    type ThemeName,
    type ThemeType,
} from '@iobroker/gui-components';

import type Editor from '@/Editor';
import type { AnyWidgetId, GroupWidgetId, VisTheme } from '@iobroker/types-vis-2';
import Views from './Views';
import Widgets from './Widgets';
import Projects from './Projects';

const styles: Record<string, any> = {
    text: {
        paddingRight: 4,
    },
    button: {
        margin: 4,
    },
    textInput: {
        margin: '0px 4px',
        width: 120,
    },
    /*
     * The user, the theme and the menu, at the right end of the header.
     *
     * This was a float, and a float is invisible to a flex container: the groups of the toolbar beside it
     * are laid out as if it were not there, so they ran under it (#570). The header is a flex row now and
     * this is an item of it - `order` puts it at the end, where the DOM has it first.
     */
    right: {
        order: 1,
        flexShrink: 0,
        display: 'inline-flex',
        flexDirection: 'column',
        position: 'relative',
    },
    rightBlock: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'end',
    },
    icon: {
        width: 22,
        height: 22,
    },
    // "Kopfzeile - Haarlinie statt Schatten": a header is separated by a line, it is not a card - so it
    // takes the surface colour and a bottom hairline instead of theme.classes.lightedPanel
    header: (theme: VisTheme): React.CSSProperties => ({
        backgroundColor: theme.palette.background.paper,
        borderBottom: `1px solid ${theme.palette.divider}`,
    }),
    toolbar: (theme: VisTheme): React.CSSProperties => theme.classes.toolbar,
    narrowToolbar: {
        pt: '4px',
        pb: '4px',
    },
    heightButton: {},
    saveIcon: (theme: VisTheme): React.CSSProperties => ({
        animation: `blink 2000ms ${theme.transitions.easing.easeInOut}`,
        color: theme.palette.primary.main,
    }),
    version: {
        fontStyle: 'italic',
        marginRight: 10,
        opacity: 0.7,
        fontSize: 10,
        textAlign: 'right',
    },
};

interface ToolbarProps {
    adapterName: string;
    addProject: Editor['addProject'];
    alignWidgets: Editor['alignWidgets'];
    changeProject: Editor['changeProject'];
    changeView: Editor['changeView'];
    cloneWidgets: Editor['cloneWidgets'];
    copyWidgets: Editor['copyWidgets'];
    currentUser: ioBroker.UserObject | null;
    cutWidgets: Editor['cutWidgets'];
    deleteProject: Editor['deleteProject'];
    deleteWidgets: Editor['deleteWidgets'];
    editMode: boolean;
    history: Editor['state']['history'];
    historyCursor: Editor['state']['historyCursor'];
    instance: number;
    loadProject: Editor['loadProject'];
    lockDragging: boolean;
    needSave: boolean;
    openedViews: string[];
    orderWidgets: Editor['orderWidgets'];
    pasteWidgets: Editor['pasteWidgets'];
    projectName: string;
    projects: string[];
    projectsDialog: boolean;
    redo: Editor['redo'];
    refreshProjects: Editor['refreshProjects'];
    renameProject: Editor['renameProject'];
    selectedGroup?: GroupWidgetId;
    selectedView: string;
    selectedWidgets: AnyWidgetId[];
    setProjectsDialog: Editor['setProjectsDialog'];
    setSelectedWidgets: Editor['setSelectedWidgets'];
    setToolbarHeight: (value: 'narrow' | 'veryNarrow' | 'full') => void;
    setViewsManager: Editor['setViewsManager'];
    socket: Connection;
    theme: VisTheme;
    themeName: ThemeName;
    themeType: ThemeType;
    toggleLockDragging: Editor['toggleLockDragging'];
    toggleTheme: Editor['toggleTheme'];
    toggleView: Editor['toggleView'];
    toggleWidgetHint: Editor['toggleWidgetHint'];
    toolbarHeight: 'full' | 'narrow' | 'veryNarrow';
    undo: Editor['undo'];
    version: string;
    viewsManager: boolean;
    widgetHint: string;
    widgetsClipboard: Editor['state']['widgetsClipboard'];
    widgetsLoaded: boolean;
}

interface ToolbarState {
    right: boolean;
    lastCommand: string;
    upload: number;
    /** The parts of the toolbar that are folded into a button with a menu, see `checkFit` */
    folded: Record<FoldablePart, boolean>;
}

type FoldablePart = 'projects' | 'align' | 'views';

/** What is folded first when the row has no room: what is used least. It is opened up the other way round. */
const FOLD_ORDER: FoldablePart[] = ['projects', 'align', 'views'];

const UNFOLDED: Record<FoldablePart, boolean> = { projects: false, align: false, views: false };

/** Room the groups need beyond their own width before a menu opens up again, against flicker */
const EXPAND_RESERVE = 8;

export default class Toolbar extends React.Component<ToolbarProps, ToolbarState> {
    private readonly rightRef: React.RefObject<HTMLButtonElement | null>;
    private readonly lang: ioBroker.Languages;

    private readonly groupsRef = React.createRef<HTMLDivElement>();

    private groupsObserver: ResizeObserver | null = null;

    /** How much wider the row is with a part opened up than with it folded, measured when it was folded */
    private gain: Partial<Record<FoldablePart, number>> = {};

    /** The part just folded and what the row needed before, so that `gain` can be measured after the render */
    private measuring: { part: FoldablePart; needed: number } | null = null;

    /** The part just opened up, to see whether the row wrapped because of it after all */
    private unfolded: FoldablePart | null = null;

    /** Parts that made the row wrap when they were opened up, with the room it had then */
    private blocked: Partial<Record<FoldablePart, number>> = {};

    constructor(props: ToolbarProps) {
        super(props);
        this.state = {
            right: false,
            lastCommand: window.localStorage.getItem('Vis.lastCommand') || 'close',
            upload: 0,
            folded: UNFOLDED,
        };
        this.rightRef = React.createRef();
        this.lang = I18n.getLanguage();
    }

    /**
     * Where the runtime of the project is.
     *
     * It is built when it is needed, not once in the constructor: the editor opens the page that is being
     * worked on, and that changes while the editor is open.
     *
     * @returns the address of the runtime, with the page that is open now
     */
    getRuntimeURL(): string {
        return window.location.pathname.endsWith('/edit.html')
            ? `./?${this.props.projectName}#${this.props.selectedView}`
            : `?${this.props.projectName}&runtime=true#${this.props.selectedView}`;
    }

    componentDidMount(): void {
        void this.props.socket.subscribeState(`system.adapter.${this.props.adapterName}.upload`, this.onUpload);
        if (this.groupsRef.current) {
            this.groupsObserver = new ResizeObserver(() => this.checkFit());
            this.groupsObserver.observe(this.groupsRef.current);
        }
    }

    componentDidUpdate(prevProps: ToolbarProps): void {
        if (prevProps.toolbarHeight !== this.props.toolbarHeight) {
            // every group has another width in another form: everything is measured again
            this.gain = {};
            this.blocked = {};
            this.measuring = null;
            this.unfolded = null;
            if (FOLD_ORDER.some(part => this.state.folded[part])) {
                this.setState({ folded: UNFOLDED });
                return;
            }
        }
        // the groups change their width with the selection as well, not only with the window
        this.checkFit();
    }

    componentWillUnmount(): void {
        void this.props.socket.unsubscribeState(`system.adapter.${this.props.adapterName}.upload`, this.onUpload);
        this.groupsObserver?.disconnect();
        this.groupsObserver = null;
    }

    /**
     * A group that does not fit wraps into a second row, and that row takes the height of a whole toolbar more
     * from the view. So as long as the row wraps, one part after the other is folded into a button with a
     * menu - the one used least first. Whatever fits into the room that is left is opened up again, in any
     * order: the buttons for aligning may need more than there is, while the projects still fit.
     *
     * Folded, a part cannot be measured, so what it adds is taken when it is folded: the row before less the
     * row after. Until everything is folded the groups do not shrink (see `render`), so these are their real
     * widths, and a group that does not fit really goes into another row, where it can be seen here.
     */
    checkFit(): void {
        const box = this.groupsRef.current;
        // the dialogs of the groups are portals, so the children of the row are the groups
        const groups = box ? (Array.from(box.children) as HTMLElement[]) : [];
        if (!box || !groups.length) {
            return;
        }
        const style = window.getComputedStyle(box);
        const room = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const needed = groups.reduce((sum, group) => sum + group.offsetWidth, 0);
        const wraps = groups.some(group => group.offsetTop > groups[0].offsetTop);

        if (this.measuring) {
            this.gain[this.measuring.part] = Math.max(0, this.measuring.needed - needed);
            this.measuring = null;
        }
        const justUnfolded = this.unfolded;
        this.unfolded = null;

        if (wraps) {
            if (justUnfolded) {
                // measured too short: it stays folded until there is more room than now
                this.blocked[justUnfolded] = room;
            }
            const part = FOLD_ORDER.find(name => !this.state.folded[name]);
            if (part) {
                this.measuring = { part, needed };
                this.setState({ folded: { ...this.state.folded, [part]: true } });
            }
            return;
        }

        const free = room - needed;
        const part = [...FOLD_ORDER]
            .reverse()
            .find(
                name =>
                    this.state.folded[name] &&
                    this.gain[name] !== undefined &&
                    free >= this.gain[name] + EXPAND_RESERVE &&
                    (this.blocked[name] === undefined || room > this.blocked[name]),
            );
        if (part) {
            this.unfolded = part;
            this.setState({ folded: { ...this.state.folded, [part]: false } });
        }
    }

    onUpload = (_id: string, state: ioBroker.State | null | undefined): void => {
        if (state?.val || state?.val === 0) {
            this.setState({ upload: state.val as number });
        }
    };

    async onReload(): Promise<void> {
        window.localStorage.setItem('Vis.lastCommand', 'reload');
        await this.props.socket.setState(`${this.props.adapterName}.${this.props.instance}.control.instance`, {
            val: '*',
            ack: true,
        });
        await this.props.socket.setState(`${this.props.adapterName}.${this.props.instance}.control.data`, {
            val: null,
            ack: true,
        });
        await this.props.socket.setState(`${this.props.adapterName}.${this.props.instance}.control.command`, {
            val: 'refresh',
            ack: true,
        });
        this.setState({ right: false, lastCommand: 'reload' });
    }

    renderDropMenu(): React.JSX.Element {
        return (
            <DropMenu
                open={this.state.right}
                anchorEl={this.rightRef.current}
                onClose={() => this.setState({ right: false })}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                // getContentAnchorEl={null}
            >
                <DropMenuItem
                    onClick={() => {
                        window.localStorage.setItem('Vis.lastCommand', 'close');
                        this.setState({ lastCommand: 'close', right: false });
                        window.location.href = this.getRuntimeURL();
                    }}
                >
                    <CloseIcon
                        style={{ marginRight: 8, color: this.props.themeType === 'dark' ? '#6388fd' : '#5fa5fe' }}
                    />
                    {I18n.t('Close editor')}
                </DropMenuItem>
                <DropMenuItem
                    onClick={() => {
                        window.localStorage.setItem('Vis.lastCommand', 'open');
                        this.setState({ lastCommand: 'open', right: false });
                        window.open(this.getRuntimeURL(), 'vis-2.runtime');
                    }}
                >
                    <PlayArrowIcon
                        style={{ marginRight: 8, color: this.props.themeType === 'dark' ? '#50ff50' : '#008800' }}
                    />
                    {I18n.t('Open runtime in new window')}
                </DropMenuItem>
                <DropMenuItem onClick={() => this.onReload()}>
                    <SyncIcon
                        style={{ marginRight: 8, color: this.props.themeType === 'dark' ? '#ffa947' : '#884900' }}
                    />
                    {I18n.t('Reload all runtimes')}
                </DropMenuItem>
            </DropMenu>
        );
    }

    renderUserPart(): React.JSX.Element {
        let heightButton: React.JSX.Element;

        if (this.props.toolbarHeight === 'narrow') {
            heightButton = (
                <Tooltip
                    title={I18n.t('Narrow panel')}
                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                >
                    <IconButton
                        style={styles.heightButton}
                        onClick={() => this.props.setToolbarHeight('veryNarrow')}
                    >
                        <HeightNarrowIcon />
                    </IconButton>
                </Tooltip>
            );
        } else if (this.props.toolbarHeight === 'veryNarrow') {
            heightButton = (
                <Tooltip
                    title={I18n.t('Full panel')}
                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                >
                    <IconButton
                        style={styles.heightButton}
                        onClick={() => this.props.setToolbarHeight('full')}
                    >
                        <HeightVeryNarrowIcon />
                    </IconButton>
                </Tooltip>
            );
        } else {
            heightButton = (
                <Tooltip
                    title={I18n.t('Hide panel names')}
                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                >
                    <IconButton
                        style={styles.heightButton}
                        onClick={() => this.props.setToolbarHeight('narrow')}
                    >
                        <HeightFullIcon />
                    </IconButton>
                </Tooltip>
            );
        }

        const currentUser: React.JSX.Element | null = this.props.currentUser ? (
            <div style={styles.rightBlock}>
                {this.props.currentUser?.common?.icon ? (
                    <Icon
                        src={this.props.currentUser?.common?.icon || ''}
                        style={styles.icon}
                    />
                ) : (
                    <PersonIcon fontSize="small" />
                )}
                <span style={{ paddingRight: 8, marginLeft: 8 }}>
                    {Utils.getObjectNameFromObj(this.props.currentUser, this.lang)}
                </span>
                {this.props.socket.isSecure ? (
                    <Tooltip
                        title={I18n.t('Exit')}
                        slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                    >
                        <IconButton
                            size="small"
                            onClick={async () => {
                                try {
                                    await this.props.socket.logout();
                                } catch (e) {
                                    console.error(e);
                                    return;
                                }

                                window.location.reload();
                            }}
                        >
                            <ExitToAppIcon />
                        </IconButton>
                    </Tooltip>
                ) : null}
            </div>
        ) : null;

        let lastCommandButton: React.JSX.Element | undefined;
        if (this.state.lastCommand === 'close') {
            lastCommandButton = (
                <Tooltip
                    title={I18n.t('Close editor')}
                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                >
                    <IconButton
                        size="small"
                        onClick={() => (window.location.href = this.getRuntimeURL())}
                    >
                        <CloseIcon style={{ color: this.props.themeType === 'dark' ? '#6388fd' : '#5fa5fe' }} />
                    </IconButton>
                </Tooltip>
            );
        } else if (this.state.lastCommand === 'open') {
            lastCommandButton = (
                <Tooltip
                    title={I18n.t('Open runtime in new window')}
                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                >
                    <IconButton
                        size="small"
                        onClick={() => window.open(this.getRuntimeURL(), 'vis-2.runtime')}
                    >
                        <PlayArrowIcon style={{ color: this.props.themeType === 'dark' ? '#50ff50' : '#008800' }} />
                    </IconButton>
                </Tooltip>
            );
        } else if (this.state.lastCommand === 'reload') {
            lastCommandButton = (
                <Tooltip
                    title={I18n.t('Reload all runtimes')}
                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                >
                    <IconButton
                        size="small"
                        onClick={() => void this.onReload()}
                    >
                        <SyncIcon style={{ color: this.props.themeType === 'dark' ? '#ffa947' : '#884900' }} />
                    </IconButton>
                </Tooltip>
            );
        }

        return (
            // the GUI test of the toolbar looks for this class, see test/testAdapter.gui.js
            <span
                className="vis-toolbar-right"
                style={styles.right}
            >
                {this.state.upload ? (
                    <LinearProgress
                        variant="determinate"
                        value={this.state.upload}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
                    />
                ) : null}
                <div style={styles.rightBlock}>
                    {this.props.needSave ? (
                        <SaveIcon
                            fontSize="small"
                            style={Utils.getStyle(this.props.theme, styles.saveIcon)}
                        />
                    ) : null}
                    {this.props.toolbarHeight === 'veryNarrow' ? currentUser : null}
                    {heightButton}
                    <ToggleThemeMenu
                        toggleTheme={this.props.toggleTheme}
                        themeName={this.props.themeName}
                        t={I18n.t}
                    />
                    {lastCommandButton}
                    <IconButton
                        ref={this.rightRef}
                        onClick={() => this.setState({ right: !this.state.right })}
                        size="small"
                    >
                        <ArrowDropDownIcon />
                    </IconButton>
                    {this.renderDropMenu()}
                </div>
                {this.props.toolbarHeight !== 'veryNarrow' ? currentUser : null}
                {this.props.toolbarHeight === 'full' && this.props.version ? (
                    <span style={styles.version}>v{this.props.version}</span>
                ) : null}
            </span>
        );
    }

    render(): React.JSX.Element {
        return (
            <Box
                component="div"
                sx={styles.header}
                // the row of the header: the toolbar takes what the right part leaves it, see `styles.right`
                style={{ display: 'flex', alignItems: 'flex-start' }}
            >
                <style>
                    {`
                @keyframes blink {
                    0% {
                        opacity: 0;
                    }
                    50% {
                        opacity: 1;
                    }
                    100% {
                        opacity: 0;
                    }
                }
            `}
                </style>
                {this.renderUserPart()}
                <Box
                    component="div"
                    ref={this.groupsRef}
                    sx={{
                        ...Utils.getStyle(
                            this.props.theme,
                            styles.toolbar,
                            this.props.toolbarHeight !== 'full' && styles.narrowToolbar,
                        ),
                        // whole groups, so that one that does not fit wraps and `checkFit` folds something
                        // away; only when nothing is left to fold may a group fold its own buttons
                        '& > *': { flexShrink: FOLD_ORDER.every(part => this.state.folded[part]) ? undefined : 0 },
                    }}
                    // The groups take the width the right part (user, theme, menu) leaves them. When they need
                    // more, parts of them are folded into menus, and only then a group wraps into another row -
                    // otherwise they ran on under that part and lay over the name of the user (#570).
                    style={{
                        alignItems: 'initial',
                        flex: '1 1 auto',
                        minWidth: 0,
                        flexWrap: 'wrap',
                        rowGap: 4,
                    }}
                >
                    <Views
                        toolbarHeight={this.props.toolbarHeight}
                        changeProject={this.props.changeProject}
                        changeView={this.props.changeView}
                        editMode={this.props.editMode}
                        projectName={this.props.projectName}
                        selectedGroup={this.props.selectedGroup}
                        selectedView={this.props.selectedView}
                        setProjectsDialog={this.props.setProjectsDialog}
                        setSelectedWidgets={this.props.setSelectedWidgets}
                        setViewsManager={this.props.setViewsManager}
                        socket={this.props.socket}
                        themeName={this.props.themeName}
                        themeType={this.props.themeType}
                        theme={this.props.theme}
                        toggleView={this.props.toggleView}
                        viewsManager={this.props.viewsManager}
                        compact={this.state.folded.views}
                    />
                    <Widgets
                        toolbarHeight={this.props.toolbarHeight}
                        compactAlign={this.state.folded.align}
                        alignWidgets={this.props.alignWidgets}
                        changeProject={this.props.changeProject}
                        cloneWidgets={this.props.cloneWidgets}
                        copyWidgets={this.props.copyWidgets}
                        cutWidgets={this.props.cutWidgets}
                        deleteWidgets={this.props.deleteWidgets}
                        editMode={this.props.editMode}
                        history={this.props.history}
                        historyCursor={this.props.historyCursor}
                        lockDragging={this.props.lockDragging}
                        openedViews={this.props.openedViews}
                        orderWidgets={this.props.orderWidgets}
                        pasteWidgets={this.props.pasteWidgets}
                        redo={this.props.redo}
                        selectedGroup={this.props.selectedGroup}
                        selectedView={this.props.selectedView}
                        selectedWidgets={this.props.selectedWidgets}
                        setSelectedWidgets={this.props.setSelectedWidgets}
                        themeType={this.props.themeType}
                        theme={this.props.theme}
                        toggleLockDragging={this.props.toggleLockDragging}
                        toggleWidgetHint={this.props.toggleWidgetHint}
                        undo={this.props.undo}
                        widgetHint={this.props.widgetHint}
                        widgetsClipboard={this.props.widgetsClipboard}
                        widgetsLoaded={this.props.widgetsLoaded}
                    />
                    <Projects
                        theme={this.props.theme}
                        toolbarHeight={this.props.toolbarHeight}
                        compact={this.state.folded.projects}
                        adapterName={this.props.adapterName}
                        changeProject={this.props.changeProject}
                        instance={this.props.instance}
                        projectName={this.props.projectName}
                        projectsDialog={this.props.projectsDialog}
                        selectedView={this.props.selectedView}
                        setProjectsDialog={this.props.setProjectsDialog}
                        setSelectedWidgets={this.props.setSelectedWidgets}
                        socket={this.props.socket}
                        themeType={this.props.themeType}
                        addProject={this.props.addProject}
                        deleteProject={this.props.deleteProject}
                        loadProject={this.props.loadProject}
                        projects={this.props.projects}
                        refreshProjects={this.props.refreshProjects}
                        renameProject={this.props.renameProject}
                    />
                </Box>
            </Box>
        );
    }
}
