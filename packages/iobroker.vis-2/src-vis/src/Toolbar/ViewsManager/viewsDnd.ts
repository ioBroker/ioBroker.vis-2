import { useDndContext } from '@dnd-kit/core';

import type { Project } from '@iobroker/types-vis-2';

import type { FolderType } from './Folder';

/** A view being dragged in the views manager */
export interface ViewDragData {
    kind: 'view';
    name: string;
    preview: React.JSX.Element;
}

/** A folder being dragged in the views manager */
export interface FolderDragData {
    kind: 'folder';
    folder: FolderType;
    preview: React.JSX.Element;
}

export type ViewsDragData = ViewDragData | FolderDragData;

/** What a drop target of the views manager registers. `null` as the folder is the root of the tree. */
export interface ViewsDropData {
    kind: 'viewsTarget';
    folder: FolderType | null;
}

/**
 * Whether the dragged view or folder may be dropped into the given folder.
 *
 * This used to sit twice in the tree, once in `Folder` and once in `Root`, written against the monitor of
 * react-dnd. Both said the same thing, so it is one function now - which also makes the rule testable.
 *
 * @param item the view or folder being dragged
 * @param target the folder it is held over, or `null` for the root
 * @param project the project the two live in
 * @returns true if dropping it there would change anything and would not put a folder inside itself
 */
export function canDropInto(item: ViewsDragData, target: FolderType | null, project: Project): boolean {
    if (item.kind === 'view') {
        const parentId = project[item.name]?.parentId;
        // dropping it where it already is changes nothing
        return target ? parentId !== target.id : !!parentId;
    }

    if (!target) {
        return !!item.folder.parentId;
    }
    if (target.id === item.folder.parentId) {
        return false;
    }

    // walk up from the target: a folder can go neither into itself nor into one of its own children
    const folders = project.___settings.folders || [];
    let current: FolderType | undefined = target;
    while (current) {
        if (current.id === item.folder.id) {
            return false;
        }
        if (!current.parentId) {
            return true;
        }
        const parentId: string = current.parentId;
        current = folders.find(folder => folder.id === parentId);
    }

    // the chain of parents broke off somewhere - nothing above it can be the folder being dragged
    return true;
}

/**
 * What is being dragged in the views manager right now, or null while nothing is.
 *
 * Every folder used to be told this through props by the item that started the drag. dnd-kit keeps it in its
 * own context, so each target can simply ask.
 */
export function useDraggedItem(): ViewsDragData | null {
    const { active } = useDndContext();
    const data = active?.data.current as ViewsDragData | undefined;
    return data?.kind === 'view' || data?.kind === 'folder' ? data : null;
}
