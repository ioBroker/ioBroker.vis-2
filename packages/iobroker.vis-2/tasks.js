const {
    existsSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
    createReadStream,
    createWriteStream,
    readdirSync,
    lstatSync,
    unlinkSync,
} = require('node:fs');
const path = require('node:path');
const { deleteFoldersRecursive, buildReact, npmInstall } = require('@iobroker/build-tools');
const axios = require('axios');
const unzipper = require('unzipper');

function clean() {
    deleteFoldersRecursive(`${__dirname}/www`);
    // Defensive: remove any leftover runtime/ source-copy tree from the legacy build.
    // The runtime is now produced by the multi-entry Vite build (index.html -> Runtime,
    // edit.html -> Editor) directly into src-vis/build/, so runtime/ is no longer created.
    deleteFoldersRecursive(`${__dirname}/runtime`, ['node_modules', 'package-lock.json']);
    const version = JSON.parse(readFileSync(`${__dirname}/package.json`, 'utf8')).version;
    writeFileSync(`${__dirname}/src-vis/src/version.json`, JSON.stringify({ version }, null, 2));
}

function updateFile(fileName, data) {
    const oldData = readFileSync(fileName).toString('utf8').replace(/\r\n/g, '\n');
    data = data.replace(/\r\n/g, '\n');
    if (oldData !== data) {
        writeFileSync(fileName, data);
    }
}

async function generateSvgFiles() {
    const svgPath = path.join(__dirname, '/../../node_modules/@material-icons/svg/');
    const data = JSON.parse(readFileSync(`${svgPath}data.json`).toString('utf8'));

    !existsSync(`${__dirname}/src-vis/public/material-icons`) &&
        mkdirSync(`${__dirname}/src-vis/public/material-icons`);

    updateFile(`${__dirname}/src-vis/public/material-icons/index.json`, JSON.stringify(data.icons));

    const folders = readdirSync(`${svgPath}svg`);
    const result = {};
    folders.forEach(folder => {
        const files = readdirSync(`${svgPath}svg/${folder}`);

        files.forEach(file => {
            result[file] = result[file] || {};
            let data = readFileSync(`${svgPath}svg/${folder}/${file}`).toString('utf8');
            // add currentColor
            data = data.replace(/<path /g, '<path fill="currentColor" ');
            data = data.replace(/<circle /g, '<circle fill="currentColor" ');
            if (data.includes('line')) {
                console.log(`"${file} in ${folder} has fill or stroke`);
            }

            result[file][folder] = Buffer.from(data).toString('base64');
            // console.log(pako.inflate(Buffer.from(result[file][folder], 'base64'), {to: 'string'}));
        });
    });

    Object.keys(result).forEach(file => {
        updateFile(
            `${__dirname}/src-vis/public/material-icons/${file.replace('.svg', '')}.json`,
            JSON.stringify(result[file]),
        );
    });

    // prepare https://github.com/OpenAutomationProject/knx-uf-iconset/archive/refs/heads/master.zip
    if (!existsSync(`${__dirname}/knx-uf-iconset/master.zip`)) {
        let res;
        try {
            res = await axios(
                'https://github.com/OpenAutomationProject/knx-uf-iconset/archive/refs/heads/master.zip',
                { responseType: 'arraybuffer', timeout: 30_000 },
            );
        } catch (e) {
            console.warn(
                `Could not download knx-uf-iconset (skipping): ${e.code || e.message || e}`,
            );
            return;
        }
        !existsSync(`${__dirname}/knx-uf-iconset`) && mkdirSync(`${__dirname}/knx-uf-iconset`);
        writeFileSync(`${__dirname}/knx-uf-iconset/master.zip`, res.data);

        const zip = createReadStream(`${__dirname}/knx-uf-iconset/master.zip`).pipe(
            unzipper.Parse({ forceStream: true }),
        );
        for await (const entry of zip) {
            const fileName = entry.path;
            if (entry.type === 'File' && fileName.endsWith('.svg')) {
                entry.pipe(createWriteStream(`${__dirname}/knx-uf-iconset/${path.basename(fileName)}`));
            } else {
                entry.autodrain();
            }
        }

        // prepare KNX-UF icons
        const files = readdirSync(`${__dirname}/knx-uf-iconset/`).filter(file => file.endsWith('.svg'));
        const result = {};
        for (let f = 0; f < files.length; f++) {
            let data = readFileSync(`${__dirname}/knx-uf-iconset/${files[f]}`).toString('utf8');
            // add currentColor
            data = data.replace(/fill="#FFFFFF"/g, 'fill="currentColor"');
            data = data.replace(/stroke="#FFFFFF"/g, 'stroke="currentColor"');
            data = data.replace(/fill:#FFFFFF/g, 'fill:currentColor');
            data = data.replace(/stroke:#FFFFFF/g, 'stroke:currentColor');
            data = data.replace(/xmlns:xlink="http:\/\/www.w3.org\/1999\/xlink"\s?/g, '');
            data = data.replace(/<!DOCTYPE\s[^>]+>\s?/g, '');
            data = data.replace(/x="0px"\s?/g, '');
            data = data.replace(/y="0px"\s?/g, '');
            data = data.replace(/<!--[^>]+>/g, '');
            data = data.replace(/\s?xml:space="preserve"/g, '');
            data = data.replace(/\r\n/g, '\n');
            data = data.replace(/\n\n/g, '\n');
            data = data.replace(/\n\n/g, '\n');
            data = data.replace(/\sid="([^"]+)?"/g, '');
            data = data.replace(/<g>\n<\/g>\n?/g, '');
            data = data.replace(/<g>\n<\/g>\n?/g, '');

            result[files[f].replace('.svg', '')] = Buffer.from(data).toString('base64');
        }

        updateFile(`${__dirname}/src-vis/public/material-icons/knx-uf.json`, JSON.stringify(result));
    }
}

function syncFiles(target, dest) {
    let dataSource = readFileSync(dest).toString('utf8');
    // remove all CR/LF
    dataSource = dataSource.replace(/\r\n/g, '\n');
    if (existsSync(target)) {
        let dataTarget = readFileSync(target).toString('utf8');
        dataTarget = dataTarget.replace(/\r\n/g, '\n');
        if (dataTarget !== dataSource) {
            writeFileSync(target, dataSource);
        }
    } else {
        writeFileSync(target, dataSource);
    }
}

function buildEditor() {
    // synchronise i18n: copy all new words from runtime into src
    const langsRuntime = {
        en: require('./src-vis/src/i18nRuntime/en.json'),
    };
    const langsEditor = {
        en: require('./src-vis/src/i18n/en.json'),
    };
    Object.keys(langsRuntime.en).forEach(key => {
        if (!langsEditor.en[key]) {
            // load all languages
            if (!langsEditor.de) {
                readdirSync(`${__dirname}/src-vis/src/i18nRuntime`).forEach(file => {
                    langsRuntime[file.replace('.json', '')] = require(`./src-vis/src/i18nRuntime/${file}`);
                    langsEditor[file.replace('.json', '')] = require(`./src-vis/src/i18n/${file}`);
                });
            }
            Object.keys(langsEditor).forEach(lang => (langsEditor[lang][key] = langsRuntime[lang][key]));
        }
    });

    if (langsEditor.de) {
        Object.keys(langsEditor).forEach(lang =>
            writeFileSync(`${__dirname}/src-vis/src/i18n/${lang}.json`, JSON.stringify(langsEditor[lang], null, 2)),
        );
    }

    // The Vite build is now multi-entry: src-vis/index.html -> Runtime, src-vis/edit.html -> Editor.
    // A single buildReact() produces both build/index.html (runtime) and build/edit.html (editor).
    return buildReact(`${__dirname}/src-vis/`, { vite: true, ramSize: 7000, rootDir: `${__dirname}/../../` });
}

/**
 * Looks for chunks of the build that wait for each other.
 *
 * Every chunk waits for the `__tla` promise of the chunks it imports, and a chunk that module federation created
 * for a shared dependency waits for `loadShare()`, which loads the chunk that provides that dependency. If those
 * waits form a circle, no module of the bundle is ever executed: the page stays empty, without a single log and
 * without a socket. That happened in 2.15.6, when rollup put its CommonJS interop helpers into a waiting chunk,
 * so the proxy of `react` waited for the proxy of `react/jsx-runtime` and that one back for `react` (see the
 * `vis-2-commonjs-helpers-chunk` plugin in src-vis/vite.config.ts).
 */
function checkChunks() {
    const assetsDir = path.join(__dirname, 'src-vis/build/assets');
    if (!existsSync(assetsDir)) {
        throw new Error(`Cannot check the chunks: ${assetsDir} does not exist`);
    }
    const waits = {};
    const waiting = [];
    const providers = {};
    const files = readdirSync(assetsDir).filter(file => file.endsWith('.js'));
    const contents = {};

    files.forEach(file => {
        const code = readFileSync(path.join(assetsDir, file), 'utf8');
        contents[file] = code;
        if (code.includes('let __tla')) {
            waiting.push(file);
        }
        // The map of every shared dependency to the chunk that provides it
        if (file.startsWith('localSharedImportMap')) {
            for (const match of code.matchAll(/"([^"]+)"\s*:\s*[^}]*?import\(["']([^"']+)["']\)/g)) {
                providers[match[1]] = match[2].split('/').pop();
            }
        }
    });

    files.forEach(file => {
        const code = contents[file];
        const imports = new Set();
        // A chunk waits for every chunk it imports, as they all export their own `__tla`
        for (const match of code.matchAll(/(?:from|import)\s*["']\.\/([^"']+\.js)["']/g)) {
            if (waiting.includes(match[1])) {
                imports.add(match[1]);
            }
        }
        // ... and a chunk that asks for a shared dependency waits for the chunk that provides it
        for (const match of code.matchAll(/loadShare\(\s*["']([^"']+)["']/g)) {
            if (providers[match[1]] && waiting.includes(providers[match[1]])) {
                imports.add(providers[match[1]]);
            }
        }
        waits[file] = [...imports];
    });

    const name = file => file.replace('__mfe_internal__iobroker_vis__loadShare__', 'share:');
    const circle = [];
    const done = [];

    function findCircle(file, path_) {
        const position = path_.indexOf(file);
        if (position !== -1) {
            circle.push([...path_.slice(position), file]);
            return true;
        }
        if (done.includes(file)) {
            return false;
        }
        done.push(file);
        return (waits[file] || []).some(next => findCircle(next, [...path_, file]));
    }

    if (waiting.some(file => findCircle(file, []))) {
        throw new Error(
            `These chunks wait for each other, the bundle would never start:\n    ${circle[0].map(name).join('\n -> ')}`,
        );
    }

    console.log(`Chunks OK: none of the ${waiting.length} waiting chunks waits for itself`);
}

function copyAllFiles() {
    // The multi-entry Vite build produces both build/index.html (runtime) and
    // build/edit.html (editor) directly, so we copy everything from build/ into www/
    // in one shot. No more exclusion of index.html and no manual edit.html write.
    copyFolder(path.join(__dirname, 'src-vis/build'), path.join(__dirname, 'www'));
}

function copyBackend() {
    if (!existsSync(`${__dirname}/lib`)) {
        mkdirSync(`${__dirname}/lib`);
    }
    writeFileSync(`${__dirname}/lib/states.js`, readFileSync(`${__dirname}/build/lib/states.js`));
    writeFileSync(`${__dirname}/build/lib/cloudCert.crt`, readFileSync(`${__dirname}/src/lib/cloudCert.crt`));
    writeFileSync(`${__dirname}/build/lib/updating.html`, readFileSync(`${__dirname}/src/lib/updating.html`));
}

function patchFile(htmlFile) {
    if (existsSync(htmlFile)) {
        let code = readFileSync(htmlFile).toString('utf8');
        code = code.replace(
            /<script>[\s\S]*const script\s?=\s?document[^<]+<\/script>/,
            `<script type="text/javascript" onerror="setTimeout(function(){window.location.reload()}, 5000)" src="../../lib/js/socket.io.js"></script>`,
        );
        code = code.replace(
            /<script>[\s\S]*var script=document[^<]+<\/script>/,
            `<script type="text/javascript" onerror="setTimeout(function(){window.location.reload()}, 5000)" src="../../lib/js/socket.io.js"></script>`,
        );

        writeFileSync(htmlFile, code);
    }
}

function copyFolder(source, target, ignore) {
    !existsSync(target) && mkdirSync(target);

    // Copy
    if (lstatSync(source).isDirectory()) {
        const files = readdirSync(source);
        files.forEach(file => {
            const curSource = path.join(source, file).replace(/\\/g, '/');
            const curTarget = path.join(target, file).replace(/\\/g, '/');
            if (ignore && ignore.includes(file)) {
                return;
            }
            if (ignore && ignore.find(pattern => pattern.startsWith('.') && file.endsWith(pattern))) {
                // check that file is smaller than 8MB
                if (lstatSync(curSource).size > 8 * 1024 * 1024) {
                    return;
                }
            }

            if (lstatSync(curSource).isDirectory()) {
                copyFolder(curSource, curTarget, ignore);
            } else {
                writeFileSync(curTarget, readFileSync(curSource));
            }
        });
    } else {
        writeFileSync(target, readFileSync(source));
    }
}

function patchEditor() {
    patchFile(`${__dirname}/www/edit.html`);
    patchFile(`${__dirname}/www/index.html`);
    patchFile(`${__dirname}/src-vis/build/index.html`);
    patchFile(`${__dirname}/src-vis/build/edit.html`);
    if (existsSync(`${__dirname}/www/marketplaceConfig.sample.js`)) {
        unlinkSync(`${__dirname}/www/marketplaceConfig.sample.js`);
    }

    copyFolder(`${__dirname}/www`, `${__dirname}/../../www`);
    writeFileSync(`${__dirname}/../../io-package.json`, readFileSync(`${__dirname}/io-package.json`).toString());
    writeFileSync(`${__dirname}/../../main.js`, readFileSync(`${__dirname}/build/main.js`).toString());
    copyFolder(`${__dirname}/build/lib`, `${__dirname}/../../lib`);

    let readme = readFileSync(`${__dirname}/../../README.md`).toString('utf8');
    readme = readme.replaceAll('packages/iobroker.vis-2/', '');
    writeFileSync(`${__dirname}/README.md`, readme);
}

if (process.argv.includes('--0-clean')) {
    deleteFoldersRecursive(`${__dirname}/src-vis/build`);
} else if (process.argv.includes('--1-npm')) {
    if (!existsSync(`${__dirname}/src-vis/node_modules`)) {
        npmInstall(`${__dirname}/src-vis`).catch(e => console.error(`Cannot install: ${e}`));
    }
} else if (process.argv.includes('--2-svg-icons')) {
    generateSvgFiles().catch(e => console.error(`Cannot generate SVG icons: ${e}`));
} else if (process.argv.includes('--3-build')) {
    buildEditor()
        .then(() => checkChunks())
        .catch(e => {
            console.error(`Cannot build: ${e}`);
            process.exit(1);
        });
} else if (process.argv.includes('--check-chunks')) {
    try {
        checkChunks();
    } catch (e) {
        console.error(`${e}`);
        process.exit(1);
    }
} else if (process.argv.includes('--4-copy')) {
    copyAllFiles();
} else if (process.argv.includes('--5-patch')) {
    patchEditor();
} else if (process.argv.includes('--copy-backend')) {
    copyBackend();
} else if (process.argv.includes('--build-editor')) {
    // Single-step build: with the multi-entry Vite build, this now produces both
    // the runtime (index.html) and the editor (edit.html) in one pass.
    deleteFoldersRecursive(`${__dirname}/www`);
    deleteFoldersRecursive(`${__dirname}/src-vis/build`);

    const npmPromise = !existsSync(`${__dirname}/src-vis/node_modules`)
        ? npmInstall(`${__dirname}/src-vis`)
        : Promise.resolve();
    npmPromise
        .then(() => generateSvgFiles())
        .then(() => buildEditor())
        .then(() => checkChunks())
        .then(() => copyAllFiles())
        .then(() => patchEditor())
        .catch(e => {
            console.error(`Cannot build: ${e}`);
            process.exit(1);
        });
} else {
    // Default workflow: one multi-entry Vite build produces runtime + editor in a
    // single pass. The legacy runtime/ source-copy + second npm install + separate
    // build are gone; clean() defensively removes any leftover runtime/ tree.
    clean();
    const npmPromise = !existsSync(`${__dirname}/src-vis/node_modules`)
        ? npmInstall(`${__dirname}/src-vis`)
        : Promise.resolve();
    npmPromise
        .then(() => generateSvgFiles())
        .then(() => buildEditor())
        .then(() => checkChunks())
        .then(() => copyAllFiles())
        .then(() => patchEditor())
        .catch(e => {
            console.error(`Cannot build: ${e}`);
            process.exit(1);
        });
}
