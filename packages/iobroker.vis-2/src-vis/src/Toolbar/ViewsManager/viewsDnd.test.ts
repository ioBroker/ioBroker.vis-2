import { describe, expect, it } from 'vitest';

import type { Project } from '@iobroker/types-vis-2';

import type { FolderType } from './Folder';
import { canDropInto, type FolderDragData, type ViewDragData } from './viewsDnd';

const folder = (id: string, parentId = ''): FolderType => ({ id, name: id, parentId });

/**
 * A tree of three folders, one inside the next, and three views:
 *
 *     root
 *      +- outer          <- viewInOuter
 *      |   +- middle
 *      |       +- inner
 *      +- other
 *     viewAtRoot, viewInOther
 */
const FOLDERS = [folder('outer'), folder('middle', 'outer'), folder('inner', 'middle'), folder('other')];

const project = {
    viewAtRoot: {},
    viewInOuter: { parentId: 'outer' },
    viewInOther: { parentId: 'other' },
    ___settings: { folders: FOLDERS },
} as unknown as Project;

const draggedView = (name: string): ViewDragData => ({ kind: 'view', name, preview: null as any });
const draggedFolder = (id: string): FolderDragData => ({
    kind: 'folder',
    folder: FOLDERS.find(f => f.id === id)!,
    preview: null as any,
});

describe('canDropInto - a view', () => {
    it('may go into a folder it is not in', () => {
        expect(canDropInto(draggedView('viewAtRoot'), folder('outer'), project)).toBe(true);
    });

    it('may not go into the folder it is already in', () => {
        expect(canDropInto(draggedView('viewInOuter'), folder('outer'), project)).toBe(false);
    });

    it('may go back to the root when it sits in a folder', () => {
        expect(canDropInto(draggedView('viewInOuter'), null, project)).toBe(true);
    });

    it('may not go to the root when it is already there', () => {
        expect(canDropInto(draggedView('viewAtRoot'), null, project)).toBe(false);
    });

    it('says no for a view the project does not know', () => {
        expect(canDropInto(draggedView('gone'), null, project)).toBe(false);
    });
});

describe('canDropInto - a folder', () => {
    it('may go into an unrelated folder', () => {
        expect(canDropInto(draggedFolder('other'), FOLDERS[0], project)).toBe(true);
    });

    it('may not go into the folder it is already in', () => {
        expect(canDropInto(draggedFolder('middle'), FOLDERS[0], project)).toBe(false);
    });

    it('may not go into itself', () => {
        expect(canDropInto(draggedFolder('outer'), FOLDERS[0], project)).toBe(false);
    });

    it('may not go into one of its own children', () => {
        // dropping `outer` into `inner` would take the whole branch out of the tree
        expect(canDropInto(draggedFolder('outer'), FOLDERS[2], project)).toBe(false);
    });

    it('may go into a deeper folder that is not below it', () => {
        expect(canDropInto(draggedFolder('other'), FOLDERS[2], project)).toBe(true);
    });

    it('may go to the root when it sits in a folder', () => {
        expect(canDropInto(draggedFolder('middle'), null, project)).toBe(true);
    });

    it('may not go to the root when it is already there', () => {
        expect(canDropInto(draggedFolder('outer'), null, project)).toBe(false);
    });

    it('stops instead of looping when the chain of parents is broken', () => {
        const broken = {
            ___settings: { folders: [folder('orphan', 'missing')] },
        } as unknown as Project;
        expect(canDropInto(draggedFolder('other'), folder('orphan', 'missing'), broken)).toBe(true);
    });

    it('copes with a project that has no folders at all', () => {
        const empty = { ___settings: {} } as unknown as Project;
        expect(canDropInto(draggedFolder('other'), folder('outer'), empty)).toBe(true);
    });
});
