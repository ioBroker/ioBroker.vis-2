/**
 * Where the key of an AI provider comes from.
 *
 * Two ways, and the editor never sees either of them: the keys are stored as `encryptedNative` in the
 * instance configuration, or the configuration only names an entry of the central credential store
 * (`system.credentials.*`) that several adapters share - somebody who has already put their key into
 * `javascript` should not have to type it a second time.
 *
 * The editor asks which providers are usable and sends the name of one with each request; the adapter
 * looks up the key. That is the whole point of the arrangement: a browser tab of the vis editor never
 * holds an API key, so a screenshot of it cannot leak one.
 */

/** The part of the instance configuration that carries the credentials */
export interface AiConfigSlice {
    aiOpenAiKey?: string;
    aiAnthropicKey?: string;
    aiGeminiKey?: string;
    aiDeepSeekKey?: string;
    /** The address of an OpenAI-compatible endpoint of one's own: a proxy, or Ollama on the same host */
    aiCustomUrl?: string;
    aiCustomKey?: string;
    /**
     * Where the keys live:
     * - `manual`: in this configuration, encrypted
     * - `manager`: only the id of an entry of the central credential store is stored here
     */
    aiCredentialType?: 'manual' | 'manager';
    aiCredentialOpenAi?: string;
    aiCredentialAnthropic?: string;
    aiCredentialGemini?: string;
    aiCredentialDeepSeek?: string;
    aiCredentialCustom?: string;
}

export type AiProvider = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'custom';

/** Which field of the configuration holds the key of each provider */
export const PROVIDER_KEY_FIELD: Record<AiProvider, keyof AiConfigSlice> = {
    openai: 'aiOpenAiKey',
    anthropic: 'aiAnthropicKey',
    gemini: 'aiGeminiKey',
    deepseek: 'aiDeepSeekKey',
    custom: 'aiCustomKey',
};

/** Which field holds the id of its entry in the central credential store */
export const PROVIDER_CREDENTIAL_FIELD: Record<AiProvider, keyof AiConfigSlice> = {
    openai: 'aiCredentialOpenAi',
    anthropic: 'aiCredentialAnthropic',
    gemini: 'aiCredentialGemini',
    deepseek: 'aiCredentialDeepSeek',
    custom: 'aiCredentialCustom',
};

/**
 * The id of the credential of a provider, like `system.credentials.anthropic`.
 *
 * @param config - the instance configuration
 * @param provider - which provider is wanted
 */
export function getProviderCredentialId(config: AiConfigSlice | undefined | null, provider: string): string {
    const field = PROVIDER_CREDENTIAL_FIELD[provider as AiProvider];
    return field ? ((config || {})[field] || '').toString().trim() : '';
}

/**
 * The key and the address of a provider, out of the configuration itself.
 *
 * The address belongs to the endpoint of one's own and to no other provider. Letting `openai` inherit
 * it is what sent requests meant for `api.openai.com` - and the OpenAI key with them - to whatever
 * host somebody had entered for their local model; `javascript` had exactly that bug. An address that
 * arrives with the request still wins, which is the way to put a proxy in front of OpenAI.
 *
 * @param config - the instance configuration
 * @param provider - which provider is wanted
 * @param messageUrl - an address that came with the request
 */
export function resolveProviderCredentials(
    config: AiConfigSlice | undefined | null,
    provider: string,
    messageUrl?: string,
): { apiKey: string; baseUrl: string } {
    const cfg = config || {};
    const keyField = PROVIDER_KEY_FIELD[provider as AiProvider];
    const apiKey = keyField ? (cfg[keyField] || '').toString().trim() : '';

    let baseUrl = '';
    if (provider === 'custom') {
        baseUrl = (messageUrl || cfg.aiCustomUrl || '').toString().trim();
    } else if (provider === 'openai') {
        baseUrl = (messageUrl || '').toString().trim();
    }

    return { apiKey, baseUrl };
}

/** The longest an AI request may take, and what it gets when the caller says nothing */
export const MAX_AI_REQUEST_TIMEOUT_MS = 600_000;

/**
 * How long to wait for an answer.
 *
 * A reasoning model takes its time, so the ceiling is generous; a caller that knows it is in a hurry
 * says so. A zero - which is how Node spells "no timeout" - gets the ceiling rather than for ever.
 *
 * @param messageTimeout - what the request asked for, in milliseconds
 */
export function resolveRequestTimeout(messageTimeout?: unknown): number {
    const requested = parseInt(messageTimeout as string, 10);
    if (isNaN(requested) || requested <= 0) {
        return MAX_AI_REQUEST_TIMEOUT_MS;
    }
    // a second is the floor: below that not even a model on the same host gets a chance
    return Math.min(Math.max(requested, 1000), MAX_AI_REQUEST_TIMEOUT_MS);
}

/**
 * The providers that can be used, for the editor to offer.
 *
 * A provider counts as usable when it has a key - or, in the other mode, the id of a credential. The
 * endpoint of one's own is named by its address instead, because a model on the same host often wants
 * no key at all.
 *
 * @param config - the instance configuration
 */
export function listAvailableProviders(
    config: AiConfigSlice | undefined | null,
): { provider: AiProvider; baseUrl?: string }[] {
    const cfg = config || {};
    const manager = cfg.aiCredentialType === 'manager';
    const providers: { provider: AiProvider; baseUrl?: string }[] = [];

    const has = (provider: AiProvider): boolean =>
        manager
            ? !!getProviderCredentialId(cfg, provider)
            : !!(cfg[PROVIDER_KEY_FIELD[provider]] || '').toString().trim();

    (['openai', 'anthropic', 'gemini', 'deepseek'] as const).forEach(provider => {
        if (has(provider)) {
            providers.push({ provider });
        }
    });

    if ((cfg.aiCustomUrl || '').trim()) {
        providers.push({ provider: 'custom', baseUrl: cfg.aiCustomUrl });
    }

    return providers;
}
