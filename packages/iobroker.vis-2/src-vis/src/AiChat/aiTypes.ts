/**
 * What goes back and forth between the editor, the adapter and a model.
 *
 * One format for every provider - the OpenAI chat-completion one - because an agent loop written
 * twice is an agent loop that starts behaving differently in one of its halves. The adapter
 * translates for the one provider that speaks something else, see `lib/ai/anthropic.ts`.
 */

export type AiProvider = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'custom';

/** A call the model wants made */
export interface AiToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        /** The arguments as JSON, which a model does not always get right */
        arguments: string;
    };
}

/** One turn of the conversation, as the model sees it */
export interface AiApiMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content?: string | null;
    tool_calls?: AiToolCall[];
    tool_call_id?: string;
    name?: string;
}

/** One turn of the conversation, as the panel shows it */
export interface AiChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'error';
    content: string;
    /** What the assistant did in this turn, in a line each: `Seite Küche angelegt` */
    actions?: string[];
    /** It is still being written */
    pending?: boolean;
}

/** A tool, as the model is told about it */
export interface AiToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, unknown>;
            required?: string[];
        };
    };
}

/** What the adapter answers to `aiChat` */
export interface AiAnswer {
    content?: string;
    tool_calls?: AiToolCall[];
    error?: string;
}
