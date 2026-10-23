import { describe, expect, it } from 'vitest';

import type { Project, ViewSettings } from '@iobroker/types-vis-2';

import {
    getNavigationBarHeight,
    getNavigationEntryStateIds,
    isNavigationEntryShown,
    PROJECT_NAVIGATION_KEYS,
    resolveNavigationSettings,
} from './visNavigationSettings';

/**
 * The look of the menu can be said once for the project and overruled per view.
 *
 * What matters most here is the case that does not move: every project built before this existed
 * carries the whole look in every view, and must keep looking exactly as it did.
 */
const project = (settings: Record<string, unknown>): Project => ({ ___settings: settings }) as unknown as Project;

describe('resolveNavigationSettings', () => {
    it('takes what the project says where the view says nothing', () => {
        const resolved = resolveNavigationSettings(project({ navigationColor: '#fff', navigationWidth: 240 }), {
            navigation: true,
        });

        expect(resolved.navigationColor).toBe('#fff');
        expect(resolved.navigationWidth).toBe(240);
    });

    it('leaves the view its own values', () => {
        const resolved = resolveNavigationSettings(project({ navigationColor: '#fff' }), {
            navigation: true,
            navigationColor: '#f00',
        });

        expect(resolved.navigationColor).toBe('#f00');
    });

    it('counts an empty string as nothing, which is how a colour that was never chosen is stored', () => {
        const resolved = resolveNavigationSettings(project({ navigationColor: '#fff' }), {
            navigation: true,
            navigationColor: '',
        });

        expect(resolved.navigationColor).toBe('#fff');
    });

    it('lets a switch that was turned off win, because somebody turned it off', () => {
        const resolved = resolveNavigationSettings(project({ navigationBar: true }), {
            navigation: true,
            navigationBar: false,
        });

        expect(resolved.navigationBar).toBe(false);
    });

    it('does not touch what belongs to the page itself', () => {
        const resolved = resolveNavigationSettings(
            project({ navigationTitle: 'Project', navigationOrder: 5, navigation: false }),
            { navigation: true, navigationTitle: 'Kitchen', navigationOrder: 1 },
        );

        expect(resolved.navigationTitle).toBe('Kitchen');
        expect(resolved.navigationOrder).toBe(1);
        expect(resolved.navigation).toBe(true);
    });

    it('changes nothing in a project that says nothing - which is every project built so far', () => {
        const settings = {
            navigation: true,
            navigationOrientation: 'horizontal',
            navigationColor: '#123456',
        } as ViewSettings;

        const resolved = resolveNavigationSettings(project({ darkReloadScreen: true }), settings);

        // the very same object: nothing to merge, nothing copied
        expect(resolved).toBe(settings);
    });

    it('survives a project without any settings at all', () => {
        const settings = { navigation: true } as ViewSettings;

        expect(resolveNavigationSettings({} as Project, settings)).toBe(settings);
    });
});

/** #569: the height of the app bar */
describe('getNavigationBarHeight', () => {
    it('is 48 px without a height', () => {
        expect(getNavigationBarHeight({})).toBe(48);
        expect(getNavigationBarHeight({ navigationBarHeight: undefined })).toBe(48);
        expect(getNavigationBarHeight({ navigationBarHeight: '' as unknown as number })).toBe(48);
        expect(getNavigationBarHeight({ navigationBarHeight: 'abc' as unknown as number })).toBe(48);
    });

    it('takes a height, also as text', () => {
        expect(getNavigationBarHeight({ navigationBarHeight: 32 })).toBe(32);
        expect(getNavigationBarHeight({ navigationBarHeight: '36' as unknown as number })).toBe(36);
    });

    it('keeps a height within 24 and 120 px', () => {
        expect(getNavigationBarHeight({ navigationBarHeight: 0 })).toBe(24);
        expect(getNavigationBarHeight({ navigationBarHeight: -10 })).toBe(24);
        expect(getNavigationBarHeight({ navigationBarHeight: 24 })).toBe(24);
        expect(getNavigationBarHeight({ navigationBarHeight: 120 })).toBe(120);
        expect(getNavigationBarHeight({ navigationBarHeight: 500 })).toBe(120);
    });

    it('can be set for the whole project', () => {
        expect(PROJECT_NAVIGATION_KEYS).toContain('navigationBarHeight');
    });
});

/** #592: an entry of the menu shown or hidden by a state, with the conditions of the widget visibility */
describe('getNavigationEntryStateIds', () => {
    it('collects the states of the views that have an entry, each once and trimmed', () => {
        const views = {
            ___settings: { navigationEntryOid: 'not.a.view' },
            a: { settings: { navigation: true, navigationEntryOid: ' 0_userdata.0.greenhouse ' } },
            b: { settings: { navigation: true, navigationEntryOid: '0_userdata.0.greenhouse' } },
            c: { settings: { navigation: true, navigationEntryOid: '0_userdata.0.garage' } },
            // no entry at all: nothing to listen to
            d: { settings: { navigation: false, navigationEntryOid: '0_userdata.0.off' } },
            e: { settings: { navigation: true, navigationHideEntry: true, navigationEntryOid: '0_userdata.0.hidden' } },
            f: { settings: { navigation: true, navigationEntryOid: '' } },
            g: { settings: { navigation: true, navigationEntryOid: null } },
            h: {},
        } as unknown as Project;

        expect(getNavigationEntryStateIds(views)).toEqual(['0_userdata.0.greenhouse', '0_userdata.0.garage']);
    });

    it('lists nothing for an empty project', () => {
        expect(getNavigationEntryStateIds({} as Project)).toEqual([]);
        expect(getNavigationEntryStateIds(null as unknown as Project)).toEqual([]);
    });
});

describe('isNavigationEntryShown', () => {
    const oid = '0_userdata.0.greenhouse';
    const settings = (more: Partial<ViewSettings>): ViewSettings => ({
        navigation: true,
        navigationEntryOid: oid,
        ...more,
    });

    it('shows an entry without a state', () => {
        expect(isNavigationEntryShown({ navigation: true }, {}, 'a')).toBe(true);
        expect(isNavigationEntryShown({ navigation: true, navigationEntryOid: '  ' }, {}, 'a')).toBe(true);
    });

    it('hides the entry while the value of the state is not known', () => {
        expect(isNavigationEntryShown(settings({ navigationEntryVal: true }), {}, 'a')).toBe(false);
    });

    it('compares with == by default, a boolean also with its text', () => {
        const shown = settings({ navigationEntryVal: 'true' });
        expect(isNavigationEntryShown(shown, { [`${oid}.val`]: true }, 'a')).toBe(true);
        expect(isNavigationEntryShown(shown, { [`${oid}.val`]: false }, 'a')).toBe(false);
    });

    it('takes the other conditions', () => {
        const states = { [`${oid}.val`]: 12 };
        expect(
            isNavigationEntryShown(settings({ navigationEntryCond: '>', navigationEntryVal: 10 }), states, 'a'),
        ).toBe(true);
        expect(
            isNavigationEntryShown(settings({ navigationEntryCond: '<', navigationEntryVal: 10 }), states, 'a'),
        ).toBe(false);
        expect(isNavigationEntryShown(settings({ navigationEntryCond: 'exist' }), states, 'a')).toBe(true);
        expect(isNavigationEntryShown(settings({ navigationEntryCond: 'not exist' }), states, 'a')).toBe(false);
    });
});
