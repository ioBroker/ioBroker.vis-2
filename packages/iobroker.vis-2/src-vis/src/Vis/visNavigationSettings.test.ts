import { describe, expect, it } from 'vitest';

import type { Project, ViewSettings } from '@iobroker/types-vis-2';

import { resolveNavigationSettings } from './visNavigationSettings';

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
