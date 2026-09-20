import { describe, expect, it } from 'vitest';

import type { ViewSection } from '@iobroker/types-vis-2';

import {
    applySectionBindings,
    getBindingStateIds,
    getSectionGrid,
    getSectionHeaderStyle,
    getSectionPlacementStyle,
    getSectionStateIds,
    hasSectionHeader,
    isSectionOpen,
    isSectionVisible,
    isUserInGroups,
} from './visSections';

const section = (props: Partial<ViewSection>): ViewSection => ({ id: 's1', widgets: [], ...props });

const userGroups = {
    'system.group.admin': { common: { members: ['system.user.admin'] } },
    'system.group.family': { common: { members: ['system.user.anna', 'system.user.ben'] } },
} as unknown as Record<string, ioBroker.Object>;

const visibility = { states: {}, width: 1000, user: 'anna', userGroups };

describe('getBindingStateIds', () => {
    it('finds the states of the bindings of a text', () => {
        expect(getBindingStateIds('Kitchen {javascript.0.temp}°C')).toEqual(['javascript.0.temp']);
        expect(getBindingStateIds('{a:hm.0.t;b:hm.0.h;a+b}')).toEqual(['hm.0.t', 'hm.0.h']);
    });

    it('leaves out a text without bindings and the special values', () => {
        expect(getBindingStateIds('Kitchen')).toEqual([]);
        expect(getBindingStateIds('Hello {username}')).toEqual([]);
        expect(getBindingStateIds(undefined)).toEqual([]);
    });
});

describe('getSectionStateIds', () => {
    it('listens to the conditions and to the bindings in the header, each once', () => {
        const ids = getSectionStateIds(
            section({
                visibilityOid: ' a.0.alarm ',
                collapsible: true,
                expandOid: 'a.0.open',
                title: '{a.0.temp} / {a.0.alarm}',
                subtitle: '{a.0.hum}',
            }),
        );
        expect(ids).toEqual(['a.0.alarm', 'a.0.open', 'a.0.temp', 'a.0.hum']);
    });

    it('does not listen for the opening of a section that cannot be closed', () => {
        expect(getSectionStateIds(section({ expandOid: 'a.0.open' }))).toEqual([]);
    });

    it('listens to a binding in any attribute, not only in the header', () => {
        expect(getSectionStateIds(section({ background: '{a.0.color}', borderWidth: '{a.0.alarm}' as never }))).toEqual(
            ['a.0.color', 'a.0.alarm'],
        );
    });
});

describe('applySectionBindings', () => {
    const format = (text: string): string =>
        text.replace('{a.0.temp}', '21.5').replace('{a.0.alarm}', '3').replace('{a.0.on}', 'true');

    it('leaves a section without bindings as it is', () => {
        const plain = section({ title: 'Kitchen', borderWidth: 2 });
        expect(applySectionBindings(plain, format)).toBe(plain);
        expect(applySectionBindings(undefined, format)).toBeUndefined();
    });

    it('puts the values into the texts', () => {
        expect(applySectionBindings(section({ title: 'Kitchen {a.0.temp}°C' }), format)?.title).toBe('Kitchen 21.5°C');
    });

    it('reads a number as a number and a checkbox as on or off', () => {
        const applied = applySectionBindings(
            section({ borderWidth: '{a.0.alarm}' as never, collapsible: '{a.0.on}' as never }),
            format,
        );
        expect(applied?.borderWidth).toBe(3);
        expect(applied?.collapsible).toBe(true);
    });

    it('drops a number the binding does not give, and leaves the stored section alone', () => {
        const stored = section({ padding: '{a.0.text}' as never });
        expect(applySectionBindings(stored, text => text.replace('{a.0.text}', 'wide'))?.padding).toBeNull();
        expect(stored.padding).toBe('{a.0.text}');
    });
});

describe('isUserInGroups', () => {
    it('lets everybody in without groups, and else only the members', () => {
        expect(isUserInGroups('ben', [], userGroups)).toBe(true);
        expect(isUserInGroups('ben', ['family'], userGroups)).toBe(true);
        expect(isUserInGroups('ben', ['admin'], userGroups)).toBe(false);
        expect(isUserInGroups('ben', ['unknown'], userGroups)).toBe(false);
    });
});

describe('isSectionVisible', () => {
    it('shows a section without conditions', () => {
        expect(isSectionVisible(section({}), visibility)).toBe(true);
    });

    it('hides a section from the users outside of its groups', () => {
        expect(isSectionVisible(section({ visibilityGroups: ['admin'] }), visibility)).toBe(false);
        expect(isSectionVisible(section({ visibilityGroups: ['family'] }), visibility)).toBe(true);
    });

    it('shows a section only between its widths', () => {
        const s = section({ visibilityMinWidth: 600, visibilityMaxWidth: 1200 });
        expect(isSectionVisible(s, { ...visibility, width: 500 })).toBe(false);
        expect(isSectionVisible(s, { ...visibility, width: 800 })).toBe(true);
        expect(isSectionVisible(s, { ...visibility, width: 1300 })).toBe(false);
    });

    it('shows a section only while its state fulfills the condition, "==" when none is chosen', () => {
        const s = section({ visibilityOid: 'a.0.alarm', visibilityVal: true });
        expect(isSectionVisible(s, { ...visibility, states: { 'a.0.alarm.val': true } })).toBe(true);
        expect(isSectionVisible(s, { ...visibility, states: { 'a.0.alarm.val': false } })).toBe(false);
        // not known yet: hidden, so that it does not flash up
        expect(isSectionVisible(s, visibility)).toBe(false);
        const t = section({ visibilityOid: 'a.0.temp', visibilityCond: '>', visibilityVal: 25 });
        expect(isSectionVisible(t, { ...visibility, states: { 'a.0.temp.val': 28 } })).toBe(true);
    });
});

describe('isSectionOpen', () => {
    it('keeps a section open that cannot be closed', () => {
        expect(isSectionOpen(section({ collapsed: true }), false, {})).toBe(true);
    });

    it('starts open or closed, and then follows the user', () => {
        expect(isSectionOpen(section({ collapsible: true }), undefined, {})).toBe(true);
        expect(isSectionOpen(section({ collapsible: true, collapsed: true }), undefined, {})).toBe(false);
        expect(isSectionOpen(section({ collapsible: true, collapsed: true }), true, {})).toBe(true);
    });

    it('opens while its state fulfills the condition, until the user decides otherwise', () => {
        const s = section({ collapsible: true, expandOid: 'a.0.motion', expandVal: true });
        expect(isSectionOpen(s, undefined, { 'a.0.motion.val': true })).toBe(true);
        expect(isSectionOpen(s, undefined, { 'a.0.motion.val': false })).toBe(false);
        expect(isSectionOpen(s, true, { 'a.0.motion.val': false })).toBe(true);
    });
});

describe('hasSectionHeader', () => {
    it('has a header with something to show, or to open and close the section', () => {
        expect(hasSectionHeader(section({ title: 'Kitchen' }))).toBe(true);
        expect(hasSectionHeader(section({ icon: 'data:image/svg+xml;base64,AA' }))).toBe(true);
        expect(hasSectionHeader(section({ subtitle: 'ground floor' }))).toBe(true);
        expect(hasSectionHeader(section({ collapsible: true }))).toBe(true);
        expect(hasSectionHeader(section({ title: '' }))).toBe(false);
        expect(hasSectionHeader(undefined)).toBe(false);
    });
});

describe('getSectionHeaderStyle', () => {
    it('places, sizes and colors the title, and draws the line below', () => {
        expect(
            getSectionHeaderStyle(
                section({
                    titleAlign: 'center',
                    titleColor: 'red',
                    titleSize: '20' as unknown as number,
                    divider: true,
                }),
            ),
        ).toEqual({
            justifyContent: 'center',
            color: 'red',
            fontSize: 20,
            borderBottom: '1px solid rgba(128, 128, 128, 0.4)',
            paddingBottom: 6,
        });
        expect(getSectionHeaderStyle(section({ titleAlign: 'middle' as never, titleSize: -1 }))).toEqual({});
    });
});

describe('getSectionPlacementStyle', () => {
    it('spans its columns, and starts a new row in the first column', () => {
        expect(getSectionPlacementStyle(section({}), 2)).toEqual({ gridColumn: 'span 2' });
        expect(getSectionPlacementStyle(section({ newRow: true }), 2)).toEqual({ gridColumn: '1 / span 2' });
    });

    it('is only its header when closed, whatever height it has when open', () => {
        expect(getSectionPlacementStyle(section({ stretch: true, minHeight: 200 }), 1, false)).toEqual({
            gridColumn: 'span 1',
        });
    });

    it('grows to the height of its row, or to its own minimum', () => {
        expect(getSectionPlacementStyle(section({ stretch: true, minHeight: 200 }), 1)).toEqual({
            gridColumn: 'span 1',
            alignSelf: 'stretch',
            minHeight: 200,
        });
    });
});

describe('getSectionGrid', () => {
    const layout = { rowHeight: 56, gridGap: 8 };

    it('takes the cells of the view, unless the section has its own', () => {
        expect(getSectionGrid(section({}), layout)).toEqual(layout);
        expect(getSectionGrid(section({ rowHeight: 40, gridGap: 0 }), layout)).toEqual({ rowHeight: 40, gridGap: 0 });
        expect(getSectionGrid(section({ rowHeight: 0, gridGap: -2 }), layout)).toEqual(layout);
    });
});
