import React, { useEffect, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';

import { Box, IconButton, Tooltip } from '@mui/material';
import { Delete as DeleteIcon, Update as UpdateIcon, Block as DeletedIcon } from '@mui/icons-material';

import { I18n, Utils, type Connection, type ThemeType } from '@iobroker/gui-components';

import type { MarketplaceWidgetRevision, Project } from '@iobroker/types-vis-2';

import { store } from '@/Store';
import type { WidgetType } from '@/Vis/visWidgetsCatalog';
import helpers from '../Components/wizardHelpers';

const IMAGE_TYPES = ['.png', '.jpg', '.svg', '.gif', '.apng', '.avif', '.webp'];

const styles: Record<string, any> = {
    widget: {
        borderStyle: 'solid',
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 8,
        backgroundColor: 'orange',
        width: '100%',
        display: 'inline-flex',
        margin: 4,
        minHeight: 36,
    },
    widgetTitle: {
        textAlign: 'left',
        marginLeft: 8,
        flex: 1,
        alignSelf: 'center',
        color: 'black',
    },
    widgetImage: {
        // transform: 'scale(0.3)',
        width: 30,
        height: 30,
        transformOrigin: '0 0',
    },
    widgetImageWithSrc: {
        maxWidth: 60,
        maxHeight: 32,
        width: 'auto',
        borderRadius: 4,
    },
    /*
     * The preview in the tooltip, drawn from the same source as the one in the row but at its own size. It used
     * to be the very same element, and the tooltip tried to enlarge it through `& $widgetImage` - which is the
     * syntax of JSS and means nothing to `sx`, and could not have won anyway: the size of the preview sits in
     * an inline style, and no stylesheet beats that. The tooltip therefore showed the small preview.
     */
    widgetImageTooltip: {
        maxWidth: 180,
        maxHeight: 110,
        width: 'auto',
        borderRadius: 4,
    },
    widgetTooltipTitle: {
        fontWeight: 'bold',
        marginBottom: 4,
    },
    widgetTooltipHelp: {
        marginTop: 6,
        maxWidth: 260,
        whiteSpace: 'normal',
        lineHeight: 1.35,
    },
    widgetImageContainer: {
        // borderLeftStyle: 'solid',
        // borderLeftWidth: 1,
        // borderLeftColor: 'gray',
        display: 'flex',
        padding: 4,
        alignItems: 'center',
        overflow: 'hidden',
    },
    widgetMarketplace: {
        fontSize: '80%',
        fontStyle: 'italic',
    },
    widgetDeleted: {
        marginTop: 9,
        color: '#F00',
    },
    /*
     * The tile of the icon view. The preview leads and the name follows underneath, so a widget is found by
     * what it looks like - which is what one remembers of it. The tile itself stays in the colour of the
     * panel: a fill in the colour of the widget set would be a wall of it here, and it is exactly the thing
     * the preview has to be read against. The colour comes back on hover, on the border.
     */
    widgetTile: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        boxSizing: 'border-box',
        width: '100%',
        height: 74,
        padding: '4px',
        borderRadius: '6px',
        borderStyle: 'solid',
        borderWidth: 1,
        cursor: 'grab',
    },
    widgetTileImage: {
        height: 34,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    widgetTileImageWithSrc: {
        maxWidth: '100%',
        maxHeight: 34,
        width: 'auto',
        borderRadius: 4,
    },
    widgetTileTitle: {
        // 10px, not 11: at 11 a single word as long as "Zeichenfolge" no longer fits the 62px a tile leaves
        // it, and breaking a word in the middle is what makes a wall of tiles hard to read
        fontSize: 10,
        lineHeight: 1.15,
        textAlign: 'center',
        // two lines at most, the rest is in the tooltip
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        // break inside a word only when it really does not fit; a name of two words breaks at the space
        wordBreak: 'normal',
        overflowWrap: 'anywhere',
    },
};

const WIDGET_ICON_HEIGHT = 34;

interface WidgetProps {
    /** How the palette draws its entries: `grid` shows the preview with the name under it, `full` the row */
    view?: 'grid' | 'full';
    /**
     * Which part of the palette this entry is drawn in - empty for the widget set it belongs to.
     *
     * The same widget appears twice as soon as it is in "recently used" as well, and both entries would
     * otherwise be called the same: dnd-kit keeps its draggables by id, so the second one to register took
     * the place of the first and a drag started on one moved the other. The id in the DOM would be a
     * duplicate too - the GUI test looks a widget up by it.
     */
    section?: string;
    widgetSetProps?: Record<string, any>;
    widgetSet: string;
    widgetType: WidgetType;
    widgetTypeName: string;
    socket?: Connection;
    themeType: ThemeType;
    changeProject?: (project: Project, ignoreHistory?: boolean) => Promise<void>;
    changeView?: (view: string) => void;
    editMode: boolean;
    widgetMarketplaceId?: string;
    selectedView: string;

    /** Used for a marketplace */
    updateWidgets?: (widget: MarketplaceWidgetRevision) => void;
    uninstallWidget?: (widgetId: string) => void;
    marketplace?: MarketplaceWidgetRevision;
    marketplaceUpdates?: MarketplaceWidgetRevision[];
    marketplaceDeleted?: string[];
}

/** What a palette entry hands over while it is dragged. `ViewDrop` in the editor reads it back. */
export interface WidgetDragData {
    kind: 'widget';
    widgetSet: string;
    widgetType: WidgetType | MarketplaceWidgetRevision;
    preview: React.JSX.Element;
}

const Widget = (props: WidgetProps): React.JSX.Element | null => {
    const imageRef = useRef<HTMLSpanElement>(null);
    const style: React.CSSProperties = {};

    useEffect(() => {
        if (imageRef.current?.children[0]) {
            const height = imageRef.current.children[0].clientHeight;
            if (height > WIDGET_ICON_HEIGHT) {
                imageRef.current.style.transform = `scale(${WIDGET_ICON_HEIGHT / height})`;
            }
        }
    }, [imageRef]);

    if (props.widgetType?.color) {
        style.backgroundColor = props.widgetType.color;
    } else if (props.widgetSetProps?.color) {
        style.backgroundColor = props.widgetSetProps.color;
    } else if (window.visSets?.[props.widgetSet]?.color) {
        style.backgroundColor = window.visSets[props.widgetSet].color;
    }

    const titleStyle: React.CSSProperties = {};
    if (style.backgroundColor) {
        if (Utils.isUseBright(style.backgroundColor)) {
            titleStyle.color = 'white';
        } else {
            titleStyle.color = 'black';
        }
    }

    /**
     * The preview of the widget.
     *
     * @param imageStyle - how big it is drawn; the row and the tooltip ask for different sizes
     * @param ref - only the preview in the row is measured, the one in the tooltip is not
     */
    const renderPreview = (
        imageStyle: React.CSSProperties,
        ref?: React.RefObject<HTMLSpanElement | null>,
    ): React.JSX.Element => {
        if (props.widgetType.preview?.startsWith('<img')) {
            const m =
                props.widgetType.preview.match(/src="([^"]+)"/) || props.widgetType.preview.match(/src='([^']+)'/);
            if (m) {
                return (
                    <img
                        src={m[1]}
                        style={imageStyle}
                        alt={props.widgetType.name}
                        // the entry is the draggable, not the picture inside it
                        draggable={false}
                    />
                );
            }
        } else if (
            props.widgetType.preview &&
            (IMAGE_TYPES.find(ext => (props.widgetType.preview || '').toLowerCase().endsWith(ext)) ||
                props.widgetSet === '__marketplace')
        ) {
            return (
                <img
                    src={props.widgetType.preview}
                    style={imageStyle}
                    alt={props.widgetType.name}
                    draggable={false}
                    onError={e => {
                        if (e.target) {
                            (e.target as HTMLImageElement).onerror = null;
                            (e.target as HTMLImageElement).src = './img/no-image.svg';
                            (e.target as HTMLImageElement).style.height = '24px';
                        }
                    }}
                />
            );
        }

        // no image: the preview is a piece of HTML that draws the widget itself
        return (
            <span
                style={styles.widgetImage}
                ref={ref}
                dangerouslySetInnerHTML={{ __html: props.widgetType.preview || '' }}
            />
        );
    };

    const isGrid = props.view === 'grid';
    /** Unique for this entry, not only for the widget type - see `section` */
    const entryId = `widget_${props.section ? `${props.section}_` : ''}${props.widgetTypeName}`;
    const img = renderPreview(isGrid ? styles.widgetTileImageWithSrc : styles.widgetImageWithSrc, imageRef);

    let label = props.widgetType.label ? I18n.t(props.widgetType.label) : window.vis._(props.widgetType.title || '');
    // remove legacy stuff
    label = label.split('<br')[0];
    label = label.split('<span')[0];
    label = label.split('<div')[0];

    let marketplaceUpdate: MarketplaceWidgetRevision | null = null;
    let marketplaceDeleted;
    if (props.widgetSet === '__marketplace') {
        marketplaceUpdate = props.marketplaceUpdates?.find(u => u.widget_id === props.widgetMarketplaceId) || null;
        marketplaceDeleted = props.marketplaceDeleted?.includes(props.widgetMarketplaceId || '');
    }

    const result = (
        <Tooltip
            title={
                <Box component="div">
                    {/* the name only in the icon view, where the tile may have had to cut it off */}
                    {isGrid ? <div style={styles.widgetTooltipTitle}>{label}</div> : null}
                    <div>{renderPreview(styles.widgetImageTooltip)}</div>
                    {props.widgetType.help ? (
                        <div style={styles.widgetTooltipHelp}>{I18n.t(props.widgetType.help)}</div>
                    ) : null}
                </Box>
            }
            slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
            placement="right-end"
        >
            {isGrid ? (
                <Box
                    component="div"
                    sx={theme => ({
                        ...styles.widgetTile,
                        backgroundColor:
                            theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                        borderColor: theme.palette.divider,
                        '&:hover': {
                            // the colour of the widget set, which the fill used to carry all the time
                            borderColor: style.backgroundColor || theme.palette.primary.main,
                            backgroundColor:
                                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.09)' : 'rgba(0, 0, 0, 0.07)',
                        },
                    })}
                >
                    <span style={{ display: 'none' }}>{props.widgetTypeName}</span>
                    <div style={styles.widgetTileImage}>{img}</div>
                    <div style={styles.widgetTileTitle}>{label}</div>
                </Box>
            ) : (
                <div style={{ ...styles.widget, ...style }}>
                    <span style={{ display: 'none' }}>{props.widgetTypeName}</span>
                    <div style={{ ...styles.widgetTitle, ...titleStyle }}>
                        <div>{label}</div>
                        {props.widgetSet === '__marketplace' && props.marketplace && (
                            <div style={styles.widgetMarketplace}>
                                {`${I18n.t('version')} ${props.marketplace.version}`}
                            </div>
                        )}
                    </div>
                    {props.widgetSet === '__marketplace' && (
                        <>
                            <Tooltip
                                title={I18n.t('Uninstall')}
                                slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                            >
                                <IconButton onClick={() => props.uninstallWidget?.(props.widgetType.name)}>
                                    <DeleteIcon />
                                </IconButton>
                            </Tooltip>
                            {marketplaceUpdate && (
                                <Tooltip
                                    title={`${I18n.t('Update to version')} ${marketplaceUpdate.version}`}
                                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                >
                                    <IconButton
                                        onClick={() => marketplaceUpdate && props.updateWidgets?.(marketplaceUpdate)}
                                    >
                                        <UpdateIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                            {marketplaceDeleted && (
                                <Tooltip
                                    title={I18n.t('Widget was deleted in widgeteria')}
                                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                >
                                    <DeletedIcon style={styles.widgetDeleted} />
                                </Tooltip>
                            )}
                        </>
                    )}
                    <span style={styles.widgetImageContainer}>{img}</span>
                </div>
            )}
        </Tooltip>
    );

    const widthRef = useRef<HTMLSpanElement>(null);
    // dnd-kit re-reads `data` when the drag starts, so the preview is built from the current render and the
    // lazy `item()` react-dnd needed here is gone. There is no `getEmptyImage()` either: nothing native is
    // dragged, so the browser draws no ghost that would have to be hidden.
    // `attributes` of dnd-kit are left out on purpose: they would put `role="button"` on this span, and a
    // palette entry has real buttons of its own inside it for the marketplace widgets
    const { listeners, setNodeRef } = useDraggable({
        id: entryId,
        disabled: !props.editMode,
        data: {
            kind: 'widget',
            widgetSet: props.widgetSet,
            widgetType: props.widgetType,
            preview: <div style={{ width: widthRef.current?.offsetWidth || 100 }}>{result}</div>,
        } satisfies WidgetDragData,
    });

    if (typeof props.widgetType.customPalette === 'function') {
        if (!props.editMode) {
            return null;
        }
        return props.widgetType.customPalette({
            socket: props.socket!,
            project: store.getState().visProject,
            changeProject: props.changeProject!,
            selectedView: props.selectedView,
            changeView: props.changeView!,
            themeType: props.themeType,
            helpers,
        });
    }

    return (
        <span
            ref={props.editMode ? setNodeRef : null}
            id={entryId}
            // The entries of "recently used" are copies of entries that stand in their set as well, and their id
            // carries the section to stay unique. The GUI test walks `.widget-<set>` and reads the type out of
            // the id, so a copy would give it `recent_tplSomething` - a widget type that does not exist. The
            // copies are therefore not part of their set here; `data-widget-type` names the type for anything
            // that wants it without going through the id.
            className={props.section ? `widget-section-${props.section}` : `widget-${props.widgetSet}`}
            data-widget-type={props.widgetTypeName}
            style={isGrid ? { display: 'block' } : undefined}
            {...(props.editMode ? listeners : undefined)}
        >
            <span
                ref={widthRef}
                style={isGrid ? { display: 'block' } : undefined}
            >
                {result}
            </span>
        </span>
    );
};

export default Widget;
