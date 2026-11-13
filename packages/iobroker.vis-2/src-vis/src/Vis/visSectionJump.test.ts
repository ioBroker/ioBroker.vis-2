import { describe, expect, it } from 'vitest';

import type { Project } from '@iobroker/types-vis-2';

import { getSectionOfWidget, getSectionTargets, sectionLabel } from './visSectionJump';

const project = {
    ___settings: {},
    Rooms: {
        settings: {
            layout: 'grid',
            sections: [
                { id: 'bar', widgets: ['w000001'] },
                { id: 'living', title: 'Living room', widgets: ['w000002'] },
                { id: 'kitchen', title: 'Kitchen {javascript.0.temp}°C', widgets: [] },
                { id: 'empty', title: '  ', widgets: [] },
            ],
        },
        widgets: {},
    },
} as unknown as Project;

describe('sectionLabel', () => {
    it('is the title without its bindings', () => {
        expect(sectionLabel({ id: 'a', widgets: [], title: 'Kitchen {javascript.0.temp}°C' })).toBe('Kitchen °C');
        expect(sectionLabel({ id: 'a', widgets: [], title: 'Living room' })).toBe('Living room');
    });

    it('is nothing for a section without a title', () => {
        expect(sectionLabel({ id: 'a', widgets: [] })).toBe('');
        expect(sectionLabel(null)).toBe('');
    });
});

describe('getSectionTargets', () => {
    it('offers the sections with a title, in their order', () => {
        expect(getSectionTargets(project, 'Rooms')).toEqual([
            { id: 'living', label: 'Living room' },
            { id: 'kitchen', label: 'Kitchen °C' },
        ]);
    });

    it('leaves out the section that is asked to be left out', () => {
        expect(getSectionTargets(project, 'Rooms', 'living').map(target => target.id)).toEqual(['kitchen']);
    });

    it('offers nothing for a page without sections', () => {
        expect(getSectionTargets(project, 'Other')).toEqual([]);
        expect(getSectionTargets(null, 'Rooms')).toEqual([]);
    });
});

describe('getSectionOfWidget', () => {
    it('finds the section a widget stands in', () => {
        expect(getSectionOfWidget(project, 'Rooms', 'w000002')).toBe('living');
        expect(getSectionOfWidget(project, 'Rooms', 'w000009')).toBeUndefined();
    });
});
