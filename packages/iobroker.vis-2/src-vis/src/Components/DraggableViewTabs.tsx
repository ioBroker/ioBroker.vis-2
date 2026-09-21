import React from 'react';

import { Tab } from '@mui/material';
import { DndContext, MouseSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';

/**
 * The tabs of the open views, which can be put in another order by dragging them.
 *
 * The order of the tabs is the order of `___settings.openedViews`, so a drop moves that entry - see
 * `Editor.moveOpenedView()`. MUI `Tabs` hands its children the props that make a tab work (`value`,
 * `selected`, `onChange`, …), so [[DraggableViewTab]] passes everything it gets on to the `Tab` inside it.
 */

interface ViewTabsDndProps {
    /** Called with the view that was dragged and the one it was dropped on. */
    onMove: (view: string, before: string) => void;
    children: React.ReactNode;
}

/**
 * The frame around the tabs that follows the pointer.
 *
 * The mouse has to travel a few pixels and the finger has to rest a moment before a tab is taken, so that a
 * click on a tab still opens its view.
 *
 * @param props what to do with a drop, and the tabs themselves
 * @returns the tabs, ready to be dragged
 */
export function ViewTabsDnd(props: ViewTabsDndProps): React.JSX.Element {
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    );

    const onDragEnd = (event: DragEndEvent): void => {
        const view = event.active.id as string;
        const before = event.over?.id as string | undefined;
        if (view && before && view !== before) {
            props.onMove(view, before);
        }
    };

    return (
        <DndContext
            sensors={sensors}
            onDragEnd={onDragEnd}
        >
            {props.children}
        </DndContext>
    );
}

interface DraggableViewTabProps {
    /** The view of this tab: what is dragged, and what another tab can be dropped on. */
    view: string;
    /** Everything MUI `Tabs` gives its children, and what the editor sets on the tab. */
    [key: string]: any;
}

/**
 * One tab, which can be taken and dropped on another one.
 *
 * @param props the view it stands for, and the props of the tab
 * @returns the tab
 */
export default function DraggableViewTab(props: DraggableViewTabProps): React.JSX.Element {
    const { view, style, ...tabProps } = props;
    const { listeners, setNodeRef, isDragging } = useDraggable({ id: view });
    const { setNodeRef: setDropNodeRef, isOver } = useDroppable({ id: view });

    const ref = (node: HTMLElement | null): void => {
        setNodeRef(node);
        setDropNodeRef(node);
    };

    return (
        <Tab
            {...tabProps}
            {...listeners}
            ref={ref}
            style={{
                ...style,
                cursor: 'pointer',
                opacity: isDragging ? 0.4 : undefined,
                // the tab that the dragged one would take the place of shows where it would land
                boxShadow: isOver && !isDragging ? 'inset 3px 0 0 currentColor' : undefined,
                touchAction: 'none',
            }}
        />
    );
}
