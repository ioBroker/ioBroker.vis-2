import React from 'react';

import {
    BottomNavigation,
    BottomNavigationAction,
    Collapse,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Tooltip,
    Tabs,
    Tab,
    Box,
} from '@mui/material';

import {
    ArrowBack as BackIcon,
    ChevronLeft as ChevronLeftIcon,
    Dashboard as DashboardIcon,
    ExpandLess as CollapseIcon,
    ExpandMore as ExpandIcon,
    Folder as FolderIcon,
} from '@mui/icons-material';

import { I18n, Utils, Icon } from '@iobroker/gui-components';
import type { ViewSettings, VisContext, VisTheme } from '@iobroker/types-vis-2';

import { resolveNavigationSettings } from './visNavigationSettings';

const MENU_WIDTH_FULL = 200;
const MENU_WIDTH_NARROW = 56;
const TOOLBAR_SIZE = 48;

const styles: Record<string, any> = {
    root: {
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        // overflow: 'hidden',
    },
    rootHorizontal: {
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        flexDirection: 'column',
        // overflow: 'hidden',
    },
    toolBar: (theme: VisTheme): any => ({
        width: '100%',
        // the padding must be a part of the width, as the bar would be wider than the window otherwise
        boxSizing: 'border-box',
        height: TOOLBAR_SIZE,
        overflow: 'hidden',
        lineHeight: `${TOOLBAR_SIZE}px`,
        pl: '16px',
        fontSize: 20,
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        transition: 'padding-left 0.4s ease-in-out',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    }),
    toolbarIcon: {
        height: 32,
        width: 'auto',
    },
    // the bar of the navigation with the orientation "horizontal"
    horizontalMenu: (theme: VisTheme): React.CSSProperties => ({
        width: '100%',
        top: 0,
        left: 0,
        height: TOOLBAR_SIZE,
        overflow: 'hidden',
        lineHeight: `${TOOLBAR_SIZE}px`,
        backgroundColor: theme.palette.primary.main,
        zIndex: 450,
    }),
    toolBarWithClosedMenu: {
        paddingLeft: `${16 + TOOLBAR_SIZE}px`,
    },
    viewContentWithToolbar: {
        position: 'relative',
        height: `calc(100% - ${TOOLBAR_SIZE}px)`,
        width: '100%',
    },
    viewContentWithoutToolbar: {
        position: 'relative',
        height: '100%',
        width: '100%',
    },
    openMenuButton: {
        position: 'absolute',
        top: 5,
        width: TOOLBAR_SIZE,
        height: TOOLBAR_SIZE,
        zIndex: 999,
        transition: 'all 0.4s ease-in-out',
    },
    openMenuButtonFull: {},
    openMenuButtonNarrow: {
        left: 9,
    },
    openMenuButtonHidden: {
        left: 9,
        opacity: 0.5,
    },
    openMenuButtonIconHidden: {
        transform: 'rotate(180deg)',
        transformOrigin: 'center',
        transition: 'all 0.3s ease-in-out',
    },
    menu: {
        transition: 'width 0.4s ease-in-out, opacity 0.3s ease-in-out',
    },
    menuFull: {
        height: '100%',
        display: 'inline-block',
        overflow: 'hidden',
        opacity: 1,
    },
    menuNarrow: {
        width: MENU_WIDTH_NARROW,
        height: '100%',
        display: 'inline-block',
        overflow: 'hidden',
        opacity: 1,
    },
    menuHidden: {
        width: 0,
        height: '100%',
        display: 'inline-block',
        opacity: 0,
    },
    afterMenu: {
        transition: 'width 0.4s ease-in-out',
    },
    afterMenuFull: {
        height: '100%',
        display: 'inline-block',
    },
    afterMenuNarrow: {
        width: `calc(100% - ${MENU_WIDTH_NARROW}px)`,
        height: '100%',
        display: 'inline-block',
    },
    afterMenuHidden: {
        width: '100%',
        height: '100%',
        display: 'inline-block',
    },
    menuList: {
        width: '100%',
        height: 'calc(100% - 49px)',
        overflowY: 'auto',
        overflowX: 'hidden',
    },
    menuItem: {
        minHeight: TOOLBAR_SIZE,
    },
    listItemIcon: {
        width: 24,
        height: 24,
    },
    listItemIconText: {
        paddingLeft: 8,
        opacity: 1,
        transition: 'opacity 0.3s ease-in-out',
        position: 'absolute',
        top: 12,
        left: 16,
    },
    listItemText: {
        whiteSpace: 'nowrap',
        transition: 'all 0.3s ease-in-out',
        opacity: 1,
    },
    listItemTextNarrow: {
        opacity: 0,
    },
    selectedMenu: (theme: VisTheme): React.CSSProperties => ({
        backgroundColor: theme.palette.secondary.main,
        color: theme.palette.secondary.contrastText,
    }),
    menuToolbar: {
        height: TOOLBAR_SIZE,
        display: 'flex',
        lineHeight: `${TOOLBAR_SIZE}px`,
        verticalAlign: 'middle',
        paddingLeft: 16,
        fontSize: 20,
        whiteSpace: 'nowrap',
        transition: 'opacity 0.3s ease-in-out',
    },
    menuToolbarFull: {
        opacity: 1,
    },
    menuToolbarNarrow: {
        opacity: 0,
    },
    transparent: {
        opacity: 0,
    },
};

interface VisNavigationProps {
    context: VisContext;
    view: string;
    activeView: string;
    editMode: boolean;
    menuWidth: 'full' | 'narrow' | 'hidden';
    setMenuWidth: (width: 'hidden' | 'narrow' | 'full') => void;
    theme: VisTheme;
    visInWidget?: boolean;
    children: React.ReactNode;
}

interface MenuItem {
    text: string;
    color?: string;
    icon?: string;
    noText?: boolean;
    order: number;
    view: string;
    /** The folder the view lies in, where it lies in one */
    folder?: { id: string; name: string };
}

/** Either one page, or a folder with the pages in it */
type MenuEntry = { kind: 'item'; item: MenuItem } | { kind: 'folder'; id: string; name: string; items: MenuItem[] };

/** Which folders are open, remembered for this browser */
const OPEN_FOLDERS = 'vis.menuFolders';

/**
 * Where the user has been, so the app bar can offer a way back.
 *
 * It is kept beside the component rather than in it: the component is built again on every change of
 * the view, and a history that is forgotten on every step is no history. The browser's own history
 * cannot be asked - a page may have been reached from anywhere - so this is the only way to know
 * whether there is something to go back to.
 */
const visited: string[] = [];

interface VisNavigationState {
    /** Which folders of the menu are open */
    openFolders: Record<string, boolean>;
}

class VisNavigation extends React.Component<VisNavigationProps, VisNavigationState> {
    constructor(props: VisNavigationProps) {
        super(props);
        let openFolders: Record<string, boolean> = {};
        try {
            openFolders = JSON.parse(window.localStorage.getItem(OPEN_FOLDERS) || '{}');
        } catch {
            // a broken entry is no reason to show no menu
        }
        this.state = { openFolders };
    }

    componentDidMount(): void {
        this.rememberView();
    }

    componentDidUpdate(): void {
        this.rememberView();
    }

    /** Keep the trail of views, so the app bar knows whether there is a way back */
    rememberView(): void {
        const view = this.props.activeView;
        if (view && visited[visited.length - 1] !== view) {
            visited.push(view);
            // a trail longer than this is nobody's way back; it only grows
            if (visited.length > 20) {
                visited.shift();
            }
        }
    }

    /** Go back to the view that was open before this one */
    goBack = (): void => {
        // the current view is the last entry, so the one before it is where to go
        visited.pop();
        const previous = visited.pop();
        if (previous) {
            this.props.context.changeView(previous);
        }
    };

    /**
     * The folder a view lies in, out of the folders of the project.
     *
     * The project has had folders since the views manager was built, and the navigation has ignored
     * them: a house with eight rooms and three pages each was twenty-four entries in one flat list.
     *
     * @param view - the name of the view
     */
    folderOf(view: string): { id: string; name: string } | undefined {
        const project = this.props.context.views;
        const parentId = project[view]?.parentId;
        if (!parentId) {
            return undefined;
        }
        const folder = (project.___settings?.folders || []).find(one => one.id === parentId);
        return folder ? { id: folder.id, name: folder.name } : undefined;
    }

    /** The entries of the menu, in the order they are shown */
    buildItems(settings: ViewSettings): MenuItem[] {
        const items: MenuItem[] = [];

        Object.keys(this.props.context.views).forEach(view => {
            if (view === '___settings') {
                return;
            }
            const viewSettings = this.props.context.views[view].settings;
            // a view can show the menu without being an entry of it
            if (viewSettings.navigation && !viewSettings.navigationHideEntry) {
                const item: MenuItem = {
                    text:
                        settings.navigationOrientation === 'horizontal' && viewSettings.navigationOnlyIcon
                            ? ''
                            : viewSettings.navigationTitle || view,
                    color: viewSettings.navigationColor,
                    icon: viewSettings.navigationIcon || viewSettings.navigationImage,
                    noText: viewSettings.navigationOnlyIcon,
                    order: parseInt((viewSettings.navigationOrder as any as string) || '0'),
                    view,
                    folder: this.folderOf(view),
                };

                items.push(item);

                if (item.icon?.startsWith('_PRJ_NAME/')) {
                    item.icon = `../${this.props.context.adapterName}.${this.props.context.instance}/${this.props.context.projectName}${item.icon.substring(9)}`; // "_PRJ_NAME".length = 9
                }
            }
        });

        items.sort((prevItem, nextItem) =>
            prevItem.order === nextItem.order ? 0 : prevItem.order < nextItem.order ? -1 : 1,
        );

        return items;
    }

    /**
     * The entries, with the pages of one folder gathered under it.
     *
     * A folder takes the place its first page would have had, so the order that was set by hand still
     * decides everything - a folder does not jump to the top because it is a folder.
     *
     * @param items - the entries, already in order
     */
    // eslint-disable-next-line class-methods-use-this
    groupItems(items: MenuItem[]): MenuEntry[] {
        const entries: MenuEntry[] = [];
        const byFolder: Record<string, MenuEntry & { kind: 'folder' }> = {};

        for (const item of items) {
            if (!item.folder) {
                entries.push({ kind: 'item', item });
                continue;
            }
            const existing = byFolder[item.folder.id];
            if (existing) {
                existing.items.push(item);
            } else {
                const folder: MenuEntry & { kind: 'folder' } = {
                    kind: 'folder',
                    id: item.folder.id,
                    name: item.folder.name,
                    items: [item],
                };
                byFolder[item.folder.id] = folder;
                entries.push(folder);
            }
        }

        return entries;
    }

    /**
     * Open or close a folder of the menu.
     *
     * @param id - the folder
     */
    toggleFolder(id: string): void {
        const openFolders = { ...this.state.openFolders, [id]: !this.state.openFolders[id] };
        window.localStorage.setItem(OPEN_FOLDERS, JSON.stringify(openFolders));
        this.setState({ openFolders });
    }

    /**
     * One page in the vertical menu.
     *
     * @param item - the page
     * @param settings - the colours of the menu
     * @param inFolder - it lies in a folder, so it is set in a little
     */
    renderMenuItem(item: MenuItem, settings: ViewSettings, inFolder: boolean): React.JSX.Element {
        const active = this.props.activeView === item.view;
        const color = active ? settings.navigationSelectedColor : settings.navigationColor;

        const menuItem = (
            <ListItem
                key={item.view}
                disablePadding
                sx={Utils.getStyle(this.props.theme, styles.menuItem, active && styles.selectedMenu)}
                style={{
                    backgroundColor: active ? settings.navigationSelectedBackground : undefined,
                    // a page of a folder is set in, so the folder it belongs to can be seen at a glance
                    paddingLeft: inFolder && this.props.menuWidth === 'full' ? 16 : undefined,
                }}
                onClick={(): void => {
                    if (settings.navigationHideOnSelection) {
                        this.hideNavigationMenu();
                    }
                    this.props.context.changeView(item.view);
                }}
            >
                <ListItemButton>
                    <ListItemIcon>
                        {item.icon ? (
                            <Icon
                                src={item.icon}
                                style={{ color, backgroundColor: 'rgba(1,1,1,0)' }}
                                sx={Utils.getStyle(
                                    this.props.theme,
                                    styles.listItemIcon,
                                    active && styles.selectedMenu,
                                )}
                            />
                        ) : (
                            <>
                                <DashboardIcon
                                    style={{ color, backgroundColor: 'rgba(1,1,1,0)' }}
                                    sx={Utils.getStyle(
                                        this.props.theme,
                                        this.props.menuWidth !== 'full' && styles.transparent,
                                        active && styles.selectedMenu,
                                    )}
                                />
                                {item.text ? (
                                    <span
                                        style={{
                                            ...styles.listItemIconText,
                                            ...(this.props.menuWidth === 'full' ? styles.transparent : undefined),
                                            color,
                                        }}
                                    >
                                        {item.text[0].toUpperCase()}
                                    </span>
                                ) : null}
                            </>
                        )}
                    </ListItemIcon>
                    <ListItemText
                        primary={item.text}
                        style={{ color }}
                        sx={{
                            // The text sits in a child of the root, and the class is
                            // `MuiListItemText-primary`. It was named `&.MuListItemText-primary`
                            // here, which matches nothing: the name of the view stayed in the
                            // narrow menu, cut off beside the icon, instead of fading out.
                            '& .MuiListItemText-primary': Utils.getStyle(
                                this.props.theme,
                                styles.listItemText,
                                this.props.menuWidth === 'narrow' && styles.listItemTextNarrow,
                            ),
                        }}
                    />
                </ListItemButton>
            </ListItem>
        );

        return (
            <Tooltip
                title={this.props.menuWidth !== 'full' ? item.text : ''}
                key={item.view}
                slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
            >
                {menuItem}
            </Tooltip>
        );
    }

    /**
     * The whole vertical menu: the pages, and the folders with the pages in them.
     *
     * A narrow menu is a column of icons, and a folder has no icon of its own that would say anything
     * - so there the pages are shown as they always were, one after the other.
     *
     * @param items - the pages
     * @param settings - the colours of the menu
     */
    renderEntries(items: MenuItem[], settings: ViewSettings): React.JSX.Element[] {
        if (this.props.menuWidth !== 'full' || settings.navigationFlat) {
            return items.map(item => this.renderMenuItem(item, settings, false));
        }

        return this.groupItems(items).map(entry => {
            if (entry.kind === 'item') {
                return this.renderMenuItem(entry.item, settings, false);
            }

            // a folder that holds the page one is on is open whatever was remembered: the menu must
            // not hide where the user is standing
            const holdsActive = entry.items.some(item => item.view === this.props.activeView);
            const open = this.state.openFolders[entry.id] ?? holdsActive;

            return (
                <React.Fragment key={entry.id}>
                    <ListItem
                        disablePadding
                        sx={Utils.getStyle(this.props.theme, styles.menuItem)}
                        onClick={() => this.toggleFolder(entry.id)}
                    >
                        <ListItemButton>
                            <ListItemIcon>
                                <FolderIcon
                                    style={{ color: settings.navigationColor, backgroundColor: 'rgba(1,1,1,0)' }}
                                />
                            </ListItemIcon>
                            <ListItemText
                                primary={entry.name}
                                style={{ color: settings.navigationColor }}
                                sx={{ '& .MuiListItemText-primary': styles.listItemText }}
                            />
                            {open ? (
                                <CollapseIcon style={{ color: settings.navigationColor }} />
                            ) : (
                                <ExpandIcon style={{ color: settings.navigationColor }} />
                            )}
                        </ListItemButton>
                    </ListItem>
                    <Collapse
                        in={open}
                        timeout="auto"
                        unmountOnExit
                    >
                        <List disablePadding>{entry.items.map(item => this.renderMenuItem(item, settings, true))}</List>
                    </Collapse>
                </React.Fragment>
            );
        });
    }

    /**
     * The menu at the bottom edge, for a phone.
     *
     * A drawer that has to be pulled out is the wrong shape for a device held in one hand: the thumb
     * reaches the bottom of the screen and nothing else.
     *
     * About five entries fit across a phone. More than that do not get smaller - a label squeezed into
     * forty pixels is a label nobody reads - the bar scrolls instead, and everything keeps its width.
     *
     * @param settings - the colours of the menu
     */
    renderBottomMenu(settings: ViewSettings): React.JSX.Element {
        const items = this.buildItems(settings);

        return (
            <BottomNavigation
                showLabels
                value={items.find(item => item.view === this.props.activeView)?.view || false}
                onChange={(_event, view: string) => this.props.context.changeView(view)}
                style={{
                    position: this.props.context.runtime ? 'fixed' : 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    zIndex: 450,
                    backgroundColor: settings.navigationBackground || undefined,
                    opacity: this.props.editMode ? 0.4 : 1,
                    // what does not fit is scrolled to, rather than squeezed until nothing can be read
                    overflowX: 'auto',
                    justifyContent: 'flex-start',
                }}
            >
                {items.map(item => (
                    <BottomNavigationAction
                        key={item.view}
                        value={item.view}
                        label={item.noText ? '' : item.text}
                        style={{
                            color:
                                this.props.activeView === item.view
                                    ? settings.navigationSelectedColor
                                    : settings.navigationColor,
                            minWidth: 72,
                            maxWidth: 168,
                            flexShrink: 0,
                        }}
                        icon={
                            item.icon ? (
                                <Icon
                                    src={item.icon}
                                    style={{ width: 24, height: 24, backgroundColor: 'rgba(1,1,1,0)' }}
                                />
                            ) : (
                                <DashboardIcon />
                            )
                        }
                    />
                ))}
            </BottomNavigation>
        );
    }

    renderMenu(settings: ViewSettings, menuFullWidth: number): React.JSX.Element {
        const items = this.buildItems(settings);

        if (settings.navigationOrientation === 'horizontal') {
            return (
                <Box
                    component="div"
                    sx={styles.horizontalMenu}
                    style={{
                        backgroundColor:
                            // The horizontal menu had no color of its own before and borrowed the one of the
                            // application bar, so navigationBarColor stays as a fallback. The own setting has to
                            // win, as it would have no effect at all otherwise as soon as a bar color is set.
                            settings.navigationBackground ||
                            settings.navigationBarColor ||
                            this.props.context.theme.palette.background.paper,
                        opacity: this.props.editMode ? 0.4 : 1,
                        position: this.props.context.runtime ? 'fixed' : 'relative',
                    }}
                >
                    <Tabs
                        // the active view has no tab if it hides its own entry, and MUI warns about an unknown value
                        value={items.find(item => item.view === this.props.activeView) ? this.props.activeView : false}
                        // the standard variant squeezes the entries into the available width, so they overlap if the window is too narrow
                        variant="scrollable"
                        scrollButtons="auto"
                        allowScrollButtonsMobile
                    >
                        {items.map((item, index) => (
                            <Tab
                                iconPosition="start"
                                key={index}
                                style={{
                                    minHeight: 48,
                                    minWidth: item.noText ? 20 : undefined,
                                    color:
                                        this.props.activeView === item.view
                                            ? settings.navigationSelectedColor
                                            : settings.navigationColor,
                                }}
                                icon={
                                    item.icon ? (
                                        <Icon
                                            src={item.icon}
                                            style={{
                                                ...styles.listItemIcon,
                                                color:
                                                    this.props.activeView === item.view
                                                        ? settings.navigationSelectedColor
                                                        : settings.navigationColor,
                                            }}
                                        />
                                    ) : undefined
                                }
                                onClick={() => this.props.context.changeView(item.view)}
                                value={item.view}
                                label={item.text}
                            />
                        ))}
                    </Tabs>
                </Box>
            );
        }

        const menuStyle: React.CSSProperties = {
            ...styles.menu,
            width: this.props.menuWidth === 'full' ? menuFullWidth : undefined,
            ...(this.props.menuWidth === 'full' ? styles.menuFull : undefined),
            ...(this.props.menuWidth === 'narrow' ? styles.menuNarrow : undefined),
            ...(this.props.menuWidth === 'hidden' ? styles.menuHidden : undefined),
            opacity: this.props.editMode ? 0.4 : 1,
            backgroundColor: settings.navigationBackground || undefined,
        };

        if (settings.navigationHideOnSelection) {
            menuStyle.zIndex = 998;
            menuStyle.position = this.props.context.runtime ? 'fixed' : 'absolute';
            menuStyle.top = 0;
            menuStyle.left = 0;
            menuStyle.backgroundColor =
                settings.navigationBackground || this.props.context.theme.palette.background.paper;
        }

        const menuToolbarStyle: React.CSSProperties = {
            ...styles.menuToolbar,
            ...(this.props.menuWidth === 'full' ? styles.menuToolbarFull : undefined),
            ...(this.props.menuWidth === 'narrow' ? styles.menuToolbarNarrow : undefined),
            ...(this.props.menuWidth === 'hidden' ? styles.menuToolbarNarrow : undefined),
            color: settings.navigationHeaderTextColor || undefined,
        };

        return (
            <div style={menuStyle}>
                <div style={menuToolbarStyle}>{settings.navigationHeaderText || ''}</div>
                <Divider />
                <div style={styles.menuList}>
                    <List>{this.renderEntries(items, settings)}</List>
                </div>
            </div>
        );
    }

    renderToolbar(settings: ViewSettings): React.JSX.Element | null {
        if (!settings.navigationBar) {
            return null;
        }
        let style: React.CSSProperties;
        if (settings.navigationBarColor) {
            style = {
                backgroundColor: settings.navigationBarColor,
                color: Utils.getInvertedColor(settings.navigationBarColor, this.props.context.themeType, true),
            };
        } else {
            style = {};
        }
        style.opacity = this.props.editMode ? 0.4 : 1;

        let icon: string | undefined = settings.navigationBarIcon || settings.navigationBarImage;
        if (icon?.startsWith('_PRJ_NAME/')) {
            icon = `../${this.props.context.adapterName}.${this.props.context.instance}/${this.props.context.projectName}${icon.substring(9)}`; // "_PRJ_NAME".length = 9
        }

        return (
            <Box
                component="div"
                sx={Utils.getStyle(
                    this.props.theme,
                    styles.toolBar,
                    this.props.menuWidth === 'hidden' && styles.toolBarWithClosedMenu,
                )}
                style={style}
            >
                {settings.navigationBack && visited.length > 1 ? (
                    <Tooltip
                        title={I18n.t('Back')}
                        slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                    >
                        <IconButton
                            size="small"
                            onClick={this.goBack}
                            style={{ color: 'inherit', marginRight: 4 }}
                        >
                            <BackIcon />
                        </IconButton>
                    </Tooltip>
                ) : null}
                {icon ? (
                    <Icon
                        src={icon}
                        style={styles.toolbarIcon}
                    />
                ) : null}
                {settings.navigationBarText || this.props.activeView}
            </Box>
        );
    }

    /**
     * Hide the navigation menu
     */
    hideNavigationMenu(): void {
        window.localStorage.setItem('vis.navOpened', 'hidden');
        this.props.setMenuWidth('hidden');
    }

    renderOpenMenuButton(settings: ViewSettings): React.JSX.Element {
        let backgroundColor: string | undefined;
        let color: string | undefined;
        if (this.props.menuWidth === 'hidden') {
            if (settings.navigationButtonBackground) {
                backgroundColor = this.props.context.themeType === 'dark' ? '#FFFFFF40' : '#00000040';
            } else {
                backgroundColor = 'transparent';
            }

            if (settings.navigationBar && !settings.navigationChevronColor) {
                if (settings.navigationBarColor) {
                    color = Utils.getInvertedColor(settings.navigationBarColor, this.props.context.themeType, true);
                } else {
                    color = this.props.context.themeType === 'dark' ? '#FFF' : '#000';
                }
            } else {
                color = settings.navigationChevronColor;
            }
        } else {
            backgroundColor = 'transparent';
        }

        return (
            <IconButton
                onClick={() => {
                    if (settings.navigationHideOnSelection) {
                        if (this.props.menuWidth === 'full') {
                            this.hideNavigationMenu();
                        } else {
                            window.localStorage.setItem('vis.navOpened', 'full');
                            this.props.setMenuWidth('full');
                        }
                    } else if (this.props.menuWidth === 'full') {
                        window.localStorage.setItem('vis.navOpened', 'narrow');
                        this.props.setMenuWidth('narrow');
                    } else if (this.props.menuWidth === 'narrow') {
                        if (!settings.navigationNoHide) {
                            this.hideNavigationMenu();
                        } else {
                            window.localStorage.setItem('vis.navOpened', 'full');
                            this.props.setMenuWidth('full');
                        }
                    } else {
                        window.localStorage.setItem('vis.navOpened', 'full');
                        this.props.setMenuWidth('full');
                    }
                }}
                style={{ backgroundColor }}
            >
                <ChevronLeftIcon
                    style={{
                        ...(this.props.menuWidth === 'hidden' ||
                        (this.props.menuWidth === 'narrow' && settings.navigationNoHide)
                            ? styles.openMenuButtonIconHidden
                            : undefined),
                        color,
                    }}
                />
            </IconButton>
        );
    }

    render(): React.JSX.Element | null {
        if (!this.props.context.views?.[this.props.view]) {
            return null;
        }

        const settings: ViewSettings = resolveNavigationSettings(
            this.props.context.views,
            this.props.context.views[this.props.view].settings,
        );
        const menuFullWidth = parseInt(settings.navigationWidth as any as string, 10) || MENU_WIDTH_FULL;

        // The menu at the bottom edge, for a phone: the page fills everything above it
        if (
            settings.navigation &&
            !this.props.visInWidget &&
            settings.navigationOrientation === 'bottom' &&
            this.props.view === this.props.activeView
        ) {
            return (
                <div style={styles.rootHorizontal}>
                    {this.renderToolbar(settings)}
                    <div
                        style={{
                            ...styles.viewContentWithToolbar,
                            // the bar takes its height from the bottom of the page, not from the top
                            height: `calc(100% - ${TOOLBAR_SIZE + (settings.navigationBar ? TOOLBAR_SIZE : 0)}px)`,
                        }}
                    >
                        {this.props.children}
                    </div>
                    {this.renderBottomMenu(settings)}
                </div>
            );
        }

        // Show horizontal navigation menu
        if (
            settings.navigation &&
            !this.props.visInWidget &&
            settings.navigationOrientation === 'horizontal' &&
            this.props.view === this.props.activeView
        ) {
            return (
                <div style={styles.rootHorizontal}>
                    {this.renderMenu(settings, menuFullWidth)}
                    <div
                        style={{
                            ...styles.viewContentWithToolbar,
                            marginTop: this.props.context.runtime ? TOOLBAR_SIZE : undefined,
                        }}
                    >
                        {this.props.children}
                    </div>
                </div>
            );
        }

        // Show only toolbar and no menu
        if (!settings.navigation && settings.navigationBar) {
            return (
                <div style={styles.afterMenuHidden}>
                    {this.renderToolbar(settings)}
                    <div style={styles.viewContentWithToolbar}>{this.props.children}</div>
                </div>
            );
        }

        const menuWidth: 'hidden' | 'full' | 'narrow' = settings.navigationHideOnSelection
            ? 'hidden'
            : this.props.menuWidth;

        const styleMenu: React.CSSProperties = { ...styles.openMenuButton };
        if (this.props.menuWidth === 'full') {
            styleMenu.left = menuFullWidth - TOOLBAR_SIZE;
            Object.assign(styleMenu, styles.openMenuButtonFull);
        } else if (this.props.menuWidth === 'narrow') {
            Object.assign(styleMenu, styles.openMenuButtonNarrow);
        } else {
            Object.assign(styleMenu, styles.openMenuButtonHidden);
            if (settings.navigationBar) {
                styleMenu.opacity = 1;
            }
        }

        const styleView: React.CSSProperties = { ...styles.afterMenu };
        if (!settings.navigationHideMenu) {
            // Menu must be shown
            if (menuWidth === 'full') {
                Object.assign(styleView, styles.afterMenuFull);
                styleView.width = `calc(100% - ${menuFullWidth}px)`;
            } else if (menuWidth === 'narrow') {
                Object.assign(styleView, styles.afterMenuNarrow);
            } else {
                Object.assign(styleView, styles.afterMenuHidden);
            }
        } else {
            Object.assign(styleView, styles.afterMenuHidden);
        }

        return (
            <div style={styles.root}>
                {!settings.navigationHideMenu ? (
                    <div style={styleMenu}>{this.renderOpenMenuButton(settings)}</div>
                ) : null}

                {!settings.navigationHideMenu ? this.renderMenu(settings, menuFullWidth) : null}

                <div style={styleView}>
                    {this.renderToolbar(settings)}
                    <div
                        style={
                            settings.navigationBar ? styles.viewContentWithToolbar : styles.viewContentWithoutToolbar
                        }
                    >
                        {this.props.children}
                    </div>
                </div>
            </div>
        );
    }
}

export default VisNavigation;
