/** `_PRJ_NAME/` at the start of a path stands for the folder of the project, e.g. `_PRJ_NAME/img/logo.png`. */
const PROJECT_PREFIX = /_PRJ_NAME\//g;

/** Where the files of a project are: the adapter, the instance and the project of the runtime. */
interface ProjectLocation {
    adapterName: string;
    instance: number | string;
    projectName: string;
}

/**
 * The folder of the project as the browser loads files from it, e.g. `../vis-2.0/main`.
 *
 * @param location - the adapter, the instance and the project of the runtime, e.g. the context of a widget
 */
export function getProjectPath(location: ProjectLocation): string {
    return `../${location.adapterName}.${location.instance}/${location.projectName}`;
}

/**
 * Resolves every `_PRJ_NAME/` in a piece of HTML, e.g. in `<img src="_PRJ_NAME/logo.png">` or in
 * `background-image: url(_PRJ_NAME/bg.jpg)`. The image fields of the widgets do that for their value, but the
 * HTML of a widget is handed to the browser as it is, which does not know the placeholder.
 *
 * @param html - the HTML of a widget
 * @param projectPath - the folder of the project, from `getProjectPath()`
 */
export function replaceProjectPathInHtml(html: string, projectPath: string): string {
    return html.includes('_PRJ_NAME/') ? html.replace(PROJECT_PREFIX, `${projectPath}/`) : html;
}
