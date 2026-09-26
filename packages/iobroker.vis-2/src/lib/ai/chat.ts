import {
    translateAnthropicResponseToOpenAI,
    translateMessagesToAnthropic,
    translateToolsToAnthropic,
    type OpenAIMessage,
    type OpenAIToolCall,
} from './anthropic';
import type { AiProvider } from './credentials';

/**
 * The request to a model, and the answer back.
 *
 * Every provider here but one speaks the OpenAI chat-completion protocol, so there is one request
 * shape and one answer shape; Anthropic is translated on both ways in `anthropic.ts`. What the
 * adapter adds is the key - the editor sends the name of a provider and never a credential.
 */

/** Where each provider listens, where that is not the caller's business */
const ENDPOINTS: Record<Exclude<AiProvider, 'custom' | 'openai'>, string> = {
    anthropic: 'https://api.anthropic.com/v1/messages',
    gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    deepseek: 'https://api.deepseek.com/chat/completions',
};

/** Where the list of models of each provider is */
const MODEL_ENDPOINTS: Record<Exclude<AiProvider, 'custom' | 'openai'>, string> = {
    anthropic: 'https://api.anthropic.com/v1/models',
    gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/models',
    deepseek: 'https://api.deepseek.com/models',
};

/** The most a model may write in one answer; a page full of widgets is a few thousand tokens of tools */
const MAX_TOKENS = 8192;

export interface ChatRequest {
    provider: AiProvider;
    model: string;
    messages: OpenAIMessage[];
    tools?: unknown[];
    apiKey: string;
    baseUrl: string;
    timeout: number;
}

export interface ChatAnswer {
    content?: string;
    tool_calls?: OpenAIToolCall[];
    error?: string;
}

/**
 * What went wrong, out of whatever the endpoint sent back.
 *
 * Providers disagree about where they put the reason, and a local model may put it nowhere at all;
 * the status is the one thing that is always there.
 *
 * @param status - the HTTP status
 * @param body - the body of the answer, as text
 */
function errorOf(status: number, body: string): string {
    try {
        const parsed = JSON.parse(body);
        const message = parsed?.error?.message || parsed?.message || parsed?.error;
        if (typeof message === 'string' && message) {
            return `${message} (${status})`;
        }
    } catch {
        // not JSON, so the text itself is what there is
    }
    return `${body.substring(0, 200) || 'Request failed'} (${status})`;
}

/**
 * Ask a model.
 *
 * @param request - which model, what to say to it, and the key to say it with
 */
export async function chatCompletion(request: ChatRequest): Promise<ChatAnswer> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let url: string;
    let body: Record<string, unknown>;

    if (request.provider === 'anthropic') {
        url = ENDPOINTS.anthropic;
        headers['x-api-key'] = request.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        const { system, messages } = translateMessagesToAnthropic(request.messages);
        const tools = request.tools?.length ? translateToolsToAnthropic(request.tools) : [];
        body = {
            model: request.model,
            max_tokens: MAX_TOKENS,
            stream: false,
            ...(system ? { system } : {}),
            messages,
            ...(tools.length ? { tools } : {}),
        };
    } else {
        url =
            request.provider === 'gemini' || request.provider === 'deepseek'
                ? ENDPOINTS[request.provider]
                : `${request.baseUrl || 'https://api.openai.com/v1'}/chat/completions`;
        if (request.apiKey) {
            headers.Authorization = `Bearer ${request.apiKey}`;
        }
        body = {
            model: request.model,
            messages: request.messages,
            stream: false,
            ...(request.tools?.length ? { tools: request.tools } : {}),
        };
    }

    let response: Response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(request.timeout),
        });
    } catch (e) {
        const error = e as Error;
        // a timeout arrives as an abort, which says nothing to anyone reading the message
        return { error: error.name === 'TimeoutError' ? 'The model did not answer in time' : error.message };
    }

    const text = await response.text();
    if (!response.ok) {
        return { error: errorOf(response.status, text) };
    }

    let parsed: any;
    try {
        parsed = JSON.parse(text);
    } catch {
        return { error: 'The answer of the model was not JSON' };
    }

    if (request.provider === 'anthropic') {
        const translated = translateAnthropicResponseToOpenAI(parsed);
        if (!translated.content && !translated.tool_calls?.length) {
            return { error: 'The model answered with nothing' };
        }
        return translated;
    }

    const message = parsed?.choices?.[0]?.message;
    const content: string = message?.content || '';
    const toolCalls: OpenAIToolCall[] | undefined = message?.tool_calls;
    if (!content && !toolCalls?.length) {
        return { error: 'The model answered with nothing' };
    }

    return { content, ...(toolCalls?.length ? { tool_calls: toolCalls } : {}) };
}

/**
 * Which models a provider offers.
 *
 * It is also the test of a key: a provider that answers this with a list has accepted the key, and
 * one that does not says why.
 *
 * @param provider - whose models are wanted
 * @param apiKey - the key to ask with
 * @param baseUrl - the address, for an endpoint of one's own
 */
export async function listModels(
    provider: AiProvider,
    apiKey: string,
    baseUrl: string,
): Promise<{ models?: string[]; error?: string }> {
    const headers: Record<string, string> = {};
    let url: string;

    if (provider === 'anthropic') {
        url = MODEL_ENDPOINTS.anthropic;
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
    } else {
        url =
            provider === 'gemini' || provider === 'deepseek'
                ? MODEL_ENDPOINTS[provider]
                : `${baseUrl || 'https://api.openai.com/v1'}/models`;
        if (apiKey) {
            headers.Authorization = `Bearer ${apiKey}`;
        }
    }

    let response: Response;
    try {
        response = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
    } catch (e) {
        const error = e as Error;
        return { error: error.name === 'TimeoutError' ? 'The provider did not answer in time' : error.message };
    }

    const text = await response.text();
    if (!response.ok) {
        return { error: errorOf(response.status, text) };
    }

    try {
        const parsed = JSON.parse(text);
        // OpenAI and everything that copies it answer with `data`, Anthropic likewise; the id is the
        // name one puts into a request, and a `models/` in front of it is Gemini's own habit
        const list: { id?: string; name?: string }[] = parsed?.data || parsed?.models || [];
        const models = list
            .map(one => (one.id || one.name || '').replace(/^models\//, ''))
            .filter(name => name)
            .sort();
        return { models };
    } catch {
        return { error: 'The list of models was not JSON' };
    }
}
