import React, { useRef, useState } from 'react';
import { Menu, MenuItem } from '@mui/material';
import { ArrowRight as ArrowRightIcon } from '@mui/icons-material';

interface NestedMenuItemProps {
    /** Text or element shown in the row */
    label: React.ReactNode;
    /** Icon in front of the label, in the same column as the icons of the plain entries */
    leftIcon?: React.ReactNode;
    disabled?: boolean;
    /** Is the menu this entry lives in open? The sub menu must close together with it */
    parentMenuOpen: boolean;
    onContextMenu?: React.MouseEventHandler<HTMLLIElement>;
    children: React.ReactNode;
}

/**
 * A menu entry that opens a sub menu next to itself.
 *
 * This used to come from `mui-nested-menu`, which is unmaintained and whose peer range stops at MUI 7. It was the
 * only thing that package was used for, so it lives here now.
 *
 * The sub menu is a `Menu` whose root lets the pointer through (`pointerEvents: none`) while its paper catches it
 * again - without that the invisible backdrop of the menu would swallow the mouse and the entry would close as
 * soon as the pointer tries to travel into the sub menu.
 */
export default function NestedMenuItem(props: NestedMenuItemProps): React.JSX.Element {
    const itemRef = useRef<HTMLLIElement>(null);
    const [open, setOpen] = useState(false);

    const isOpen = open && props.parentMenuOpen;

    return (
        <>
            <MenuItem
                ref={itemRef}
                disabled={props.disabled}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
                onContextMenu={props.onContextMenu}
                onKeyDown={e => {
                    if (e.key === 'ArrowRight') {
                        setOpen(true);
                    } else if (e.key === 'ArrowLeft') {
                        setOpen(false);
                    }
                }}
                sx={{ display: 'flex', alignItems: 'center' }}
            >
                <span style={{ width: 40, display: 'flex', alignItems: 'center' }}>{props.leftIcon}</span>
                <span style={{ flexGrow: 1 }}>{props.label}</span>
                <ArrowRightIcon fontSize="small" />
            </MenuItem>
            <Menu
                open={isOpen}
                anchorEl={itemRef.current}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                // the sub menu must not steal the focus or close the menu it belongs to
                autoFocus={false}
                disableAutoFocus
                disableEnforceFocus
                disableRestoreFocus
                hideBackdrop
                onClose={() => setOpen(false)}
                sx={{ pointerEvents: 'none' }}
                slotProps={{
                    paper: {
                        onMouseEnter: () => setOpen(true),
                        onMouseLeave: () => setOpen(false),
                        sx: { pointerEvents: 'auto' },
                    },
                }}
            >
                {props.children}
            </Menu>
        </>
    );
}
