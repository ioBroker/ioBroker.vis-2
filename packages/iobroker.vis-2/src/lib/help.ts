/**
 * The answer of `help`: how vis-2 is steered from outside, written for an AI agent (e.g. ioBroker.pi-agent, or the
 * MCP server with `send_to`). Keep it in sync with `onUserCommand` in src-vis/src/Vis/visEngine.tsx and the section
 * "Control interface" of the README.
 */

/** The commands `processMessage` answers for others than the editor (`checkLicense` and `ai:*` are its own) */
export const HELP_COMMANDS: { command: string; write: boolean }[] = [
    { command: 'help', write: false },
    { command: 'rebuild', write: true },
];

/** At most this many projects, views of one project and dialogs of one project are listed */
export const MAX_PROJECTS = 20;
export const MAX_VIEWS = 100;
export const MAX_DIALOGS = 30;
/** At most this many browsers are remembered */
export const MAX_BROWSERS = 30;

/** A browser that reported the view it shows (`changedView`) */
export interface BrowserSeen {
    /** its ID, `control.instance` */
    instance: string;
    /** what it shows, `control.data`: "project/view" */
    view: string;
    /** when */
    ts: number;
}

/** What `changeView` and `dialog` can name in one project */
export interface ProjectInfo {
    name: string;
    views: string[];
    /** views left out after MAX_VIEWS */
    moreViews: number;
    dialogs: { id: string; name: string; view: string }[];
}

/** The jQui dialogs and the containers that open as a dialog, not the button that closes one */
const DIALOG_TPL = /^tpl(Jqui|Container)\w*Dialog/;
const NO_DIALOG_TPL = /DialogClose$/;

interface WidgetJson {
    tpl?: unknown;
    data?: Record<string, unknown> | null;
}

/**
 * The views and dialogs of a project, from its `vis-views.json`
 *
 * @param name - name of the project (its folder)
 * @param project - the parsed `vis-views.json`
 */
export function projectInfo(name: string, project: unknown): ProjectInfo {
    const views: string[] = [];
    const dialogs: ProjectInfo['dialogs'] = [];
    let moreViews = 0;
    const json = project && typeof project === 'object' ? (project as Record<string, unknown>) : {};
    for (const [view, value] of Object.entries(json)) {
        if (view === '___settings' || !value || typeof value !== 'object') {
            continue;
        }
        if (views.length < MAX_VIEWS) {
            views.push(view);
        } else {
            moreViews++;
        }
        const widgets = (value as { widgets?: Record<string, WidgetJson> | null }).widgets || {};
        for (const [id, widget] of Object.entries(widgets)) {
            if (dialogs.length >= MAX_DIALOGS || !widget || typeof widget !== 'object') {
                continue;
            }
            const tpl = typeof widget.tpl === 'string' ? widget.tpl : '';
            const data = widget.data || {};
            // a button of jQui opens a dialog when it holds HTML or a view
            const isDialog =
                (DIALOG_TPL.test(tpl) && !NO_DIALOG_TPL.test(tpl)) || !!data.html_dialog || !!data.contains_view;
            if (isDialog) {
                const dialogName = typeof data.dialogName === 'string' ? data.dialogName.trim() : '';
                const widgetName = typeof data.name === 'string' ? data.name.trim() : '';
                dialogs.push({ id, name: dialogName || widgetName, view });
            }
        }
    }
    return { name, views, moreViews, dialogs };
}

/**
 * Remember the view a browser reported; the newest comes last
 *
 * @param browsers - the browsers seen so far, by ID
 * @param seen - the report
 */
export function rememberBrowser(browsers: Map<string, BrowserSeen>, seen: BrowserSeen): void {
    if (!seen.instance || seen.instance === 'notdefined') {
        return;
    }
    browsers.delete(seen.instance);
    browsers.set(seen.instance, seen);
    while (browsers.size > MAX_BROWSERS) {
        browsers.delete(browsers.keys().next().value as string);
    }
}

/** How long ago, in words */
function ago(ts: number, now: number): string {
    const minutes = Math.round((now - ts) / 60_000);
    if (minutes < 1) {
        return 'just now';
    }
    if (minutes < 120) {
        return `${minutes} min ago`;
    }
    const hours = Math.round(minutes / 60);
    return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
}

/**
 * The text of `help`
 *
 * @param options - the instance, its projects and the browsers seen
 * @param options.namespace - e.g. "vis-2.0"
 * @param options.projects - the projects
 * @param options.moreProjects - projects left out after MAX_PROJECTS
 * @param options.browsers - the browsers that reported a view, oldest first
 * @param options.now - the time to count "ago" from
 */
export function helpText(options: {
    namespace: string;
    projects: ProjectInfo[];
    moreProjects?: number;
    browsers: BrowserSeen[];
    now: number;
}): string {
    const ns = options.namespace;
    const lines = [
        `ioBroker.vis-2: the visualization. A project (a folder in the files of ${ns}) holds views, each a page of`,
        'widgets; a browser shows one view of one project at a time. Browsers are steered through the states',
        `${ns}.control.*, not through send_to.`,
        '',
        `To steer: write one JSON text into ${ns}.control.command (set_state; it needs "Write allowed" for ${ns}), e.g.`,
        '  {"instance": "*", "command": "changeView", "data": "main/Energy"}',
        '- instance: the ID of one browser, exactly as listed under "Browsers" below, or "*" for every open browser.',
        '- command, and what data must be:',
        '  - changeView, data "project/view" (or "view" alone: that view of the project the browser shows): shows the',
        '    view; a view of another project loads that project. Use "project/view" when there is more than one project.',
        '  - alert, data "message;title;icon": shows a message window; title and icon (a jQuery UI icon name such as',
        '    "info") are optional, e.g. "Door open;;info".',
        '  - dialog / dialogClose, data the ID of a dialog widget (e.g. "w00056") or its dialog name: opens or closes the',
        '    dialog; it must be on the view the browser shows.',
        `  - playSound, data a URL or a file of vis-2 ("/${ns}/main/img/bell.mp3"): plays it; a browser plays sound only`,
        '    after someone touched the page once.',
        '  - tts, data a text: speaks it; only the ioBroker app on a phone or tablet can.',
        '  - popup, data a URL: opens a new browser window (browsers often block it).',
        '  - refresh (same as reload), data "": loads the page again, e.g. after the project was changed.',
        '  A browser in the editor only shows the command as a message.',
        `Instead of the JSON, ${ns}.control.instance and ${ns}.control.data can be written first and then`,
        `${ns}.control.command with the bare command name.`,
        '',
        `Confirmation: every browser that changes its view (and every one that starts) writes ${ns}.control.instance =`,
        `its ID, ${ns}.control.data = "project/view" and ${ns}.control.command = "changedView", all with ack=true. So`,
        `after changeView read ${ns}.control.data: if it stays as it was, no browser of that ID is open, or the view`,
        'was shown already, or it has no such view.',
        '',
        `Commands (send_to ${ns}): help (this text, only reads); rebuild (builds the widget pages anew after a widget set`,
        'was installed or changed; only when the user asks for it).',
        '',
    ];

    if (options.projects.length) {
        lines.push('Projects, their views (data of changeView) and dialogs (data of dialog):');
        for (const project of options.projects) {
            const more = project.moreViews ? `, … (${project.moreViews} more)` : '';
            lines.push(`- ${project.name}: ${project.views.join(', ') || '(no views)'}${more}`);
            for (const dialog of project.dialogs) {
                lines.push(`  - dialog ${dialog.id}${dialog.name ? ` "${dialog.name}"` : ''} on view ${dialog.view}`);
            }
        }
        if (options.moreProjects) {
            lines.push(`- … ${options.moreProjects} more projects`);
        }
    } else {
        lines.push(`Projects: none found in the files of ${ns}.`);
    }
    lines.push('');

    if (options.browsers.length) {
        lines.push(`Browsers that reported their view since ${ns} started, newest first (ID: view, when):`);
        for (const browser of [...options.browsers].reverse()) {
            lines.push(`- ${browser.instance}: ${browser.view}, ${ago(browser.ts, options.now)}`);
        }
        lines.push('A browser that did not change its view since then is open all the same: "*" reaches it too.');
    } else {
        lines.push(`Browsers: none reported its view since ${ns} started; use "*" to reach every open browser.`);
    }
    return lines.join('\n');
}
