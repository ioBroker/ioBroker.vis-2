import {
    existsSync,
    readFileSync,
    writeFileSync,
    lstatSync,
    mkdirSync,
    readdirSync,
    unlinkSync,
    rmdirSync,
} from 'node:fs';
import { join, basename, normalize } from 'node:path';

const wwwDir = existsSync(`${__dirname}/../../www/`) ? `${__dirname}/../../www/` : `${__dirname}/../www/`;

const generic = ['basic', 'jqplot', 'jqui', 'swipe', 'tabs'];

function copyFileSync(source: string, target: string, forceBuild?: boolean): boolean {
    let targetFile = target;
    let changed = false;

    // if target is a directory a new file with the same name will be created
    if (existsSync(target)) {
        if (lstatSync(target).isDirectory()) {
            targetFile = join(target, basename(source));
        }
    }
    if (existsSync(targetFile)) {
        const newFile = readFileSync(source);
        if (forceBuild || !newFile.equals(readFileSync(targetFile))) {
            changed = true;
            writeFileSync(targetFile, newFile);
        }
    } else {
        changed = true;
        writeFileSync(targetFile, readFileSync(source));
    }

    return changed;
}

function copyFolderRecursiveSync(source: string, target: string, forceBuild?: boolean): boolean {
    let oldFiles: string[] = [];
    let files: string[] = [];
    let changed = false;

    // check if folder needs to be created or integrated
    const targetFolder = join(target, basename(source));
    if (!existsSync(targetFolder)) {
        mkdirSync(targetFolder);
    }

    // copy
    if (lstatSync(source).isDirectory()) {
        files = readdirSync(source);
        oldFiles = readdirSync(targetFolder);

        files.forEach(file => {
            const curSource = join(source, file);
            if (lstatSync(curSource).isDirectory()) {
                if (copyFolderRecursiveSync(curSource, targetFolder, forceBuild)) {
                    changed = true;
                }
            } else if (copyFileSync(curSource, targetFolder, forceBuild)) {
                changed = true;
            }
        });

        // Delete all old files
        if (target !== normalize(wwwDir)) {
            oldFiles.forEach(file => {
                const pathName = join(targetFolder, file);
                if (!files.includes(file) && !lstatSync(pathName).isDirectory()) {
                    try {
                        unlinkSync(pathName);
                        changed = true;
                    } catch (e) {
                        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
                            throw e;
                        }
                    }
                }
            });
        }
    }

    return changed;
}

function deleteFolderRecursive(dirPath: string): void {
    let files = [];
    if (existsSync(dirPath)) {
        files = readdirSync(dirPath);
        files.forEach(file => {
            const curPath = `${dirPath}/${file}`;
            if (lstatSync(curPath).isDirectory()) {
                // recurse
                deleteFolderRecursive(curPath);
            } else {
                // delete file
                unlinkSync(curPath);
            }
        });
        rmdirSync(dirPath);
    }
}

export function syncWidgetSets(
    enabledList: { path: string; name: string; pack: ioBroker.AdapterObject }[],
    forceBuild?: boolean,
): {
    widgetSets: { name: string; v2: boolean }[];
    filesChanged: boolean;
} {
    let filesChanged = false;
    let name: string;
    const v2: Record<string, boolean> = {};

    const normalizedWwwDir = normalize(wwwDir);
    // Now we have the list of widgets => copy them all to widgets directory
    for (let d = 0; d < enabledList.length; d++) {
        const _changed = copyFolderRecursiveSync(`${enabledList[d].path}/widgets/`, normalizedWwwDir, forceBuild);
        if (_changed) {
            filesChanged = true;
        }
        console.log(
            `Check ${enabledList[d].path.replace(/\\/g, '/').split('/').pop()}... ${_changed ? 'COPIED.' : 'no changes.'}`,
        );
        v2[enabledList[d].name.replace('iobroker.', '').replace('ioBroker.', '')] =
            !!enabledList[d].pack.common.visWidgets;
    }

    const widgetSets: { name: string; v2: boolean }[] = [];

    // Read the list of installed widgets
    const installed = readdirSync(`${wwwDir}widgets/`);
    for (let d = 0; d < installed.length; d++) {
        if (installed[d].match(/\.html$/)) {
            name = installed[d].replace('.html', '');
            const isGeneric = generic.includes(name);

            const found = enabledList.find(
                w => w.name.toLowerCase() === `iobroker.vis-${name}` || w.name.toLowerCase() === `iobroker.${name}`,
            );

            if (!found && !isGeneric) {
                filesChanged = true;
                // delete
                unlinkSync(`${wwwDir}widgets/${name}.html`);
                if (existsSync(`${wwwDir}widgets/${name}`)) {
                    deleteFolderRecursive(normalize(`${wwwDir}widgets/${name}`));
                }
            } else {
                // the sets vis-2 ships itself come from no adapter, so none of them is a vis-2 set
                widgetSets.push({ name, v2: isGeneric ? false : v2[name] });
            }
        }
    }

    return { widgetSets, filesChanged };
}
