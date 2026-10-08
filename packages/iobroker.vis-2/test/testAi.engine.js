const assert = require('node:assert');

// the helpers are pure, so they are taken from the build the way the adapter itself loads them
const {
    resolveMaxTokens,
    resolveRequestTimeout,
    resolveProviderCredentials,
    resolveTestEndpoint,
    DEFAULT_AI_MAX_TOKENS,
    MAX_AI_MAX_TOKENS,
    MAX_AI_REQUEST_TIMEOUT_MS,
} = require('../build/lib/ai/credentials.js');

describe('resolveMaxTokens', () => {
    it('answers the default where the setting says nothing usable', () => {
        [undefined, null, '', 'viele', 0, -1, NaN].forEach(value =>
            assert.strictEqual(resolveMaxTokens(value), DEFAULT_AI_MAX_TOKENS, `for ${JSON.stringify(value)}`),
        );
    });

    it('takes a number, also as the string a configuration page sends', () => {
        assert.strictEqual(resolveMaxTokens(4096), 4096);
        assert.strictEqual(resolveMaxTokens('4096'), 4096);
    });

    it('keeps the value between the floor and the ceiling', () => {
        assert.strictEqual(resolveMaxTokens(16), 1024);
        assert.strictEqual(resolveMaxTokens(1_000_000), MAX_AI_MAX_TOKENS);
    });
});

describe('resolveRequestTimeout', () => {
    it('gives a request that names no budget the ceiling', () => {
        assert.strictEqual(resolveRequestTimeout(undefined), MAX_AI_REQUEST_TIMEOUT_MS);
        // a zero is how Node spells "no timeout", which here is the ceiling and not for ever
        assert.strictEqual(resolveRequestTimeout(0), MAX_AI_REQUEST_TIMEOUT_MS);
    });

    it('keeps the budget between a second and the ceiling', () => {
        assert.strictEqual(resolveRequestTimeout(30_000), 30_000);
        assert.strictEqual(resolveRequestTimeout(10), 1000);
        assert.strictEqual(resolveRequestTimeout(9_999_999), MAX_AI_REQUEST_TIMEOUT_MS);
    });
});

describe('resolveProviderCredentials', () => {
    const config = { aiCustomUrl: 'http://127.0.0.1:11434/v1', aiOpenAiKey: 'sk-stored', aiCustomKey: 'local' };

    it('takes the endpoint of the OpenAI-compatible provider from the configuration', () => {
        assert.strictEqual(resolveProviderCredentials(config, 'custom').baseUrl, 'http://127.0.0.1:11434/v1');
        assert.strictEqual(resolveProviderCredentials(config, 'custom').apiKey, 'local');
    });

    it('gives every other provider the address of its own service', () => {
        ['openai', 'anthropic', 'gemini', 'deepseek'].forEach(provider =>
            assert.strictEqual(resolveProviderCredentials(config, provider).baseUrl, '', provider),
        );
    });

    it('reads the key of the provider that was asked for', () => {
        assert.strictEqual(resolveProviderCredentials(config, 'openai').apiKey, 'sk-stored');
        assert.strictEqual(resolveProviderCredentials(config, 'anthropic').apiKey, '');
    });
});

describe('resolveTestEndpoint', () => {
    const config = { aiCustomUrl: 'http://127.0.0.1:11434/v1' };

    it('tries the endpoint of the form together with a key of the form', () => {
        const url = resolveTestEndpoint(config, 'custom', { apiKey: 'typed', baseUrl: 'http://192.168.1.9:8080/v1' });
        assert.strictEqual(url, 'http://192.168.1.9:8080/v1');
    });

    it('keeps the saved endpoint as soon as the key comes from this system', () => {
        // no key in the form: the key would be the stored one, so the address is the stored one too
        const url = resolveTestEndpoint(config, 'custom', { baseUrl: 'http://192.168.1.9:8080/v1' });
        assert.strictEqual(url, 'http://127.0.0.1:11434/v1');
    });

    it('ignores an address for a provider that has none to try', () => {
        const url = resolveTestEndpoint(config, 'openai', { apiKey: 'typed', baseUrl: 'http://192.168.1.9:8080/v1' });
        assert.strictEqual(url, '');
    });

    it('falls back to the saved endpoint when the form brought none', () => {
        assert.strictEqual(resolveTestEndpoint(config, 'custom', { apiKey: 'typed' }), 'http://127.0.0.1:11434/v1');
    });
});
