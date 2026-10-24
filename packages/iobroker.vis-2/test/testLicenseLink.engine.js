const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '../../..');
const RAW_PREFIX = 'https://raw.githubusercontent.com/ioBroker/ioBroker.vis-2/master/';

// Admin fetches `licenseInformation.link` in the browser and shows it as the text of the license dialog, which can
// only be accepted after scrolling through it (#707). So the link has to name a file on a host that allows
// cross-origin reads - raw.githubusercontent.com does, a web page like the pricing page does not.
// The repochecker warns (W1137) if that file is the README.md, LICENSE or LICENSE.md of the repository: it has to
// describe the commercial side of the license, not only the source code license.
// Returns the path of the file in this repository, or null.
function licenseTextFile(link) {
    if (typeof link !== 'string' || !link.startsWith(RAW_PREFIX)) {
        return null;
    }
    const file = decodeURIComponent(link.substring(RAW_PREFIX.length).split(/[?#]/)[0]);
    if (!file || ['readme.md', 'license', 'license.md'].includes(file.toLowerCase())) {
        return null;
    }
    return file;
}

describe('licenseInformation.link', () => {
    it('accepts only a raw file of this repository other than README and LICENSE', () => {
        assert.strictEqual(licenseTextFile(`${RAW_PREFIX}LICENSE-INFORMATION.txt`), 'LICENSE-INFORMATION.txt');
        assert.strictEqual(licenseTextFile('https://iobroker.net/www/pricing'), null);
        assert.strictEqual(licenseTextFile(`${RAW_PREFIX}LICENSE`), null);
        assert.strictEqual(licenseTextFile(`${RAW_PREFIX}license.md`), null);
        assert.strictEqual(licenseTextFile(`${RAW_PREFIX}README.md`), null);
        assert.strictEqual(licenseTextFile(RAW_PREFIX), null);
        assert.strictEqual(
            licenseTextFile('https://github.com/ioBroker/ioBroker.vis-2/blob/master/LICENSE-INFORMATION.txt'),
            null,
        );
        assert.strictEqual(
            licenseTextFile('http://raw.githubusercontent.com/ioBroker/ioBroker.vis-2/master/LICENSE-INFORMATION.txt'),
            null,
        );
        assert.strictEqual(licenseTextFile(''), null);
        assert.strictEqual(licenseTextFile(undefined), null);
    });

    it('points at a license text that the Admin can show and accept', () => {
        const ioPackage = JSON.parse(fs.readFileSync(path.join(__dirname, '../io-package.json'), 'utf8'));
        const link = ioPackage.common.licenseInformation.link;
        const file = licenseTextFile(link);
        assert.ok(file, link);

        const text = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
        // A text starting with '#' is rendered as Markdown, and Admin 8.3.3 never enables "accept" for a Markdown
        // text short enough to need no scrolling
        assert.ok(!text.startsWith('#'));
        assert.ok(text.includes('CC BY-NC 4.0'));
        assert.ok(text.includes('https://iobroker.net/www/pricing'));
    });
});
