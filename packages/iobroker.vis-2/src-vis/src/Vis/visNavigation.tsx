import React from 'react';

import {
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

import { ChevronLeft as ChevronLeftIcon, Dashboard as DashboardIcon } from '@mui/icons-material';

import { Utils, Icon } from '@iobroker/adapter-react-v5';
import type { ViewSettings, VisContext, VisTheme } from '@iobroker/types-vis-2';

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
    verticalMenu: (theme: VisTheme): React.CSSProperties => ({
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
    color: string;
    icon: string;
    noText: boolean;
    order: number;
    view: string;
}

class VisNavigation extends React.Component<VisNavigationProps> {
    renderMenu(settings: ViewSettings, menuFullWidth: number): React.JSX.Element {
        const items: MenuItem[] = [];

        Object.keys(this.props.context.views).forEach(view => {
            if (view === '___settings') {
                return;
            }
            const viewSettings = this.props.context.views[view].settings;
            if (viewSettings.navigation) {
                const item = {
                    text:
                        settings.navigationOrientation === 'horizontal' && viewSettings.navigationOnlyIcon
                            ? null
                            : viewSettings.navigationTitle || view,
                    color: viewSettings.navigationColor,
                    icon: viewSettings.navigationIcon || viewSettings.navigationImage,
                    noText: viewSettings.navigationOnlyIcon,
                    order: parseInt((viewSettings.navigationOrder as any as string) || '0'),
                    view,
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

        if (settings.navigationOrientation === 'horizontal') {
            return (
                <Box
                    component="div"
                    sx={styles.verticalMenu}
                    style={{
                        backgroundColor:
                            settings.navigationBarColor || this.props.context.theme.palette.background.paper,
                        opacity: this.props.editMode ? 0.4 : 1,
                        position: this.props.context.runtime ? 'fixed' : 'relative',
                    }}
                >
                    <Tabs value={this.props.activeView}>
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
                    <List>
                        {items.map((item, index) => {
                            const menuItem = (
                                <ListItem
                                    key={index}
                                    disablePadding
                                    sx={Utils.getStyle(
                                        this.props.theme,
                                        styles.menuItem,
                                        this.props.activeView === item.view && styles.selectedMenu,
                                    )}
                                    style={{
                                        backgroundColor:
                                            this.props.activeView === item.view
                                                ? settings.navigationSelectedBackground
                                                : undefined,
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
                                                    style={{
                                                        color:
                                                            this.props.activeView === item.view
                                                                ? settings.navigationSelectedColor
                                                                : settings.navigationColor,
                                                        backgroundColor: 'rgba(1,1,1,0)',
                                                    }}
                                                    sx={Utils.getStyle(
                                                        this.props.theme,
                                                        styles.listItemIcon,
                                                        this.props.activeView === item.view && styles.selectedMenu,
                                                    )}
                                                />
                                            ) : (
                                                <>
                                                    <DashboardIcon
                                                        style={{
                                                            color:
                                                                this.props.activeView === item.view
                                                                    ? settings.navigationSelectedColor
                                                                    : settings.navigationColor,
                                                            backgroundColor: 'rgba(1,1,1,0)',
                                                        }}
                                                        sx={Utils.getStyle(
                                                            this.props.theme,
                                                            this.props.menuWidth !== 'full' && styles.transparent,
                                                            this.props.activeView === item.view && styles.selectedMenu,
                                                        )}
                                                    />
                                                    {item.text ? (
                                                        <span
                                                            style={{
                                                                ...styles.listItemIconText,
                                                                ...(this.props.menuWidth === 'full'
                                                                    ? styles.transparent
                                                                    : undefined),
                                                                color:
                                                                    this.props.activeView === item.view
                                                                        ? settings.navigationSelectedColor
                                                                        : settings.navigationColor,
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
                                            style={{
                                                color:
                                                    this.props.activeView === item.view
                                                        ? settings.navigationSelectedColor
                                                        : settings.navigationColor,
                                            }}
                                            sx={{
                                                '&.MuListItemText-primary': Utils.getStyle(
                                                    this.props.theme,
                                                    styles.listItemText,
                                                    this.props.activeView === item.view &&
                                                        !settings.navigationSelectedColor &&
                                                        styles.selectedMenu,
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
                                    key={index}
                                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                >
                                    {menuItem}
                                </Tooltip>
                            );
                        })}
                    </List>
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

        let icon: string = settings.navigationBarIcon || settings.navigationBarImage;
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
        if (!this.props.context.views || !this.props.context.views[this.props.view]) {
            return null;
        }

        const settings: ViewSettings = this.props.context.views[this.props.view].settings;
        const menuFullWidth = parseInt(settings.navigationWidth as any as string, 10) || MENU_WIDTH_FULL;

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
