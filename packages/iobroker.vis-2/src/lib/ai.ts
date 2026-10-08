import type { AiNativeFields } from '@iobroker/ai-core';

/**
 * The settings of the AI assistant in the instance configuration.
 *
 * Either the keys stand here, encrypted, or the configuration only names an entry of the central
 * credential store (`system.credentials.*`) that several adapters share. Everything else - talking to
 * the providers, reading the keys, pushing the answers to the editor - is `@iobroker/ai-core`.
 */
export interface AiConfigSlice {
    /** The most a model may write in one answer */
    aiMaxTokens?: number;
    aiOpenAiKey?: string;
    aiAnthropicKey?: string;
    aiGeminiKey?: string;
    aiDeepSeekKey?: string;
    /** The address of an OpenAI-compatible endpoint of one's own: a proxy, or Ollama on the same host */
    aiCustomUrl?: string;
    aiCustomKey?: string;
    /** `manual`: the keys stand in this configuration; `manager`: only ids of the credential store */
    aiCredentialType?: 'manual' | 'manager';
    aiCredentialOpenAi?: string;
    aiCredentialAnthropic?: string;
    aiCredentialGemini?: string;
    aiCredentialDeepSeek?: string;
    aiCredentialCustom?: string;
}

/** What the fields above are called, for `readAiSettings` */
export const VIS_AI_FIELDS: AiNativeFields = {
    credentialType: 'aiCredentialType',
    keys: {
        openai: 'aiOpenAiKey',
        anthropic: 'aiAnthropicKey',
        gemini: 'aiGeminiKey',
        deepseek: 'aiDeepSeekKey',
        custom: 'aiCustomKey',
    },
    credentialIds: {
        openai: 'aiCredentialOpenAi',
        anthropic: 'aiCredentialAnthropic',
        gemini: 'aiCredentialGemini',
        deepseek: 'aiCredentialDeepSeek',
        custom: 'aiCredentialCustom',
    },
    customBaseUrl: 'aiCustomUrl',
    maxTokens: 'aiMaxTokens',
};
