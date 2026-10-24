import { describe, expect, it } from 'vitest';

import { getManifest } from './visManifest';

const HREF = 'http://192.168.178.41:8082/vis-2/?Home#Start';

describe('getManifest', () => {
    // #102: the shortcut on the home screen opened /vis-2/ without the project and the view
    it('starts the shortcut on the project and the view it was made of', () => {
        const manifest = getManifest({ title: 'Home', icon: './favicon.ico', themeType: 'light' }, HREF);
        expect(manifest.start_url).toBe(HREF);
    });

    it('names the icon with its whole address', () => {
        const manifest = getManifest({ title: 'Home', icon: './favicon.ico', themeType: 'light' }, HREF);
        expect((manifest.icons as { src: string }[])[0].src).toBe('http://192.168.178.41:8082/vis-2/favicon.ico');

        const projectIcon = getManifest(
            { title: 'Home', icon: '../vis-2.0/Home/img/icon.png', themeType: 'dark' },
            HREF,
        );
        expect((projectIcon.icons as { src: string }[])[0].src).toBe(
            'http://192.168.178.41:8082/vis-2.0/Home/img/icon.png',
        );
    });
});
