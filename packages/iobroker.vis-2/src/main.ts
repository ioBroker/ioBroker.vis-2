/**
 *
 *      iobroker vis-2 Adapter
 *
 *      Copyright (c) 2021-2026, bluefox
 *
 *      CC-NC-BY 4.0 License
 *
 */
import { Adapter, Credentials, type AdapterOptions } from '@iobroker/adapter-core';
import { readFileSync, existsSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { normalize } from 'node:path';
import https from 'node:https';
import { verify } from 'jsonwebtoken';
import { syncWidgetSets } from './lib/install';
import { chatCompletion, listModels, type ChatAnswer } from './lib/ai/chat';
import {
    getProviderCredentialId,
    listAvailableProviders,
    resolveProviderCredentials,
    resolveTestEndpoint,
    resolveMaxTokens,
    resolveRequestTimeout,
    type AiConfigSlice,
    type AiProvider,
} from './lib/ai/credentials';
import type { OpenAIMessage } from './lib/ai/anthropic';

/**
 * What a field of the configuration page sent, or nothing where it holds nothing.
 *
 * The test buttons of the page carry the form into the message with `${data.field}` patterns, and a
 * field that was never filled in arrives as an empty word - or, depending on the admin, as the pattern
 * itself. Neither is an answer, and both must not be taken for a key.
 *
 * @param value - what arrived in the message
 */
function fromForm(value: unknown): string | undefined {
    if (typeof value !== 'string' && typeof value !== 'number') {
        return undefined;
    }
    const text = `${value}`.trim();
    if (!text || text === 'undefined' || text === 'null' || text.includes('${')) {
        return undefined;
    }

    return text;
}

function loadIoPack(): ioBroker.AdapterObject {
    const path = `${__dirname}/../io-package.json`;
    try {
        return JSON.parse(readFileSync(path).toString());
    } catch (e) {
        console.error(`Cannot read or parse "${path}": ${(e as Error).message}`);
        process.exit(1);
    }
}

const ioPack: ioBroker.AdapterObject = loadIoPack();

const cert = readFileSync(`${__dirname}/lib/cloudCert.crt`);

const POSSIBLE_WIDGET_SETS_LOCATIONS = [
    normalize(`${__dirname}/../../`),
    normalize(`${__dirname}/../node_modules/`),
    normalize(`${__dirname}/../../../`),
    normalize(`${__dirname}/../../../../`),
    normalize(`${__dirname}/../../../../node_modules/`),
];

export interface VisAdapterConfig extends ioBroker.AdapterConfig, AiConfigSlice {
    defaultFileMode: number;
    license: string;
    useLicenseManager: boolean;
    doNotShowProjectDialog: boolean;
    loadingBackgroundColor: string;
    loadingHideLogo: boolean;
    loadingBackgroundImage: boolean;
    forceBuild: boolean;
}

const wwwDir = existsSync(`${__dirname}/../www`) ? `${__dirname}/../www` : `${__dirname}/www`;

/**
 * The instance message the editor subscribes to, and under which a finished answer is pushed to it.
 *
 * Shared verbatim with `src-vis/src/AiChat/aiService.ts`.
 */
const AI_PUSH_MESSAGE_TYPE = 'aiChatAnswer';

class VisAdapter extends Adapter {
    declare public visConfig: VisAdapterConfig;
    private widgetInstances: Record<string, string> = {};
    private stoppingPromise: null | (() => void) = null;
    private isLicenseError = false;
    private lastProgressUpdate: number = 0;
    private synchronizing = false;
    private synchronizingQueued: { forceBuild: boolean } | null = null;
    private vendorPrefix = '';
    /** The editors waiting for pushed answers: the token they chose, and the socket it reached us on */
    private aiUiClients = new Map<string, string>();

    constructor(options: Partial<AdapterOptions> = {}) {
        options = {
            ...options,
            name: 'vis-2',
            message: obj => this.processMessage(obj),
            unload: callback => {
                if (this.synchronizing) {
                    void new Promise<void>((resolve): void => {
                        this.stoppingPromise = resolve;
                    }).then(() => callback?.());
                } else {
                    callback?.();
                }
            },
            ready: () => void this.main(),
            uiClientSubscribe: info => this.onUiClientSubscribe(info),
            uiClientUnsubscribe: info => this.onUiClientUnsubscribe(info),
        };

        super({
            ...options,
            name: 'vis-2',
        });

        this.visConfig = this.config as VisAdapterConfig;
    }

    async objectChange(id: string, obj: ioBroker.Object | null | undefined): Promise<void> {
        // if it is an instance object
        if (
            id.startsWith('system.adapter.') &&
            id.match(/\d+$/) &&
            id !== 'system.adapter.vis.0' &&
            id !== 'system.adapter.vis-2.0'
        ) {
            if (obj && obj.type !== 'instance') {
                return;
            }
            id = id.substring('system.adapter.'.length).replace(/\.\d+$/, '');
            if (!obj?.common?.version) {
                if (this.widgetInstances[id]) {
                    delete this.widgetInstances[id];
                    await this.buildHtmlPages(false);
                }
            } else if (POSSIBLE_WIDGET_SETS_LOCATIONS.find(dir => existsSync(`${dir}/iobroker.${id}/widgets/`))) {
                // Check if the widgets folder exists
                // still exists
                if (!this.widgetInstances[id] || this.widgetInstances[id] !== obj.common.version) {
                    this.widgetInstances[id] = obj.common.version;
                    await this.buildHtmlPages(false);
                }
            } else if (this.widgetInstances[id]) {
                delete this.widgetInstances[id];
                await this.buildHtmlPages(false);
            }
        }
    }

    /**
     * An editor says it wants its answers pushed.
     *
     * It names a token of its own making; what is kept here is which socket that token came in on, so
     * that an answer can be sent back to that one editor and not to every tab that happens to be open.
     *
     * @param info - the client and the message it subscribed with
     * @param info.clientId - the socket the subscription came in on
     * @param info.message - what the editor sent with it
     */
    private onUiClientSubscribe(info: { clientId: string; message: ioBroker.Message }): {
        accepted: boolean;
        error?: string;
    } {
        const message = info.message?.message as { type?: string; data?: { sessionToken?: string } } | undefined;
        if (message?.type !== AI_PUSH_MESSAGE_TYPE) {
            return { accepted: false, error: `Unknown subscription type "${message?.type || ''}"` };
        }
        const token = (message.data?.sessionToken || '').trim();
        if (!token) {
            return { accepted: false, error: 'No session token provided' };
        }
        this.aiUiClients.set(token, info.clientId);
        this.log.debug(`An editor waits for pushed AI answers (${this.aiUiClients.size} open)`);
        return { accepted: true };
    }

    /**
     * An editor went away - every token that pointed at it is worthless now.
     *
     * @param info - the client that is going away
     * @param info.clientId - the socket that is gone
     */
    private onUiClientUnsubscribe(info: { clientId: string }): void {
        for (const [token, clientId] of this.aiUiClients) {
            if (clientId === info.clientId) {
                this.aiUiClients.delete(token);
            }
        }
        this.log.debug(`An editor stopped waiting for pushed AI answers (${this.aiUiClients.size} open)`);
    }

    /**
     * How the answer of one `aiChat` request gets back to whoever asked.
     *
     * A socket callback does not live long enough for this question. `@iobroker/ws` gives up on one
     * after thirty seconds and the web adapter even earlier, while a model that is handed a page of
     * widgets and a dozen tools regularly takes longer - and the answer then arrived at a callback
     * that no longer existed: an empty bubble, no error, and nothing in any log, because the adapter
     * had done its job.
     *
     * So an editor that subscribed for pushed answers gets the callback answered at once, with
     * nothing but `accepted`, and the answer itself as an instance message whenever it is ready.
     * Anything else - an older editor, a script asking the same question - is answered the plain way
     * and has to stay inside the thirty seconds.
     *
     * @param msg - the request as it came in
     */
    private buildAiResponder(msg: ioBroker.Message): (payload: ChatAnswer) => void {
        const token = (msg.message?.uiSession || '').toString().trim();
        const requestId = (msg.message?.requestId || '').toString().trim();
        const clientId = token ? this.aiUiClients.get(token) : undefined;

        if (!clientId || !requestId) {
            return payload => this.sendTo(msg.from, msg.command, payload, msg.callback);
        }

        // let go of the callback while it is still worth something; the request may now take its time
        this.sendTo(msg.from, msg.command, { accepted: true, requestId }, msg.callback);
        let sent = false;
        return payload => {
            if (sent) {
                return;
            }
            sent = true;
            this.sendToUI({ clientId, data: { type: AI_PUSH_MESSAGE_TYPE, requestId, ...payload } }).catch(e => {
                // the tab was closed, or the socket died while the model was thinking
                this.aiUiClients.delete(token);
                this.log.warn(`Cannot deliver the AI answer to the editor: ${e instanceof Error ? e.message : e}`);
            });
        };
    }

    async processMessage(msg: ioBroker.Message): Promise<void> {
        if (msg?.command === 'checkLicense' && msg.message && msg.callback) {
            const obj = await this.getForeignObjectAsync(`system.adapter.${msg.message}.0`);
            if (!obj?.native || (!obj.native.license && !obj.native.useLicenseManager)) {
                console.log(`[${msg.message}] License not found`);
                this.sendTo(msg.from, msg.command, { error: 'License not found' }, msg.callback);
            } else {
                const result = await this.checkL(obj.native.license, obj.native.useLicenseManager, msg.message);
                this.sendTo(msg.from, msg.command, { result }, msg.callback);
            }
        } else if (msg?.command === 'rebuild' && msg.callback) {
            if (!this.synchronizing) {
                this.sendTo(msg.from, msg.command, { result: 'done' }, msg.callback);
                await this.buildHtmlPages(true);
                this.log.warn('Force build done!');
            } else {
                this.sendTo(msg.from, msg.command, { error: 'already running' }, msg.callback);
            }
        } else if (msg?.command === 'getAvailableAiProviders' && msg.callback) {
            // the editor asks what it may offer; it never learns a key
            this.sendTo(msg.from, msg.command, { providers: listAvailableProviders(this.visConfig) }, msg.callback);
        } else if (msg?.command === 'aiModels' && msg.callback) {
            const provider = (msg.message?.provider || 'openai') as AiProvider;
            const { apiKey, baseUrl, error } = await this.resolveAiTestCredentials(provider, msg.message);
            // the test button of the configuration page asks the provider for its models, and a request
            // without a key comes back as `401` from the other end - which says nothing about what is
            // actually missing here
            if (error || (!apiKey && !baseUrl)) {
                this.sendTo(msg.from, msg.command, { error: error || `No API key for "${provider}"` }, msg.callback);
                return;
            }
            const result = await listModels(provider, apiKey, baseUrl);
            // the same command serves the test button of the configuration page, which shows `result`
            this.sendTo(
                msg.from,
                msg.command,
                result.error
                    ? { error: result.error }
                    : { models: result.models, result: `${result.models?.length || 0} models` },
                msg.callback,
            );
        } else if (msg?.command === 'aiChat' && msg.callback) {
            // built before the first answer: it decides whether this one goes back through the callback
            const respond = this.buildAiResponder(msg);
            const provider = (msg.message?.provider || 'openai') as AiProvider;
            const model: string = (msg.message?.model || '').trim();
            const messages: OpenAIMessage[] = msg.message?.messages;
            // nothing of the endpoint or the credential comes out of the message - see the method
            const { apiKey, baseUrl, error } = await this.resolveAiCredentials(provider);

            // an endpoint of one's own may need no key - a model on the same host usually does not -
            // but every provider that is somebody else's service does
            if (error || (!apiKey && !baseUrl)) {
                respond({ error: error || `No API key for "${provider}"` });
                return;
            }
            if (!model || !Array.isArray(messages) || !messages.length) {
                respond({ error: 'Model and messages are required' });
                return;
            }

            const answer = await chatCompletion({
                provider,
                model,
                messages,
                tools: msg.message?.tools,
                apiKey,
                baseUrl,
                timeout: resolveRequestTimeout(msg.message?.timeout),
                maxTokens: resolveMaxTokens(this.visConfig.aiMaxTokens),
            });
            respond(answer);
        }
    }

    /**
     * The key of an AI provider, out of wherever it is kept.
     *
     * Either it stands in this instance's own configuration, encrypted, or the configuration only names
     * an entry of the central credential store that several adapters share. The second way is the one
     * to prefer: somebody who has already given their key to `javascript` should not have to give it
     * again, and a key that lives in one place is a key that can be changed in one place.
     *
     * Nothing of this comes out of the request. A caller who could name the address could have the key
     * of this instance carried to one of their own, and a caller who could name the credential could
     * pick any entry of the store to carry. The test button of the configuration page is the one place
     * that may try unsaved values - see `resolveAiTestCredentials`.
     *
     * @param provider - which provider is about to be asked
     */
    private async resolveAiCredentials(provider: AiProvider): Promise<{
        apiKey: string;
        baseUrl: string;
        error?: string;
    }> {
        const { apiKey, baseUrl } = resolveProviderCredentials(this.visConfig, provider);
        const mode = this.visConfig.aiCredentialType || 'manual';

        if (mode !== 'manager') {
            return { apiKey, baseUrl };
        }

        const id = getProviderCredentialId(this.visConfig, provider);
        if (!id) {
            return { apiKey: '', baseUrl, error: `No credential was chosen for "${provider}"` };
        }
        const credential = await this.readCredential(id);

        return { apiKey: credential.key, baseUrl, error: credential.error };
    }

    /**
     * Endpoint and key for a test button of the configuration page.
     *
     * The buttons try what is in the form - a key that was typed but not saved, a credential that was
     * chosen but not saved, an endpoint that was entered but not saved. What the form may decide is
     * limited by `resolveTestEndpoint`: a secret of this system is never carried to an address that
     * came with the message.
     *
     * @param provider - the provider the page is testing
     * @param message - the message of the test button
     * @param message.baseUrl - the address of an endpoint of one's own, as it stands in the form
     * @param message.apiKey - the key that stands in the form
     * @param message.credentialId - the entry of the central store that the form names
     * @param message.credentialType - where the form says the keys are kept
     */
    private async resolveAiTestCredentials(
        provider: AiProvider,
        message?: {
            baseUrl?: string;
            apiKey?: string;
            credentialId?: string;
            credentialType?: 'manual' | 'manager';
        },
    ): Promise<{ apiKey: string; baseUrl: string; error?: string }> {
        const form = { apiKey: fromForm(message?.apiKey), baseUrl: fromForm(message?.baseUrl) };
        const baseUrl = resolveTestEndpoint(this.visConfig, provider, form);
        const mode = fromForm(message?.credentialType) || this.visConfig.aiCredentialType || 'manual';

        if (mode !== 'manager') {
            // a key that was typed but not saved yet is still the key that is meant
            return { apiKey: form.apiKey || resolveProviderCredentials(this.visConfig, provider).apiKey, baseUrl };
        }

        const id = fromForm(message?.credentialId) || getProviderCredentialId(this.visConfig, provider);
        if (!id) {
            return { apiKey: '', baseUrl, error: `No credential was chosen for "${provider}"` };
        }
        const credential = await this.readCredential(id);

        return { apiKey: credential.key, baseUrl, error: credential.error };
    }

    /**
     * One entry of the central credential store.
     *
     * The store came with js-controller 7.2; on anything older there is nothing to read and the
     * adapter says so rather than failing silently with an empty key.
     *
     * @param id - the id of the entry, like `system.credentials.anthropic`
     */
    private async readCredential(id: string): Promise<{ key: string; error?: string }> {
        const fail = (error: string): { key: string; error: string } => {
            this.log.warn(`Cannot read the credential "${id}": ${error}`);
            return { key: '', error };
        };

        try {
            // an older `@iobroker/adapter-core` knows no credential store at all
            if (typeof Credentials?.getCredentials !== 'function') {
                return fail('the credential store needs js-controller 7.2 and @iobroker/adapter-core 3.4');
            }
            const entry = await Credentials.getCredentials<Credentials.KeyCredentials>(this, id);
            /*
             * Only an entry that was stored as an AI credential. The store holds the secrets of the
             * whole system - a database password, the login of a camera - and nothing but this check
             * keeps a request for "the key of this provider" from reaching one of them.
             */
            if (entry?.type !== 'ai') {
                return fail('it is not an AI credential');
            }
            const key = (entry?.values?.key || '').trim();

            // a credential of a login and a password is not an API key, and neither is one that was
            // never filled in - saying so beats a request that comes back as a `401`
            return key ? { key } : fail('it holds no key');
        } catch (e) {
            return fail(e instanceof Error ? e.message : String(e));
        }
    }

    static collectWidgetSets(
        dir: string,
        sets?: { path: string; name: string; pack: ioBroker.AdapterObject }[],
    ): { path: string; name: string; pack: ioBroker.AdapterObject }[] {
        sets ||= [];
        if (!existsSync(dir)) {
            return sets;
        }
        const dirs: string[] = readdirSync(dir);
        dir = dir.replace(/\\/g, '/');
        if (!dir.endsWith('/')) {
            dir += '/';
        }
        for (let d = 0; d < dirs.length; d++) {
            const name = dirs[d].toLowerCase();
            const widgetPath = `${dir}${dirs[d]}/widgets/`;
            if (name.startsWith('iobroker.') && !sets.find(s => s.name === name) && existsSync(widgetPath)) {
                let pack;
                try {
                    pack = JSON.parse(readFileSync(`${dir}${dirs[d]}/io-package.json`).toString());
                } catch (e) {
                    pack = null;
                    console.warn(`Cannot parse "${dir}${dirs[d]}/io-package.json": ${e}`);
                }
                sets.push({ path: dir + dirs[d], name, pack });
            }
        }

        return sets;
    }

    async readAdapterList(): Promise<{ path: string; name: string; pack: ioBroker.AdapterObject }[]> {
        const res = await this.getObjectViewAsync('system', 'instance', {});

        const instances: string[] = [];
        res.rows.forEach(item => {
            const obj = item.value;
            // ignore widgets for V1 only
            if (
                obj?.common?.visWidgets &&
                Object.values(obj?.common?.visWidgets).find(w => w?.ignoreInVersions?.includes(2))
            ) {
                return;
            }
            const name = obj?._id?.replace('system.adapter.', '').replace(/\.\d+$/, '');
            if (name && !instances.includes(name)) {
                instances.push(name);
            }
        });

        instances.sort();

        let sets: { path: string; name: string; pack: ioBroker.AdapterObject }[] = [];
        POSSIBLE_WIDGET_SETS_LOCATIONS.forEach(dir => VisAdapter.collectWidgetSets(dir, sets));
        sets = sets.filter(s => instances.includes(s.name.substring('iobroker.'.length)));

        return sets;
    }

    async buildHtmlPages(forceBuild: boolean): Promise<void> {
        if (this.synchronizing) {
            this.synchronizingQueued = { forceBuild };
            return;
        }

        this.synchronizing = true;
        const enabledList = await this.readAdapterList();
        const configChanged = await this.generateConfigPage(forceBuild, enabledList);

        this.widgetInstances = {};
        enabledList.forEach(
            instance =>
                (this.widgetInstances[instance.name.substring('iobroker.'.length)] = instance.pack?.common?.version),
        );

        const { widgetSets, filesChanged } = syncWidgetSets(enabledList, forceBuild);
        const widgetsChanged = await this.generateWidgetsHtml(widgetSets, forceBuild);

        let uploadedIndexHtml: string | null;
        let indexHtml = '';
        if (existsSync(`${wwwDir}/index.html`)) {
            indexHtml = readFileSync(`${wwwDir}/index.html`).toString('utf8');
            try {
                const file = await this.readFileAsync('vis-2', 'index.html');
                if (typeof file === 'object') {
                    uploadedIndexHtml = file.file.toString('utf8');
                } else {
                    uploadedIndexHtml = (file as string).toString();
                }
            } catch {
                // ignore
                uploadedIndexHtml = '';
            }
        } else {
            uploadedIndexHtml = '';
        }

        let uploadedEditHtml: string | null;
        let editHtml = '';
        if (existsSync(`${wwwDir}/edit.html`)) {
            editHtml = readFileSync(`${wwwDir}/edit.html`).toString('utf8');
            try {
                const file = await this.readFileAsync('vis-2', 'edit.html');
                if (typeof file === 'object') {
                    uploadedEditHtml = file.file.toString('utf8');
                } else {
                    uploadedEditHtml = (file as string).toString();
                }
            } catch {
                // ignore
                uploadedEditHtml = '';
            }
        } else {
            uploadedEditHtml = '';
        }

        if (
            configChanged ||
            widgetsChanged ||
            filesChanged ||
            uploadedIndexHtml !== indexHtml ||
            uploadedEditHtml !== editHtml ||
            forceBuild
        ) {
            try {
                await this.uploadAdapter();
            } catch (e) {
                this.log.error(`Could not upload adapter: ${e.message}`);
            }

            // terminate promise
            if (this.stoppingPromise) {
                if (typeof this.stoppingPromise === 'function') {
                    this.stoppingPromise();
                    this.stoppingPromise = null;
                }
                this.synchronizing = false;
                return;
            }

            await this.setState('info.uploaded', Date.now(), true);
        } else {
            const state = await this.getStateAsync('info.uploaded');
            if (state?.val == null) {
                await this.setState('info.uploaded', Date.now(), true);
            }
        }
        this.synchronizing = false;
        if (typeof this.stoppingPromise === 'function') {
            this.stoppingPromise();
            this.stoppingPromise = null;
        } else if (this.synchronizingQueued && !this.visConfig.forceBuild) {
            const forceBuild = this.synchronizingQueued.forceBuild;
            this.synchronizingQueued = null;
            setImmediate(() => void this.buildHtmlPages(forceBuild));
        }
    }

    async generateWidgetsHtml(widgetSets: { name: string; v2: boolean }[], forceBuild: boolean): Promise<boolean> {
        let text = '';
        for (let w = 0; w < widgetSets.length; w++) {
            const widgetSet = widgetSets[w];
            let file;
            const name = `${widgetSet.name}.html`;

            // ignore the HTML file if adapter has widgets for vis-1 and vis-2. Vis-2 will be loaded from js file and nor from html
            if (widgetSet.v2) {
                continue;
            }

            try {
                file = readFileSync(`${wwwDir}/widgets/${name}`);
                // extract all css and js

                // mark all scripts with data-widgetset attribute
                file = file.toString().replace(/<script/g, `<script data-widgetset="${name.replace('.html', '')}"`);

                text += `<!-- --------------${name}--- START -->\n${file.toString()}\n<!-- --------------${name}--- END -->\n`;
            } catch {
                this.log.warn(`Cannot read file www/widgets/${name}`);
            }
        }

        let data;
        try {
            data = await this.readFileAsync('vis-2', 'widgets.html');
        } catch {
            // ignore
        }
        if (typeof data === 'object') {
            data = data.file;
        }
        if (data && (data !== text || forceBuild)) {
            try {
                writeFileSync(`${wwwDir}/widgets.html`, text);
                // upload a file to DB
                await this.writeFileAsync('vis-2', 'www/widgets.html', text);
            } catch (e) {
                this.log.error(`Cannot write file www/widgets.html: ${e}`);
            }
            return true;
        } else if (
            !existsSync(`${wwwDir}/widgets.html`) ||
            readFileSync(`${wwwDir}/widgets.html`).toString() !== text
        ) {
            try {
                writeFileSync(`${wwwDir}/widgets.html`, text);
            } catch (e) {
                this.log.error(`Cannot write file www/widgets.html: ${e}`);
            }
        }

        return false;
    }

    async generateConfigPage(
        forceBuild: boolean,
        enabledList: { path: string; name: string; pack: ioBroker.AdapterObject }[],
    ): Promise<boolean> {
        let changed = forceBuild || false;

        // for back compatibility with vis.1 on cloud
        const widgetSets = ['basic', 'jqplot', 'jqui', 'swipe', 'tabs'];

        // collect vis-1 widgets
        enabledList.forEach(obj => {
            if (!obj.pack.common.visWidgets) {
                // find folder in widgets
                let widgetsPath = `${__dirname}/../node_modules/${obj.name}/widgets`;
                if (!existsSync(widgetsPath)) {
                    widgetsPath = `${__dirname}/../${obj.name}/widgets`;
                    if (!existsSync(widgetsPath)) {
                        widgetsPath = '';
                    }
                }
                if (widgetsPath) {
                    readdirSync(widgetsPath).forEach(file => {
                        if (file.match(/\.html$/)) {
                            const folderName = file.replace('.html', '');
                            !widgetSets.includes(folderName) && widgetSets.push(folderName);
                        }
                    });
                }
            }
        });

        const configJs = `window.isLicenseError = ${this.isLicenseError};
// inject the adapter instance
window.visAdapterInstance = ${this.instance};
window.vendorPrefix = '${this.vendorPrefix}';
window.disableDataReporting = ${(this.common as any)?.disableDataReporting ? 'true' : 'false'};
window.loadingBackgroundColor = '${this.visConfig.loadingBackgroundColor || ''}';
window.loadingBackgroundImage = '${this.visConfig.loadingBackgroundImage ? `../${this.namespace}/loading-bg.png` : ''}';
window.loadingHideLogo = '${this.visConfig.loadingHideLogo ? 'true' : ''}';
// for back compatibility with vis.1 on cloud
window.visConfig = {
    "widgetSets": ${JSON.stringify(widgetSets)}
};
if (typeof exports !== 'undefined') {
    exports.config = visConfig;
} else {
    window.visConfig.language = window.navigator.userLanguage || window.navigator.language;
}
`;

        // upload config.js
        let currentConfigJs: string;
        try {
            const file = await this.readFileAsync('vis-2', 'config.js');
            currentConfigJs = file.file.toString('utf8');
        } catch {
            // ignore
            currentConfigJs = '';
        }

        if (!currentConfigJs || currentConfigJs !== configJs || forceBuild) {
            changed = true;
            this.log.info('config.js changed. Upload.');
            await this.writeFileAsync('vis-2', 'config.js', configJs);
            try {
                writeFileSync(`${wwwDir}/config.js`, configJs);
                if (!existsSync(`${wwwDir}/js`)) {
                    mkdirSync(`${wwwDir}/js`);
                }
                writeFileSync(`${wwwDir}/js/config.js`, configJs); // backwards compatibility with cloud
            } catch (e) {
                this.log.error(`Cannot write file www/config.js: ${e}`);
            }
        } else if (!existsSync(`${wwwDir}/config.js`) || readFileSync(`${wwwDir}/config.js`).toString() !== configJs) {
            try {
                writeFileSync(`${wwwDir}/config.js`, configJs);
                if (!existsSync(`${wwwDir}/js`)) {
                    mkdirSync(`${wwwDir}/js`);
                }
                writeFileSync(`${wwwDir}/js/config.js`, configJs); // backwards compatibility with cloud
            } catch (e) {
                this.log.error(`Cannot write file www/config.js: ${e}`);
            }
        }
        if (!existsSync(`${wwwDir}/js/config.js`) || readFileSync(`${wwwDir}/js/config.js`).toString() !== configJs) {
            try {
                !existsSync(`${wwwDir}/js`) && mkdirSync(`${wwwDir}/js`);
                writeFileSync(`${wwwDir}/js/config.js`, configJs); // backwards compatibility with cloud
            } catch (e) {
                this.log.error(`Cannot write file www/config.js: ${e}`);
            }
        }

        // Create a common user CSS file
        let data: string | null;
        try {
            const file = await this.readFileAsync(this.namespace, 'vis-common-user.css');
            if (file?.file) {
                data = file.file.toString();
            } else {
                data = null;
            }
        } catch {
            data = null;
        }

        if (data === null) {
            await this.writeFileAsync(this.namespace, 'vis-common-user.css', '');
        }

        return changed;
    }

    // delete this function as js.controller 4.0 will be mainstream
    async getSuitableLicensesEx(
        all: boolean,
        name: string,
    ): Promise<{ json: string; usedBy: string; invoice: string }[]> {
        // activate it again as js-controller 5.0.19 will be mainstream
        // return this.getSuitableLicenses(all, name);

        const licenses: {
            name: string;
            json: string;
            usedBy: string;
            invoice: string;
            decoded: {
                name: string;
                valid_till: string;
                version: string;
                uuid: string;
                invoice: string;
            };
        }[] = [];
        try {
            const obj = await this.getForeignObjectAsync('system.licenses');
            const uuidObj = await this.getForeignObjectAsync('system.meta.uuid');

            if (!uuidObj?.native?.uuid) {
                this.log.error('No UUID found!');
                return licenses;
            }
            const uuid: string = uuidObj.native.uuid;

            if (obj?.native?.licenses?.length) {
                const now = Date.now();
                const _obj = name
                    ? await this.getForeignObjectAsync(`system.adapter.${name === 'vis' ? 'vis-2' : name}`)
                    : null;

                let version: string;
                if (_obj?.common?.version) {
                    version = _obj.common.version.split('.')[0];
                } else {
                    version = this.pack?.version.split('.')[0] || '';
                }

                (
                    obj.native.licenses as {
                        name: string;
                        json: string;
                        usedBy: string;
                        invoice: string;
                        decoded: {
                            name: string;
                            valid_till: string;
                            version: string;
                            uuid: string;
                            invoice: string;
                        };
                    }[]
                ).forEach(license => {
                    try {
                        const decoded: {
                            name: string;
                            valid_till: string;
                            version: string;
                            uuid: string;
                            invoice: string;
                        } = verify(license.json, cert) as {
                            name: string;
                            valid_till: string;
                            version: string;
                            uuid: string;
                            invoice: string;
                        };
                        if (
                            decoded.name &&
                            (!decoded.valid_till ||
                                decoded.valid_till === '0000-00-00 00:00:00' ||
                                new Date(decoded.valid_till).getTime() > now)
                        ) {
                            if (
                                decoded.name.startsWith(`iobroker.${name || 'vis-2'}`) &&
                                (all || !license.usedBy || license.usedBy === this.namespace)
                            ) {
                                // Licenses for version ranges 0.x and 1.x are handled identically and are valid for both version ranges.
                                //
                                // If license is for adapter with version 0 or 1
                                if (
                                    decoded.version === '&lt;2' ||
                                    decoded.version === '<2' ||
                                    decoded.version === '<1' ||
                                    decoded.version === '<=1'
                                ) {
                                    // check the current adapter major version
                                    if (version !== '0' && version !== '1') {
                                        // exception if vis-1 has UUID, so it is valid for vis-2
                                        const exception =
                                            decoded.name === 'iobroker.vis' && version === '2' && decoded.uuid;

                                        if (!exception) {
                                            return;
                                        }
                                    }
                                } else if (decoded.version && decoded.version !== version) {
                                    // Licenses for adapter versions >=2 need to match to the adapter major version,
                                    // which means that a new major version requires new licenses if it would be "included"
                                    // in the last purchase

                                    // decoded.version could be only '<2' or direct version, like "2", "3" and so on
                                    return;
                                }

                                if (decoded.uuid && decoded.uuid !== uuid) {
                                    // License is not for this server
                                    return;
                                }

                                // remove free license if commercial license found
                                if (decoded.invoice !== 'free') {
                                    const pos = licenses.findIndex(item => item.invoice === 'free');
                                    if (pos !== -1) {
                                        licenses.splice(pos, 1);
                                    }
                                }
                                license.decoded = decoded;
                                licenses.push(license);
                            }
                        }
                    } catch (err) {
                        this.log.error(`Cannot decode license "${license.name}": ${err.message}`);
                    }
                });
            }
        } catch {
            // ignore
        }

        licenses.sort((a, b): 0 | 1 | -1 => {
            const aInvoice = a.decoded.invoice !== 'free';
            const bInvoice = b.decoded.invoice !== 'free';
            if (aInvoice === bInvoice) {
                return 0;
            }
            if (aInvoice) {
                return -1;
            }
            if (bInvoice) {
                return 1;
            }
            return 0;
        });

        return licenses;
    }

    async checkLicense(
        license: {
            name: string;
            version: string;
            expires: number;
            // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
            invoice: 'free' | string;
            // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
            type: 'commercial' | string;
            uuid: string;
        },
        uuid: string,
        originalError: Error | undefined,
        adapterName: string,
    ): Promise<boolean> {
        const _obj = adapterName
            ? await this.getForeignObjectAsync(`system.adapter.${adapterName === 'vis' ? 'vis-2' : adapterName}`)
            : null;
        let version;
        if (_obj?.common?.version) {
            version = _obj.common.version.split('.')[0];
        } else {
            version = this.version?.split('.')[0];
        }

        license.name = license.name.replace(/\.action$/, '');
        license.name = license.name.replace(/\.offline$/, '');

        if (license && license.expires * 1000 < new Date().getTime()) {
            this.log.error(`License error: Expired on ${new Date(license.expires * 1000).toString()}`);
            return true;
        }
        if (!license) {
            this.log.error(`License error: License is empty${originalError ? ` and ${originalError}` : ''}`);
            return true;
        }
        if (uuid.length !== 36 && license.invoice === 'free' && !uuid.startsWith('IO')) {
            this.log.error('Cannot use free license with commercial device!');
            return true;
        }
        if (license.name !== adapterName && license.name !== `iobroker.${adapterName}`) {
            this.log.error(`License is for other adapter "${license.name}". Expected "iobroker.${adapterName}"`);
            return true;
        }
        if (
            (license.type !== 'commercial' && version !== '1' && version !== license.version) ||
            (version === '1' &&
                license.version !== '&lt;2' &&
                license.version !== '<2' &&
                license.version !== '<1' &&
                license.version !== '<=1')
        ) {
            this.log.error(
                `License is for other adapter version "${license.name}@${license.version}". Expected "iobroker.${adapterName}@${version}"`,
            );
            return true;
        }
        const code = [];
        for (let i = 0; i < license.type.length; i++) {
            code.push(`\\u00${license.type.charCodeAt(i).toString(16)}`);
        }

        if (license.uuid && uuid !== license.uuid) {
            this.log.error(`License is for other device with UUID "${license.uuid}". This device has UUID "${uuid}"`);
            return true;
        }

        const t = '\u0063\u006f\u006d\u006d\u0065\u0072\u0063\u0069\u0061\u006c';
        if (t.length !== code.length) {
            if (originalError) {
                this.log.error(`Cannot check license: ${originalError}`);
            }
            return true;
        }
        for (let s = 0; s < code.length; s++) {
            if (code[s] !== `\\u00${t.charCodeAt(s).toString(16)}`) {
                if (originalError) {
                    this.log.error(`Cannot check license: ${originalError}`);
                }
                return true;
            }
        }

        return false;
    }

    async check(license: string, uuid: string, originalError: Error | undefined, name: string): Promise<boolean> {
        try {
            const decoded: {
                name: string;
                version: string;
                expires: number;
                // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
                invoice: 'free' | string;
                // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
                type: 'commercial' | string;
                uuid: string;
            } = verify(license, cert, { algorithms: ['RS256'] }) as {
                name: string;
                version: string;
                expires: number;
                // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
                invoice: 'free' | string;
                // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
                type: 'commercial' | string;
                uuid: string;
            };
            return await this.checkLicense(decoded, uuid, originalError, name);
        } catch (err) {
            this.log.error(`Cannot check license: ${(originalError as Error) || (err as Error)}`);
            return true;
        }
    }

    async doLicense(license: string, uuid: string, adapterName: string): Promise<boolean> {
        let version = this.version?.split('.')[0] || '2';
        // take the version of checked adapter
        if (adapterName !== 'vis' && adapterName !== 'vis-2') {
            const obj = await this.getForeignObjectAsync(`system.adapter.${adapterName}.0`);
            if (obj?.common?.version) {
                version = obj.common.version.split('.')[0];
            } else {
                version = '1';
            }
        }

        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                json: license,
                uuid,
                version,
            });

            // An object of options to indicate where to post to
            const postOptions = {
                host: 'iobroker.net',
                path: '/api/v1/public/cert',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data),
                },
                timeout: 10_000,
            };

            // Set up the request
            const postReq = https
                .request(postOptions, res => {
                    res.setEncoding('utf8');
                    let result = '';
                    res.on('data', chunk => (result += chunk));

                    res.on('end', (): void => {
                        try {
                            const data = JSON.parse(result);
                            if (data.result === 'OK') {
                                data.name = data.name.replace(/\.action$/, '').replace(/\.offline$/, '');

                                if (data.name !== `iobroker.${adapterName}` && data.name !== adapterName) {
                                    this.log.error(
                                        `License is for other adapter "${data.name}". Expected "iobroker.${adapterName}"`,
                                    );
                                    resolve(true);
                                } else if (uuid.length !== 36 && uuid.substring(0, 2) !== 'IO') {
                                    try {
                                        const decoded: {
                                            name: string;
                                            version: string;
                                            expires: number;
                                            // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
                                            invoice: 'free' | string;
                                            // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
                                            type: 'commercial' | string;
                                            uuid: string;
                                        } = verify(license, cert, { algorithms: ['RS256'] }) as {
                                            name: string;
                                            version: string;
                                            expires: number;
                                            // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
                                            invoice: 'free' | string;
                                            // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
                                            type: 'commercial' | string;
                                            uuid: string;
                                        };
                                        if (!decoded || decoded.invoice === 'free') {
                                            this.log.error('Cannot use free license with commercial device!');
                                            resolve(true);
                                        } else {
                                            resolve(false);
                                        }
                                    } catch (err) {
                                        this.log.error(`Cannot check license: ${err}`);
                                        resolve(true);
                                    }
                                } else {
                                    this.log.info('vis-2 license is OK.');
                                    resolve(false);
                                }
                            } else {
                                this.log.error(
                                    `License is invalid! Nothing updated. Error: ${data ? data.error || data.result : 'unknown'}`,
                                );
                                resolve(true);
                            }
                        } catch (err: unknown) {
                            this.log.warn(`License is invalid 2. Error: ${err as Error}`);
                            reject(err instanceof Error ? err : new Error(String(err)));
                        }
                    });

                    res.on('error', err => {
                        this.log.warn(`License is invalid. Error: ${err}`);
                        reject(err);
                    });
                })
                .on('error', err => {
                    this.log.warn(`License is invalid 1. Error: ${err}`);
                    reject(err);
                })
                .on('timeout', () => {
                    this.log.warn('License check timed out after 10s');
                    postReq.destroy(new Error('license check timeout'));
                });

            postReq.write(data);
            postReq.end();
        });
    }

    /**
     * Collect Files of an adapter-specific directory from the iobroker storage
     *
     * @param adapterPath path in the adapter-specific storage space
     * @param _result result as string
     */
    async collectExistingFilesToDelete(adapterPath: string, _result?: string[]): Promise<string[]> {
        _result ||= [];
        let files: ioBroker.ReadDirResult[];

        if (this.stoppingPromise) {
            return _result;
        }

        try {
            this.log.debug(`Scanning ${adapterPath}`);
            files = await this.readDirAsync('vis-2', adapterPath);
        } catch {
            // ignore err
            files = [];
        }

        if (files?.length) {
            for (const file of files) {
                if (file.file === '.' || file.file === '..') {
                    continue;
                }
                const newPath: string = adapterPath + file.file;
                if (file.isDir) {
                    try {
                        const filesToDelete = await this.collectExistingFilesToDelete(`${newPath}/`);
                        _result = _result.concat(filesToDelete);
                    } catch (err) {
                        this.log.warn(`Cannot delete folder "${adapterPath}${newPath}/": ${err.message}`);
                    }
                } else if (!_result.includes(newPath)) {
                    _result.push(newPath);
                }
            }
        }

        return _result;
    }

    async eraseFiles(files: string[]): Promise<void> {
        if (files?.length) {
            const uploadID = 'system.adapter.vis-2.upload';

            await this.setForeignStateAsync(uploadID, 1, true);

            for (let f = 0; f < files.length; f++) {
                const file = files[f];
                if (file === '/index.html' || file === '/edit.html') {
                    continue;
                }
                if (this.stoppingPromise) {
                    return;
                }
                const now = Date.now();
                if (!this.lastProgressUpdate || now - this.lastProgressUpdate > 1000) {
                    this.lastProgressUpdate = now;
                    await this.setForeignStateAsync(
                        uploadID,
                        // upload starts from 0% and runs to 50% and round to 10th
                        Math.round((100 * (10 / 2) * f) / files.length) / 10,
                        true,
                    );
                }
                try {
                    await this.unlinkAsync('vis-2', file);
                } catch (err) {
                    this.log.error(`Cannot delete file "${file}": ${err}`);
                }
            }
            await this.setForeignStateAsync(uploadID, 50, true);
        }
    }

    async upload(files: string[]): Promise<void> {
        const uploadID = 'system.adapter.vis-2.upload';

        if (files.length) {
            await this.setForeignStateAsync(uploadID, 50, true);
        }

        const wwwLen = `${wwwDir}/`.length;

        for (let f = 0; f < files.length; f++) {
            const file = files[f];

            if (this.stoppingPromise) {
                return;
            }

            const attName = file.substring(wwwLen).replace(/\\/g, '/');
            if (attName === 'index.html' || attName === 'edit.html') {
                continue;
            }
            // write upload status into log
            if (files.length - f > 100) {
                (!f || !((files.length - f - 1) % 50)) &&
                    this.log.debug(`upload [${files.length - f - 1}] ${file.substring(wwwLen)} ${attName}`);
            } else if (files.length - f - 1 > 20) {
                (!f || !((files.length - f - 1) % 10)) &&
                    this.log.debug(`upload [${files.length - f - 1}] ${file.substring(wwwLen)} ${attName}`);
            } else {
                this.log.debug(`upload [${files.length - f - 1}] ${file.substring(wwwLen)} ${attName}`);
            }

            // Update upload indicator
            const now = Date.now();
            if (!this.lastProgressUpdate || now - this.lastProgressUpdate > 2000) {
                this.lastProgressUpdate = now;
                await this.setForeignStateAsync(
                    uploadID,
                    // upload starts from 50% and runs to 100%
                    50 + Math.round((100 * (10 / 2) * f) / files.length) / 10,
                    true,
                );
            }

            try {
                const data = readFileSync(file);
                await this.writeFileAsync('vis-2', attName, data);
            } catch (e) {
                this.log.error(`Error: Cannot upload ${file}: ${e.message}`);
            }
        }

        // Set upload progress to 0;
        if (files.length) {
            await this.setForeignStateAsync(uploadID, 0, true);
        }
    }

    // Read synchronous all files recursively from local directory
    walk(dir: string, _results?: string[]): string[] {
        const results = _results || [];

        if (this.stoppingPromise) {
            return results;
        }

        try {
            if (existsSync(dir)) {
                const list = readdirSync(dir);
                list.map(file => {
                    const stat = statSync(`${dir}/${file}`);
                    if (stat.isDirectory()) {
                        this.walk(`${dir}/${file}`, results);
                    } else {
                        if (
                            !file.endsWith('.npmignore') &&
                            !file.endsWith('.gitignore') &&
                            !file.endsWith('.DS_Store') &&
                            !file.endsWith('_socket/info.js')
                        ) {
                            results.push(`${dir}/${file}`);
                        }
                    }
                });
            }
        } catch (err) {
            console.error(err);
        }

        return results;
    }

    /**
     * Upload given adapter
     */
    async uploadAdapter(): Promise<void> {
        if (!existsSync(wwwDir)) {
            return;
        }

        // Create "upload progress" object if not exists
        let obj;
        const _id = 'system.adapter.vis-2.upload' as string;
        try {
            obj = await this.getForeignObjectAsync(_id);
        } catch {
            // ignore
        }
        if (!obj) {
            await this.setForeignObject(_id, {
                _id,
                type: 'state',
                common: {
                    name: 'vis-2.upload',
                    type: 'number',
                    role: 'indicator.state',
                    unit: '%',
                    min: 0,
                    max: 100,
                    def: 0,
                    desc: 'Upload process indicator',
                    read: true,
                    write: false,
                },
                native: {},
            } as ioBroker.StateObject);
        }

        await this.setForeignStateAsync(`system.adapter.vis-2.upload`, 0, true);

        let result;
        try {
            result = await this.getForeignObjectAsync('vis-2');
        } catch {
            // ignore
        }
        // Read all names with subtrees from the local directory
        const files = this.walk(wwwDir);
        if (!result) {
            await this.setForeignObject('vis-2', {
                _id: 'vis-2',
                type: 'meta',
                common: {
                    name: 'vis-2',
                    type: 'meta.folder',
                },
                native: {},
            });
        }

        const filesToDelete = await this.collectExistingFilesToDelete('/');
        this.log.debug(`Erasing files: ${filesToDelete.length}`);

        if (this.stoppingPromise) {
            return;
        }

        // write temp index.html and edit.html
        await this.writeFileAsync(
            'vis-2',
            'index.html',
            readFileSync(`${__dirname}/lib/updating.html`).toString('utf8'),
        );
        await this.writeFileAsync(
            'vis-2',
            'edit.html',
            readFileSync(`${__dirname}/lib/updating.html`).toString('utf8'),
        );

        // delete old files, before upload of new
        await this.eraseFiles(filesToDelete);
        await this.upload(files);

        if (this.stoppingPromise) {
            return;
        }

        // restore normal files
        await this.writeFileAsync('vis-2', 'index.html', readFileSync(`${wwwDir}/index.html`).toString('utf8'));
        await this.writeFileAsync('vis-2', 'edit.html', readFileSync(`${wwwDir}/edit.html`).toString('utf8'));
    }

    async copyFolder(sourceId: string, sourcePath: string, targetId: string, targetPath: string): Promise<void> {
        let files;
        try {
            files = await this.readDirAsync(sourceId, sourcePath);
        } catch {
            return;
        }

        for (let f = 0; f < files.length; f++) {
            if (files[f].isDir) {
                await this.copyFolder(
                    sourceId,
                    `${sourcePath}/${files[f].file}`,
                    targetId,
                    `${targetPath}/${files[f].file}`,
                );
            } else {
                const data = await this.readFileAsync(sourceId, `${sourcePath}/${files[f].file}`);
                await this.writeFileAsync(targetId, `${targetPath}/${files[f].file}`, data.file);
            }
        }
    }

    async checkL(license: string, useLicenseManager: boolean, name: string): Promise<boolean> {
        if (name === 'vis-2') {
            name = 'vis';
        }
        const uuidObj = await this.getForeignObjectAsync('system.meta.uuid');
        if (!uuidObj?.native?.uuid) {
            this.log.error('UUID not found!');
            return false;
        }
        if (useLicenseManager) {
            const result: { json: string; usedBy: string; invoice: string }[] = await this.getSuitableLicensesEx(
                true,
                name,
            );
            license = result[0]?.json;
        }

        if (!license) {
            this.log.error(`No license found for ${name}. Please get one on https://iobroker.net !`);
            return false;
        }

        license = license.trim();

        try {
            return !(await this.doLicense(license, uuidObj.native.uuid, name));
        } catch (err: unknown) {
            return !(await this.check(license, uuidObj.native.uuid, (err as Error) || null, name));
        }
    }

    async exportFormOlderVersions(): Promise<void> {
        // Check if first start of vis-2
        let files: ioBroker.ReadDirResult[] | undefined;
        try {
            files = await this.readDirAsync('vis-2.0', '');
        } catch {
            // ignore
        }

        // if no files found, try to copy from vis-2-beta.0
        if (!files?.length) {
            // if vis-2-beta installed, copy files from vis-2-beta to vis-2
            try {
                files = await this.readDirAsync('vis-2-beta.0', '');
            } catch {
                // ignore
            }

            if (files?.length) {
                // copy recursive all
                await this.copyFolder('vis-2-beta.0', '', 'vis-2.0', '');
            } else {
                // try to copy from vis.0
                try {
                    files = await this.readDirAsync('vis.0', '');
                } catch {
                    // ignore
                }
                if (files?.length) {
                    // copy recursive all
                    await this.copyFolder('vis.0', '', 'vis-2.0', '');
                }
            }
        }
    }

    async main(): Promise<void> {
        this.visConfig = this.config as VisAdapterConfig;

        const visObj = await this.getForeignObjectAsync('vis-2');
        await this.setForeignStateAsync('system.adapter.vis-2.upload', 0, true);

        if (!existsSync(wwwDir)) {
            this.log.error(
                'Cannot find www folder. Looks like adapter was installed from github! Please install it from npm!',
            );
            return;
        }

        // create a vis "meta" object if not exists
        if (visObj?.type !== 'meta') {
            await this.setForeignObject('vis-2', {
                type: 'meta',
                common: {
                    name: 'vis-2 core files',
                    type: 'meta.user',
                },
                native: {},
            });
        }

        // create a vis-2.0 "meta" object, if not exists
        const visObjNS = await this.getForeignObjectAsync(this.namespace);
        if (visObjNS?.type !== 'meta') {
            await this.setForeignObject(this.namespace, {
                type: 'meta',
                common: {
                    name: 'user files and images for vis-2',
                    type: 'meta.user',
                },
                native: {},
            });
        }

        // repair chart view
        const systemView = await this.getForeignObjectAsync('_design/system');
        if (systemView?.views && !systemView.views.chart) {
            systemView.views.chart = {
                map: "function(doc) { if (doc.type === 'chart') emit(doc._id, doc) }",
            };
            await this.setForeignObject(systemView._id, systemView);
        }

        // Change running mode to daemon, enable messagebox and correct the local links
        const instanceObj = await this.getForeignObjectAsync(`system.adapter.${this.namespace}`);
        if (
            instanceObj?.common &&
            (instanceObj.common.mode !== 'daemon' || // mode must be "daemon"
                !instanceObj.common.messagebox || // messagebox must be enabled
                JSON.stringify(instanceObj.common.localLinks) !== JSON.stringify(ioPack.common.localLinks))
        ) {
            instanceObj.common.mode = 'daemon';
            instanceObj.common.messagebox = true;
            instanceObj.common.localLinks = ioPack.common.localLinks;

            await this.setForeignObject(instanceObj._id, instanceObj);
            // controller will do restart
            return;
        }

        let systemConfig;
        try {
            systemConfig = await this.getForeignObjectAsync('system.config');
        } catch (e) {
            this.log.warn(`Cannot read systemConfig: ${e}`);
        }

        if (!systemConfig) {
            this.log.error('Cannot find object system.config');
        }

        let uuid: ioBroker.Object | null | undefined = null;
        try {
            uuid = await this.getForeignObjectAsync('system.meta.uuid');
        } catch (e) {
            this.log.warn(`Cannot read UUID: ${e}`);
        }
        this.vendorPrefix =
            systemConfig?.native?.vendor?.uuidPrefix ||
            (uuid?.native?.uuid?.length > 36 ? uuid?.native.uuid.substring(0, 2) : '');

        // first check license
        if (
            !this.visConfig.useLicenseManager &&
            (!this.visConfig.license || typeof this.visConfig.license !== 'string')
        ) {
            this.isLicenseError = true;
            this.log.error('No license found for vis-2. Please get one on https://iobroker.net !');
        } else {
            this.isLicenseError = !(await this.checkL(this.visConfig.license, this.visConfig.useLicenseManager, 'vis'));
        }

        await this.exportFormOlderVersions();

        await this.buildHtmlPages(this.visConfig.forceBuild);

        if (this.visConfig.forceBuild) {
            this.log.warn('Force build done! Restarting...');
            await this.extendForeignObjectAsync(`system.adapter.${this.namespace}`, {
                native: { forceBuild: false },
            });
        } else {
            this.subscribeForeignObjects('system.adapter.*');
        }
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<AdapterOptions> | undefined) => new VisAdapter(options);
} else {
    // otherwise start the instance directly
    (() => new VisAdapter())();
}
