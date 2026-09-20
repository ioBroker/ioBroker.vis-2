import React, { useEffect, useState, type JSXElementConstructor, type ReactNode } from 'react';

import { IconButton, Tab, Tabs, Tooltip, Typography } from '@mui/material';

import {
    Clear as ClearIcon,
    UnfoldMore as UnfoldMoreIcon,
    UnfoldLess as UnfoldLessIcon,
    ListAlt as IconAttributes,
    Apps as AppsIcon,
    Title as TitleIcon,
    Web as WebIcon,
    Dashboard as DashboardIcon,
    Widgets as WidgetsIcon,
    Css as CssIcon,
    Javascript as JavascriptIcon,
} from '@mui/icons-material';

import { I18n, Utils, type ThemeType, type Connection } from '@iobroker/gui-components';

import type Editor from '@/Editor';
import type { AdditionalIconSet, AnyWidgetId, VisTheme } from '@iobroker/types-vis-2';
import CSS from './CSS';
import Scripts from './Scripts';
import View from './View';
import Section from './Section';
import Widget from './Widget';
import usePrevious from '@/Utilities/usePrevious';
import { store } from '@/Store';

const styles: Record<string, any> = {
    blockHeader: (theme: VisTheme) => theme.classes.blockHeader,
    lightedPanel: (theme: VisTheme) => theme.classes.lightedPanel,
    viewTabs: (theme: VisTheme) => theme.classes.viewTabs,
    viewTab: (theme: VisTheme) => theme.classes.viewTab,
    // about as high as a tab with its name, so the content below keeps its place
    viewTabIcon: {
        px: 1.5,
        py: 1.25,
    },
};

/** Shown instead of the names of the tabs, so that all of them fit into a narrow panel */
const TAB_ICONS: Record<string, React.JSX.Element> = {
    View: <WebIcon />,
    Section: <DashboardIcon />,
    Widget: <WidgetsIcon />,
    CSS: <CssIcon />,
    Scripts: <JavascriptIcon />,
};

const tabs: Record<string, JSXElementConstructor<any> | ((props: Record<string, any>) => ReactNode)> = {
    View,
    Section,
    Widget,
    CSS,
    Scripts,
};

interface AttributesProps {
    themeType: ThemeType;
    openedViews: string[];
    adapterName: string;
    instance: number;
    projectName: string;
    saveCssFile: Editor['saveCssFile'];
    editMode: boolean;
    onHide: (hide: boolean) => void;
    adapterId: string;
    userGroups: Editor['state']['userGroups'];
    selectedWidgets: string[];
    /** The section of the grid layout selected by a click on it, see Editor.setSelectedSection() */
    selectedSection: string | null;
    widgetsLoaded: boolean;
    selectedView: string;
    changeProject: Editor['changeProject'];
    socket: Connection;
    fonts: string[];
    cssClone: Editor['cssClone'];
    onPxToPercent: Editor['onPxToPercent'];
    onPercentToPx: Editor['onPercentToPx'];
    theme: VisTheme;
    additionalSets: AdditionalIconSet;
}

const Attributes = (props: AttributesProps): React.JSX.Element | null => {
    const [selected, setSelected] = useState(window.localStorage.getItem('Attributes') || 'View');
    const [isAllOpened, setIsAllOpened] = useState(false);
    const [isAllClosed, setIsAllClosed] = useState(true);
    const [triggerAllOpened, setTriggerAllOpened] = useState(0);
    const [triggerAllClosed, setTriggerAllClosed] = useState(0);
    const [tabIcons, setTabIcons] = useState(window.localStorage.getItem('Attributes.tabIcons') === 'true');

    const prevSelectedWidgets = usePrevious(props.selectedWidgets);
    const prevSelectedSection = usePrevious(props.selectedSection);

    useEffect(() => {
        if (selected === 'Widget' && !props.selectedWidgets.length) {
            setSelected('View');
        }
        if (prevSelectedWidgets && !prevSelectedWidgets.length && props.selectedWidgets.length) {
            setSelected('Widget');
        }
    }, [props.selectedWidgets]);

    // a section selected by a click on it is to be edited now
    useEffect(() => {
        if (props.selectedSection && props.selectedSection !== prevSelectedSection) {
            setSelected('Section');
        }
    }, [props.selectedSection]);

    if (!props.openedViews.length) {
        return null;
    }

    // only a view in the grid layout has sections
    const viewData = store.getState().visProject[props.selectedView];
    const gridLayout = viewData?.settings?.layout === 'grid';
    // and only the relative widgets are in them - an absolute widget or a member of a group has no section
    const outOfGrid = props.selectedWidgets.some(wid => {
        const widget = viewData?.widgets?.[wid as AnyWidgetId];
        const position = widget?.style?.position;
        return (
            !!widget &&
            (!!widget.grouped || (position !== 'relative' && position !== 'static' && position !== 'sticky'))
        );
    });
    const tabList =
        gridLayout && !outOfGrid
            ? ['View', 'Section', 'Widget', 'CSS', 'Scripts']
            : ['View', 'Widget', 'CSS', 'Scripts'];
    // the chosen tab is kept, so the section comes back with the next relative widget
    const current = tabList.includes(selected) ? selected : props.selectedWidgets.length ? 'Widget' : 'View';

    const TabContent: JSXElementConstructor<any> | ((props_: Record<string, any>) => ReactNode) = tabs[current];

    return (
        <>
            <Typography
                variant="h6"
                gutterBottom
                sx={Utils.getStyle(props.theme, styles.blockHeader, styles.lightedPanel)}
                style={{
                    display: 'flex',
                    lineHeight: '34px',
                    height: 34,
                }}
            >
                <IconAttributes style={{ marginTop: 4, marginRight: 4 }} />
                {I18n.t('Attributes')}
                <Tooltip
                    title={I18n.t(tabIcons ? 'Show tab names' : 'Show tab icons')}
                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                >
                    <IconButton
                        size="small"
                        style={{ marginLeft: 4 }}
                        onClick={() => {
                            window.localStorage.setItem('Attributes.tabIcons', tabIcons ? 'false' : 'true');
                            setTabIcons(!tabIcons);
                        }}
                    >
                        {tabIcons ? <TitleIcon /> : <AppsIcon />}
                    </IconButton>
                </Tooltip>
                <div style={{ flex: 1 }}></div>
                {current === 'View' || current === 'Section' || current === 'Widget' ? (
                    <div style={{ textAlign: 'right' }}>
                        {!isAllOpened ? (
                            <Tooltip
                                title={I18n.t('Expand all')}
                                slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                            >
                                <IconButton
                                    size="small"
                                    onClick={() => setTriggerAllOpened(triggerAllOpened + 1)}
                                >
                                    <UnfoldMoreIcon />
                                </IconButton>
                            </Tooltip>
                        ) : (
                            <IconButton
                                size="small"
                                disabled
                            >
                                <UnfoldMoreIcon />
                            </IconButton>
                        )}
                        {!isAllClosed ? (
                            <Tooltip
                                title={I18n.t('Collapse all')}
                                slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                            >
                                <IconButton onClick={() => setTriggerAllClosed(triggerAllClosed + 1)}>
                                    <UnfoldLessIcon />
                                </IconButton>
                            </Tooltip>
                        ) : (
                            <IconButton
                                size="small"
                                disabled
                            >
                                <UnfoldLessIcon />
                            </IconButton>
                        )}
                    </div>
                ) : null}
                <Tooltip
                    title={I18n.t('Hide attributes')}
                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                >
                    <IconButton
                        size="small"
                        onClick={() => props.onHide(true)}
                    >
                        <ClearIcon />
                    </IconButton>
                </Tooltip>
            </Typography>
            <Tabs
                // built anew, so that it decides at once whether it still needs its scroll buttons
                key={tabIcons ? 'icons' : 'names'}
                sx={styles.viewTabs}
                value={current}
                variant="scrollable"
                scrollButtons="auto"
            >
                {tabList.map(tab => (
                    <Tab
                        label={tabIcons ? undefined : I18n.t(tab)}
                        icon={tabIcons ? TAB_ICONS[tab] : undefined}
                        // the name, when only the icon is shown
                        title={tabIcons ? I18n.t(tab) : undefined}
                        aria-label={I18n.t(tab)}
                        value={tab}
                        disabled={tab === 'Widget' && !props.selectedWidgets.length}
                        key={tab}
                        sx={tabIcons ? [styles.viewTab, styles.viewTabIcon] : styles.viewTab}
                        onClick={() => {
                            setSelected(tab);
                            window.localStorage.setItem('Attributes', tab);
                        }}
                    />
                ))}
            </Tabs>
            <div style={{ height: 'calc(100% - 89px', overflowY: 'hidden' }}>
                {current === 'Widget' &&
                !(props.widgetsLoaded && props.selectedView && props.selectedWidgets?.length) ? null : (
                    <TabContent
                        key={current}
                        {...props}
                        adapterId={props.adapterId}
                        adapterName={props.adapterName}
                        classes={{}}
                        setIsAllOpened={setIsAllOpened}
                        setIsAllClosed={setIsAllClosed}
                        isAllOpened={isAllOpened}
                        isAllClosed={isAllClosed}
                        triggerAllOpened={triggerAllOpened}
                        triggerAllClosed={triggerAllClosed}
                        additionalSets={props.additionalSets}
                    />
                )}
            </div>
        </>
    );
};

export default Attributes;
