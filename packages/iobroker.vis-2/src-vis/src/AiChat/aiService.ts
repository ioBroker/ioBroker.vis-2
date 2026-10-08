import type { Connection } from '@iobroker/gui-components';

import type { AiAnswer, AiApiMessage, AiProvider, AiToolDefinition } from './aiTypes';

/**
 * The way to the model: through the adapter, never straight out of the browser.
 *
 * The key of a provider stays in the instance configuration. The editor sends the name of a provider
 * and the adapter puts the key on the request - so a browser tab of the editor holds no credential,
 * and a screenshot of it cannot leak one.
 */

/** What the model list of a provider is remembered under, so the panel does not ask on every open */
const modelCache = new Map<string, string[]>();

/** Which model was used last, so the next session starts where the last one left off */
const REMEMBERED_MODEL = 'vis.ai.model';

/** How long the adapter has to answer before it counts as one that does not know the question */
const ANSWER_TIMEOUT = 8000;

/**
 * Which providers have a key, out of the instance configuration.
 *
 * `null` means that nobody answered: an adapter that does not know this command never calls back, and
 * an editor that waits for that forever shows an empty list and no reason for it. That happens to
 * everyone who updates the editor and not the adapter, so it gets an answer of its own.
 *
 * @param socket - the connection to the ioBroker server
 * @param instance - the vis-2 instance, like `vis-2.0`
 */
export async function getProviders(
    socket: Connection,
    instance: string,
): Promise<{ provider: AiProvider; baseUrl?: string }[] | null> {
    try {
        const answer = await Promise.race([
            socket.sendTo(instance, 'getAvailableAiProviders', {}),
            new Promise<null>(resolve => setTimeout(() => resolve(null), ANSWER_TIMEOUT)),
        ]);
        return answer === null ? null : answer?.providers || [];
    } catch {
        return null;
    }
}

/**
 * The models a provider offers, or why it offered none.
 *
 * The reason comes back rather than an empty list: a key that has expired, a local model that is not
 * running, a name that was mistyped - the provider says all of that, and a panel that answers it with
 * an empty dropdown and no word leaves the user to guess. It did exactly that once.
 *
 * @param socket - the connection to the ioBroker server
 * @param instance - the vis-2 instance
 * @param provider - whose models are wanted
 */
export async function getModels(
    socket: Connection,
    instance: string,
    provider: AiProvider,
): Promise<{ models: string[]; error?: string }> {
    const cached = modelCache.get(provider);
    if (cached) {
        return { models: cached };
    }
    try {
        const answer = await Promise.race([
            socket.sendTo(instance, 'aiModels', { provider }),
            new Promise<null>(resolve => setTimeout(() => resolve(null), ANSWER_TIMEOUT)),
        ]);
        if (answer === null) {
            return { models: [], error: 'timeout' };
        }
        if (answer?.error) {
            return { models: [], error: answer.error };
        }
        const models = answer?.models || [];
        if (models.length) {
            modelCache.set(provider, models);
        }
        return { models };
    } catch (e) {
        return { models: [], error: e instanceof Error ? e.message : String(e) };
    }
}

/** Forget what the providers said, for when a key has changed */
export function clearModelCache(): void {
    modelCache.clear();
}

/**
 * Which model to start with.
 *
 * @param models - what the provider offers
 * @param provider - which provider that was
 */
export function preferredModel(models: string[], provider: AiProvider): string {
    const remembered = window.localStorage.getItem(REMEMBERED_MODEL) || '';
    if (remembered && models.includes(remembered)) {
        return remembered;
    }
    /*
     * A first choice per provider, because the list is long and most of what is in it is not for this.
     * The names are matched as a beginning, so a newer version of the same family is picked up without
     * this list being touched; what is not there at all falls through to the first model of the list.
     */
    const preferred: Record<AiProvider, string[]> = {
        anthropic: ['claude-sonnet-4', 'claude-3-7-sonnet', 'claude-3-5-sonnet'],
        openai: ['gpt-5', 'gpt-4.1', 'gpt-4o'],
        gemini: ['gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro'],
        deepseek: ['deepseek-chat'],
        custom: [],
    };
    for (const wanted of preferred[provider] || []) {
        const found = models.find(model => model.startsWith(wanted));
        if (found) {
            return found;
        }
    }
    return models[0] || '';
}

/**
 * Remember a model for the next time.
 *
 * @param model - the one that was chosen
 */
export function rememberModel(model: string): void {
    if (model) {
        window.localStorage.setItem(REMEMBERED_MODEL, model);
    }
}

/*
 * Why the answer does not simply come back through the socket callback:
 *
 * A callback of `@iobroker/ws` is given up on after thirty seconds, and the web adapter lets go of a
 * `sendTo` even earlier - while a model that is handed a page of widgets and a dozen tools regularly
 * needs longer. The answer then arrived at a callback that nobody was holding any more: an empty
 * bubble, no error, and nothing in any log, because the adapter had done its job.
 *
 * So the editor subscribes to an instance message and the adapter pushes the finished answer there.
 * The callback carries nothing but the acknowledgement, well inside the thirty seconds. An adapter
 * that does not know this answers the old way, which is handled unchanged - an updated editor and an
 * adapter that is still the old one is the normal state of affairs for a while.
 */

/** The instance message a finished answer arrives under. Shared verbatim with `src/main.ts`. */
const AI_PUSH_MESSAGE_TYPE = 'aiChatAnswer';

/** How long an answer may take; the adapter has a ceiling of its own, see `resolveRequestTimeout` */
const ASK_TIMEOUT = 600_000;

interface PushChannel {
    /** The token this editor announced itself with */
    sessionToken: string;
    /** The questions that are out, by their id */
    pending: Map<string, (answer: AiAnswer) => void>;
}

let pushChannel: PushChannel | null = null;
/** So that two questions asked at once do not subscribe twice */
let pushChannelPromise: Promise<PushChannel | null> | null = null;
let requestCounter = 0;

/** Forget the channel, so the next question subscribes again: after a reconnect, or a push that failed */
export function resetAiPushChannel(): void {
    pushChannel = null;
    pushChannelPromise = null;
}

/**
 * Subscribe this editor for pushed answers, once.
 *
 * `null` comes back where the adapter does not take such a subscription - an older one, for instance.
 * The caller then asks the plain way and lives with the thirty seconds.
 *
 * @param socket - the connection to the ioBroker server
 * @param instance - the vis-2 instance
 */
async function ensurePushChannel(socket: Connection, instance: string): Promise<PushChannel | null> {
    if (pushChannel) {
        return pushChannel;
    }
    pushChannelPromise ||= (async (): Promise<PushChannel | null> => {
        const channel: PushChannel = {
            sessionToken: `vis-ai-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`,
            pending: new Map(),
        };
        try {
            /*
             * Raced against a timeout, like every other question to the adapter here: a subscription
             * goes to the instance as a `sendTo` of its own, and an adapter that knows nothing of it
             * never calls back. Waiting for that would hang the question that follows, so a silence
             * counts as a no and the answer comes back the plain way.
             */
            const result = await Promise.race([
                socket.subscribeOnInstance(
                    instance,
                    AI_PUSH_MESSAGE_TYPE,
                    { sessionToken: channel.sessionToken },
                    (data: unknown) => {
                        const answer = data as (AiAnswer & { requestId?: string }) | undefined;
                        const id = answer?.requestId;
                        const waiting = id ? channel.pending.get(id) : undefined;
                        if (id && waiting) {
                            channel.pending.delete(id);
                            waiting(answer);
                        }
                    },
                ),
                new Promise<null>(resolve => setTimeout(() => resolve(null), ANSWER_TIMEOUT)),
            ]);
            if (!result?.accepted) {
                return null;
            }
            /*
             * A reconnect gives the socket a new id, which leaves the adapter pushing at a client that
             * is not there any more. Without this the next question would sit out its whole budget
             * before anybody noticed; dropping the channel makes it subscribe again instead.
             */
            socket.registerConnectionHandler(function onConnectionChange(connected: boolean): void {
                if (!connected) {
                    socket.unregisterConnectionHandler(onConnectionChange);
                    resetAiPushChannel();
                }
            });
            pushChannel = channel;
            return channel;
        } catch {
            return null;
        } finally {
            pushChannelPromise = null;
        }
    })();
    return pushChannelPromise;
}

/**
 * Ask the model.
 *
 * @param socket - the connection to the ioBroker server
 * @param instance - the vis-2 instance
 * @param request - which model, the conversation so far, and what it may call
 * @param request.provider - which provider the model belongs to
 * @param request.model - the name of the model
 * @param request.messages - everything that has been said so far
 * @param request.tools - what the model may call
 */
export async function ask(
    socket: Connection,
    instance: string,
    request: {
        provider: AiProvider;
        model: string;
        messages: AiApiMessage[];
        tools?: AiToolDefinition[];
    },
): Promise<AiAnswer> {
    const channel = await ensurePushChannel(socket, instance);
    const requestId = channel ? `req-${++requestCounter}-${Date.now().toString(36)}` : '';

    let answer: (AiAnswer & { accepted?: boolean }) | undefined;
    try {
        answer = await socket.sendTo(instance, 'aiChat', {
            provider: request.provider,
            model: request.model,
            messages: request.messages,
            ...(request.tools?.length ? { tools: request.tools } : {}),
            timeout: ASK_TIMEOUT,
            ...(channel ? { uiSession: channel.sessionToken, requestId } : {}),
        });
    } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) };
    }

    // an adapter that does not push has answered in full already
    if (!channel || !answer?.accepted) {
        return answer || { error: 'The adapter answered with nothing' };
    }

    return new Promise<AiAnswer>(resolve => {
        const timer = setTimeout(() => {
            channel.pending.delete(requestId);
            // it took the question and never pushed - most likely the adapter was restarted in between
            resetAiPushChannel();
            resolve({ error: `No answer within ${Math.round(ASK_TIMEOUT / 1000)}s` });
        }, ASK_TIMEOUT);

        channel.pending.set(requestId, pushed => {
            clearTimeout(timer);
            resolve(pushed);
        });
    });
}
