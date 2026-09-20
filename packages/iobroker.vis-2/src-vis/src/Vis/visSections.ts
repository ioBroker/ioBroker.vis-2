/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

import type { CSSProperties } from 'react';

import type { VisStateCondition, ViewSection, WidgetData } from '@iobroker/types-vis-2';

import { isConditionMet } from './visConditions';
import { extractBinding } from './visUtils';
import { isShownAtWidth, VISIBILITY_MAX_WIDTH, VISIBILITY_MIN_WIDTH } from './visWidthVisibility';

/**
 * What a section of the grid layout does at runtime, apart from its look: whether it is shown, whether it is open,
 * which states it listens to, and how its header looks. Without the DOM and the store, so that it can be tested.
 */

/** Without a condition chosen, a state is compared for equality - that is what the editor shows first */
export const DEFAULT_CONDITION: VisStateCondition = '==';

/** Whether a string names a state that can be subscribed, and not a special value like `username` of a binding */
function isStateId(id: string | null | undefined): id is string {
    return typeof id === 'string' && id.includes('.') && !id.startsWith('local_');
}

/** The states in the bindings of a text, like `{javascript.0.temp}°C` or `{a:x.y;b:z.w;a+b}` */
export function getBindingStateIds(text: string | null | undefined): string[] {
    const ids: string[] = [];
    if (typeof text !== 'string' || !text.includes('{')) {
        return ids;
    }
    for (const binding of extractBinding(text) || []) {
        if (isStateId(binding.systemOid) && !ids.includes(binding.systemOid)) {
            ids.push(binding.systemOid);
        }
        const args = binding.operations?.[0]?.arg;
        if (Array.isArray(args)) {
            for (const arg of args) {
                const id = (arg as { systemOid?: string }).systemOid;
                if (isStateId(id) && !ids.includes(id)) {
                    ids.push(id);
                }
            }
        }
    }
    return ids;
}

/** These attributes of a section are no values of it: they are never a binding and never formatted */
const NOT_A_VALUE = ['id', 'widgets', 'bindings'];

/** The attributes that are a number; a binding gives a string, which is read as one, see applySectionBindings() */
const NUMBER_ATTRIBUTES = [
    'columnSpan',
    'borderWidth',
    'borderRadius',
    'padding',
    'titleSize',
    'glass',
    'minHeight',
    'rowHeight',
    'gridGap',
    'visibilityMinWidth',
    'visibilityMaxWidth',
];

/** The attributes that are on or off */
const BOOLEAN_ATTRIBUTES = ['divider', 'collapsible', 'collapsed', 'newRow', 'stretch'];

/** Every attribute of a section that may carry a binding, with its value */
function valueEntries(section: ViewSection): [string, string][] {
    return Object.entries(section).filter(
        ([attr, value]) => !NOT_A_VALUE.includes(attr) && typeof value === 'string' && value.includes('{'),
    ) as [string, string][];
}

/** The states a section has to listen to: of its conditions and of the bindings in any of its attributes */
export function getSectionStateIds(section: ViewSection | undefined | null): string[] {
    if (!section || typeof section !== 'object') {
        return [];
    }
    const ids: string[] = [];
    const add = (id: string | null | undefined): void => {
        const trimmed = typeof id === 'string' ? id.trim() : id;
        if (isStateId(trimmed) && !ids.includes(trimmed)) {
            ids.push(trimmed);
        }
    };
    add(section.visibilityOid);
    if (section.collapsible) {
        add(section.expandOid);
    }
    valueEntries(section).forEach(([, value]) => getBindingStateIds(value).forEach(add));
    return ids;
}

/**
 * The section with its bindings applied: every attribute that carries one, like `{javascript.0.temp}°C` in the
 * title or `{javascript.0.alarm}` as the border width, is replaced by what it says at this moment. A number stays
 * a number and a checkbox stays on or off, so the rest works with a section as if it had been written by hand.
 *
 * @param section - the section as it is stored
 * @param format - evaluates one text, see VisView.formatSectionText()
 */
export function applySectionBindings(
    section: ViewSection | undefined | null,
    format: (text: string) => string,
): ViewSection | undefined | null {
    if (!section || typeof section !== 'object') {
        return section;
    }
    const entries = valueEntries(section);
    if (!entries.length) {
        return section;
    }
    const result: Record<string, any> = { ...section };
    for (const [attr, value] of entries) {
        const formatted = format(value);
        if (NUMBER_ATTRIBUTES.includes(attr)) {
            const number = Number(formatted);
            result[attr] = Number.isFinite(number) ? number : null;
        } else if (BOOLEAN_ATTRIBUTES.includes(attr)) {
            result[attr] = formatted === 'true' || formatted === '1' || formatted === 'on';
        } else {
            result[attr] = formatted;
        }
    }
    return result as ViewSection;
}

/** Whether a user is a member of one of the groups - the way a widget checks its `visibility-groups` */
export function isUserInGroups(
    user: string,
    groups: string[] | null | undefined,
    userGroups: Record<string, ioBroker.Object> | undefined | null,
): boolean {
    if (!Array.isArray(groups) || !groups.length) {
        return true;
    }
    return groups.some(groupId => {
        const group = userGroups?.[`system.group.${groupId}`];
        return !!group?.common?.members?.length && group.common.members.includes(`system.user.${user}`);
    });
}

export interface SectionVisibilityContext {
    /** The values of the states, by `<id>.val` */
    states: Record<string, any>;
    /** The width of the view, in px; 0 when it is not known yet */
    width: number;
    user: string;
    userGroups: Record<string, ioBroker.Object> | undefined | null;
}

/** Whether the section is shown to this user at this width with these values of the states */
export function isSectionVisible(section: ViewSection | undefined | null, context: SectionVisibilityContext): boolean {
    if (!section || typeof section !== 'object') {
        return true;
    }
    if (!isUserInGroups(context.user, section.visibilityGroups, context.userGroups)) {
        return false;
    }
    const widths = {
        [VISIBILITY_MIN_WIDTH]: section.visibilityMinWidth,
        [VISIBILITY_MAX_WIDTH]: section.visibilityMaxWidth,
    } as unknown as WidgetData;
    if (!isShownAtWidth(widths, context.width)) {
        return false;
    }
    const oid = typeof section.visibilityOid === 'string' ? section.visibilityOid.trim() : '';
    if (oid) {
        return isConditionMet(
            context.states,
            oid,
            section.visibilityCond || DEFAULT_CONDITION,
            section.visibilityVal,
            section.id,
        );
    }
    return true;
}

/**
 * Whether the section is open.
 *
 * @param section - the section as it is stored
 * @param override - what the user chose by clicking the header, if the choice still counts
 * @param states - the values of the states, by `<id>.val`
 */
export function isSectionOpen(
    section: ViewSection | undefined | null,
    override: boolean | undefined,
    states: Record<string, any>,
): boolean {
    if (!section || typeof section !== 'object' || !section.collapsible) {
        return true;
    }
    if (typeof override === 'boolean') {
        return override;
    }
    const oid = typeof section.expandOid === 'string' ? section.expandOid.trim() : '';
    if (oid) {
        return isConditionMet(states, oid, section.expandCond || DEFAULT_CONDITION, section.expandVal, section.id);
    }
    return !section.collapsed;
}

/** A section has a header when it has something to show in it, or when the header opens and closes it */
export function hasSectionHeader(section: ViewSection | undefined | null): boolean {
    return (
        !!section &&
        typeof section === 'object' &&
        !!(section.title || section.icon || section.subtitle || section.collapsible)
    );
}

const TITLE_ALIGN: Record<string, CSSProperties['justifyContent']> = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end',
};

function toPositiveNumber(value: unknown): number | null {
    const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    return typeof number === 'number' && Number.isFinite(number) && number > 0 ? number : null;
}

/** The CSS of the header of a section: where its title stands, how big and in which color */
export function getSectionHeaderStyle(section: ViewSection | undefined | null): CSSProperties {
    const style: CSSProperties = {};
    if (!section || typeof section !== 'object') {
        return style;
    }
    if (section.titleAlign && TITLE_ALIGN[section.titleAlign]) {
        style.justifyContent = TITLE_ALIGN[section.titleAlign];
    }
    if (section.titleColor) {
        style.color = section.titleColor;
    }
    const size = toPositiveNumber(section.titleSize);
    if (size) {
        style.fontSize = size;
    }
    if (section.divider) {
        style.borderBottom = '1px solid rgba(128, 128, 128, 0.4)';
        style.paddingBottom = 6;
    }
    return style;
}

/**
 * The CSS of the frame of a section, apart from its look (see getSectionFrameStyle() in visGridLayout.ts): its
 * place in the grid of the sections and its height.
 *
 * @param section - the section as it is stored
 * @param span - how many section columns it occupies
 * @param open - a closed section is only its header, whatever height it has when open
 */
export function getSectionPlacementStyle(
    section: ViewSection | undefined | null,
    span: number,
    open = true,
): CSSProperties {
    const style: CSSProperties = {
        // a new row: the section starts in the first column, which lies behind the cursor of the grid
        gridColumn: section?.newRow ? `1 / span ${span}` : `span ${span}`,
    };
    if (!open) {
        return style;
    }
    if (section?.stretch) {
        style.alignSelf = 'stretch';
    }
    const minHeight = toPositiveNumber(section?.minHeight);
    if (minHeight) {
        style.minHeight = minHeight;
    }
    return style;
}

/** The size of the cells of a section: its own, or else the one of the view */
export function getSectionGrid(
    section: ViewSection | undefined | null,
    layout: { rowHeight: number; gridGap: number },
): { rowHeight: number; gridGap: number } {
    const rowHeight = toPositiveNumber(section?.rowHeight);
    const gap = section?.gridGap;
    const gridGap = typeof gap === 'number' && Number.isFinite(gap) && gap >= 0 ? gap : null;
    return {
        rowHeight: rowHeight ?? layout.rowHeight,
        gridGap: gridGap ?? layout.gridGap,
    };
}

/** Where the choice of the user to open or close a section is kept in the browser */
export function getSectionOpenStorageKey(projectName: string, view: string, sectionId: string): string {
    return `vis-2.sectionOpen.${projectName}/${view}/${sectionId}`;
}
