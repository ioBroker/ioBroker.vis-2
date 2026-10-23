import { describe, expect, it } from 'vitest';

import { getCollectionSetNames, isCollectionUsed } from './visWidgetSetNames';

describe('getCollectionSetNames', () => {
    it('names the adapter, the key and the name of the collection', () => {
        expect(getCollectionSetNames('vis-2-widgets-weather', 'weather-forecast', 'vis2weatherForecast')).toEqual([
            'vis-2-widgets-weather',
            'weather-forecast',
            'vis2weatherForecast',
        ]);
    });

    it('names each only once and leaves out what is missing', () => {
        expect(getCollectionSetNames('intercom', 'intercom', 'intercom')).toEqual(['intercom']);
        expect(getCollectionSetNames('intercom', 'vis2IntercomWidgets')).toEqual(['intercom', 'vis2IntercomWidgets']);
    });
});

describe('isCollectionUsed', () => {
    // the sets that rely on the adapter as their name go on working
    it('loads a collection whose adapter is the set', () => {
        const names = getCollectionSetNames('vis-2-widgets-material', 'vis2materialWidgets', 'vis2materialWidgets');
        expect(isCollectionUsed(names, ['basic', 'vis-2-widgets-material'])).toBe(true);
    });

    // #691: the second set of an adapter is named by its collection
    it('loads a collection whose key or name is the set', () => {
        expect(isCollectionUsed(getCollectionSetNames('weather', 'forecast', 'vis2forecast'), ['forecast'])).toBe(true);
        expect(isCollectionUsed(getCollectionSetNames('weather', 'forecast', 'vis2forecast'), ['vis2forecast'])).toBe(
            true,
        );
    });

    it('does not load a collection the project does not use', () => {
        expect(isCollectionUsed(getCollectionSetNames('weather', 'forecast', 'vis2forecast'), ['radar'])).toBe(false);
        expect(isCollectionUsed(getCollectionSetNames('weather', 'forecast'), [])).toBe(false);
    });

    it('loads every collection in the editor', () => {
        expect(isCollectionUsed(getCollectionSetNames('weather', 'forecast'), false)).toBe(true);
        expect(isCollectionUsed(getCollectionSetNames('weather', 'forecast'))).toBe(true);
    });
});
