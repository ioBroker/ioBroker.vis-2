import { describe, expect, it } from 'vitest';

import { getProjectPath, replaceProjectPathInHtml } from './visProjectPath';

describe('getProjectPath', () => {
    it('builds the folder of the project', () => {
        expect(getProjectPath({ adapterName: 'vis-2', instance: 0, projectName: 'main-MonsterVan' })).toBe(
            '../vis-2.0/main-MonsterVan',
        );
    });
});

describe('replaceProjectPathInHtml', () => {
    const path = '../vis-2.0/main-MonsterVan';

    it('resolves the placeholder in an image', () => {
        expect(replaceProjectPathInHtml('<img src="_PRJ_NAME/MonsterVan Logo ohne Kreis.jpg">', path)).toBe(
            '<img src="../vis-2.0/main-MonsterVan/MonsterVan Logo ohne Kreis.jpg">',
        );
    });

    it('resolves every placeholder, also in CSS', () => {
        expect(
            replaceProjectPathInHtml(
                '<div style="background-image: url(_PRJ_NAME/bg.jpg)"><img src=\'_PRJ_NAME/img/a.png\'></div>',
                path,
            ),
        ).toBe(
            '<div style="background-image: url(../vis-2.0/main-MonsterVan/bg.jpg)"><img src=\'../vis-2.0/main-MonsterVan/img/a.png\'></div>',
        );
    });

    it('leaves HTML without the placeholder alone', () => {
        const html = '<img src="/vis-2.0/main-MonsterVan/img/logo.webp"> _PRJ_NAME without a slash';
        expect(replaceProjectPathInHtml(html, path)).toBe(html);
    });
});
