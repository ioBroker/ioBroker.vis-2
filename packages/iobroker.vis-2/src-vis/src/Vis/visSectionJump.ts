/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

import type { Project, ViewSection } from '@iobroker/types-vis-2';

/**
 * Jumping to a section of the page one is on.
 *
 * A phone page of a house is long: the rooms stand under each other, and the kitchen is five screens down. A
 * button could go to another page or open one in a dialog, but not scroll the page it stands on. These are the
 * pieces for that - which sections there are to jump to, what they are called, and the jump itself - shared by
 * the button and by the bar of jump marks.
 */

/** A section that can be jumped to, with the word it is offered under */
export interface SectionTarget {
    id: string;
    label: string;
}

/**
 * What a section is called: its title without the bindings in it.
 *
 * A title like `Kitchen {javascript.0.temp}°C` is a fine header, but a jump mark is a name, and a value in it
 * would only be the binding as it was written.
 *
 * @param section - the section
 */
export function sectionLabel(section: ViewSection | null | undefined): string {
    const title = typeof section?.title === 'string' ? section.title : '';
    return title
        .replace(/\{[^}]*\}/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * The sections of a page that can be jumped to, in the order they stand.
 *
 * Only a section with a title is one: a jump mark needs a word, and a section without a header has nothing on
 * the page that says where it starts either.
 *
 * @param project - the whole project
 * @param view - the page
 * @param without - a section to leave out, like the one the bar itself stands in
 */
export function getSectionTargets(
    project: Project | null | undefined,
    view: string,
    without?: string,
): SectionTarget[] {
    const sections = project?.[view]?.settings?.sections;
    if (!Array.isArray(sections)) {
        return [];
    }
    const targets: SectionTarget[] = [];
    for (const section of sections) {
        const label = sectionLabel(section);
        if (section?.id && label && section.id !== without) {
            targets.push({ id: section.id, label });
        }
    }
    return targets;
}

/**
 * The section a widget stands in, so a bar of jump marks does not offer the one it is part of.
 *
 * @param project - the whole project
 * @param view - the page
 * @param widget - the widget
 */
export function getSectionOfWidget(
    project: Project | null | undefined,
    view: string,
    widget: string,
): string | undefined {
    const sections = project?.[view]?.settings?.sections;
    return Array.isArray(sections)
        ? sections.find(section => section?.widgets?.includes(widget as ViewSection['widgets'][number]))?.id
        : undefined;
}

/**
 * Scroll a section of a page into sight.
 *
 * The section is found where the runtime drew it - in the element of the page, by its `data-section` - so the
 * page scrolls however it is shown: as the document, inside the editor or inside a dialog. Where it stops is
 * `scroll-margin-top` of the section, see `vis.css`.
 *
 * @param view - the page the section is on
 * @param section - the id of the section
 * @returns whether there was such a section to go to; a hidden one is not drawn, and is not gone to
 */
export function scrollToSection(view: string, section: string): boolean {
    if (!view || !section || typeof document === 'undefined') {
        return false;
    }
    const page = document.getElementById(`visview_${view.replace(/\s/g, '_')}`);
    const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(section) : section.replace(/"/g, '\\"');
    const element = page?.querySelector<HTMLElement>(`[data-section="${escaped}"]`);
    if (!element) {
        return false;
    }
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
}
