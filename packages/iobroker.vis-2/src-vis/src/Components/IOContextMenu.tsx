import React, { useState } from 'react';

import { Menu, MenuItem } from '@mui/material';

import NestedMenuItem from './NestedMenuItem';

import { I18n } from '@iobroker/gui-components';

interface MenuItem {
    label: string;
    subLabel?: string;
    hide?: boolean;
    items?: MenuItem[];
    leftIcon?: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    /** Called when the pointer comes onto the entry and again when it leaves - to preview what it would do */
    onHover?: (hovered: boolean) => void;
    style?: React.CSSProperties;
}

const contextMenuItems = (items: MenuItem[], open: boolean, onClose: () => void): (React.JSX.Element | null)[] =>
    items.map((item, key: number) => {
        if (!item || item.hide) {
            return null;
        }

        if (item.items) {
            return (
                <NestedMenuItem
                    key={key}
                    leftIcon={item.leftIcon}
                    disabled={item.disabled}
                    label={I18n.t(item.label)}
                    parentMenuOpen={open}
                    onContextMenu={e => {
                        e.stopPropagation();
                        e.preventDefault();
                    }}
                >
                    {contextMenuItems(item.items, open, onClose)}
                </NestedMenuItem>
            );
        }

        return (
            <MenuItem
                key={key}
                onClick={() => {
                    item.onClick && item.onClick();
                    onClose();
                }}
                onMouseEnter={() => item.onHover?.(true)}
                onMouseLeave={() => item.onHover?.(false)}
                disabled={item.disabled}
                sx={{ display: 'block' }}
                onContextMenu={e => {
                    e.stopPropagation();
                    e.preventDefault();
                    item.onClick && item.onClick();
                    onClose();
                }}
            >
                <span style={{ display: 'flex', alignItems: 'center', ...item.style }}>
                    <span style={{ width: 40 }}>{item.leftIcon}</span>
                    {I18n.t(item.label)}
                </span>
                {item.subLabel ? (
                    <span
                        style={{
                            fontSize: 10,
                            fontWeight: 'normal',
                            display: 'block',
                            paddingLeft: 40,
                            marginTop: -6,
                        }}
                    >
                        {item.subLabel}
                    </span>
                ) : null}
            </MenuItem>
        );
    });

interface IOContextMenuProps {
    children: React.ReactNode;
    disabled: boolean;
    menuItemsData: (position: { top: number; left: number }) => any;
    /** The menu is gone - whatever an entry showed while it was pointed at has to go with it */
    onClosed?: () => void;
}

const IOContextMenu = (props: IOContextMenuProps): React.JSX.Element => {
    const [menuPosition, setMenuPosition] = useState<null | { top: number; left: number }>(null);

    const closeMenu = (): void => {
        setMenuPosition(null);
        props.onClosed?.();
    };

    const handleRightClick: React.MouseEventHandler<HTMLDivElement> = async (
        event: React.MouseEvent<HTMLDivElement>,
    ) => {
        if (props.disabled || event.ctrlKey || event.shiftKey) {
            return;
        }
        event.preventDefault();
        if (menuPosition) {
            closeMenu();
            await new Promise(resolve => {
                setTimeout(resolve, 200);
            });
        }
        setMenuPosition({
            top: event.pageY,
            left: event.pageX,
        });
    };

    return (
        <div
            onContextMenu={handleRightClick}
            style={{ height: '100%', width: '100%' }}
        >
            {props.children}
            {menuPosition ? (
                <Menu
                    open={!0}
                    onClose={closeMenu}
                    anchorReference="anchorPosition"
                    anchorPosition={menuPosition}
                >
                    {contextMenuItems(props.menuItemsData(menuPosition), !!menuPosition, closeMenu)}
                </Menu>
            ) : null}
        </div>
    );
};

export default IOContextMenu;
