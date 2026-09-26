/**
 * Translation between the OpenAI chat-completion format and Anthropic's Messages API.
 *
 * The editor speaks one language - the OpenAI one - to every model, because writing the agent loop
 * twice is how two loops start behaving differently. Anthropic is the one provider that does not
 * take that format, so it is translated here, on the way out and on the way back:
 *
 * | OpenAI                                            | Anthropic                                        |
 * | ------------------------------------------------- | ------------------------------------------------ |
 * | `tools[] = {type, function: {name, parameters}}`  | `tools[] = {name, input_schema}`                 |
 * | assistant message with `tool_calls[]`             | content blocks of the type `tool_use`            |
 * | `{role: 'tool', tool_call_id, content}`           | a user message with `tool_result` blocks         |
 * | `{content, tool_calls}`                           | `{content: [blocks], stop_reason}`               |
 *
 * Everything here is a pure function of its arguments, which is what makes it testable without a
 * network. The same translation is in `iobroker.javascript`, where it was written first.
 */

export interface OpenAITool {
    type: 'function';
    function: {
        name: string;
        description?: string;
        parameters?: unknown;
    };
}

export interface AnthropicTool {
    name: string;
    description?: string;
    input_schema: unknown;
}

export interface OpenAIToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content?: string | null;
    tool_calls?: OpenAIToolCall[];
    tool_call_id?: string;
    name?: string;
}

type AnthropicContentBlock =
    | { type: 'text'; text: string }
    | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
    | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

export interface AnthropicMessage {
    role: 'user' | 'assistant';
    content: string | AnthropicContentBlock[];
}

export interface AnthropicResponse {
    content?: AnthropicContentBlock[];
    stop_reason?: string;
    [key: string]: unknown;
}

/**
 * The tools, as Anthropic wants them.
 *
 * @param tools - what the editor sent, in the OpenAI format
 */
export function translateToolsToAnthropic(tools: unknown[] | undefined | null): AnthropicTool[] {
    if (!Array.isArray(tools)) {
        return [];
    }
    const result: AnthropicTool[] = [];
    for (const one of tools) {
        const tool = one as OpenAITool;
        const fn = tool?.function;
        if (!fn?.name) {
            continue;
        }
        result.push({
            name: fn.name,
            description: fn.description,
            // the two share the JSON Schema shape; what differs is only the name of the field, and
            // that Anthropic wants an object schema even where there is nothing to describe
            input_schema: fn.parameters || { type: 'object', properties: {} },
        });
    }
    return result;
}

/**
 * The arguments of a tool call, which arrive as a string and are not always a valid one.
 *
 * @param args - the JSON the model wrote
 */
function safeParseArgs(args: string | undefined): Record<string, unknown> {
    if (!args) {
        return {};
    }
    try {
        const parsed: unknown = JSON.parse(args);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
        return {};
    } catch {
        return {};
    }
}

/**
 * The conversation, as Anthropic wants it.
 *
 * The system prompt comes out separately - Anthropic takes it as a field of the request rather than
 * as a message - and the results of several tool calls have to arrive as one user message, which is
 * what the pending list below is for.
 *
 * @param messages - the conversation in the OpenAI format
 */
export function translateMessagesToAnthropic(messages: OpenAIMessage[] | undefined | null): {
    system: string;
    messages: AnthropicMessage[];
} {
    if (!Array.isArray(messages)) {
        return { system: '', messages: [] };
    }

    const systemChunks: string[] = [];
    const out: AnthropicMessage[] = [];
    let pendingToolResults: AnthropicContentBlock[] = [];

    const flushToolResults = (): void => {
        if (pendingToolResults.length) {
            out.push({ role: 'user', content: pendingToolResults });
            pendingToolResults = [];
        }
    };

    for (const message of messages) {
        if (!message || typeof message !== 'object') {
            continue;
        }

        if (message.role === 'system') {
            if (typeof message.content === 'string' && message.content) {
                systemChunks.push(message.content);
            }
            continue;
        }

        if (message.role === 'tool') {
            pendingToolResults.push({
                type: 'tool_result',
                tool_use_id: message.tool_call_id || '',
                content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content ?? ''),
            });
            continue;
        }

        flushToolResults();

        if (message.role === 'assistant') {
            const blocks: AnthropicContentBlock[] = [];
            if (typeof message.content === 'string' && message.content) {
                blocks.push({ type: 'text', text: message.content });
            }
            if (Array.isArray(message.tool_calls)) {
                for (const call of message.tool_calls) {
                    if (!call?.id || !call.function?.name) {
                        continue;
                    }
                    blocks.push({
                        type: 'tool_use',
                        id: call.id,
                        name: call.function.name,
                        input: safeParseArgs(call.function.arguments),
                    });
                }
            }
            // an assistant message without content is refused by the API
            if (blocks.length) {
                out.push({ role: 'assistant', content: blocks });
            }
            continue;
        }

        if (message.role === 'user') {
            const text = typeof message.content === 'string' ? message.content : '';
            if (text) {
                out.push({ role: 'user', content: text });
            }
        }
    }

    flushToolResults();

    return { system: systemChunks.join('\n\n'), messages: out };
}

/**
 * The answer, back in the shape the editor understands.
 *
 * @param response - what Anthropic sent
 */
export function translateAnthropicResponseToOpenAI(response: AnthropicResponse | undefined | null): {
    content: string;
    tool_calls?: OpenAIToolCall[];
} {
    if (!response || !Array.isArray(response.content)) {
        return { content: '' };
    }
    const textParts: string[] = [];
    const toolCalls: OpenAIToolCall[] = [];

    for (const block of response.content) {
        if (!block || typeof block !== 'object') {
            continue;
        }
        if (block.type === 'text' && typeof (block as { text?: unknown }).text === 'string') {
            textParts.push((block as { text: string }).text);
        } else if (block.type === 'tool_use') {
            const use = block as { id?: string; name?: string; input?: unknown };
            toolCalls.push({
                id: use.id || '',
                type: 'function',
                function: { name: use.name || '', arguments: JSON.stringify(use.input ?? {}) },
            });
        }
    }

    const result: { content: string; tool_calls?: OpenAIToolCall[] } = { content: textParts.join('\n') };
    if (toolCalls.length) {
        result.tool_calls = toolCalls;
    }
    return result;
}
