/**
 * The options of the settings `selectSendTo` and `autocompleteSendTo`: vis-2 asks an instance of the adapter for
 * them, as JSON-Config does. Which instance, which command and which message `getSendToRequest` of
 * `@iobroker/web-components` says; here is how vis-2 asks and what it makes of the answer.
 *
 * Pure functions only, so they can be tested without a browser; the field is `WebComponentSendToField`.
 */
import {
    getText,
    toSendToOptions,
    type WebComponentSendToRequest,
    type WebComponentSettingOption,
} from '@iobroker/web-components';

/** How long vis-2 waits for the answer of the instance, in ms; then the field is a text field */
export const SEND_TO_TIMEOUT = 10_000;

/** How long a changed request waits before it is sent, in ms - so typing into a setting asks once, not per key */
export const SEND_TO_DEBOUNCE = 300;

/** What the instance answered for one request */
export interface SendToAnswer {
    /** `key` of the request it answers */
    key: string;
    /** The options; null if there was no answer, an error, or something that is no list */
    options: WebComponentSettingOption[] | null;
}

/** The part of the socket that is needed */
export type SendToFunction = (instance: string, command: string, data: unknown) => Promise<unknown>;

/** A socket that can ask an instance */
export interface SendToSocket {
    sendTo: SendToFunction;
}

/**
 * A value as the text vis-2 stores; anything that is no plain value is no text
 *
 * @param value the value
 */
export function toSendToText(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';
}

/**
 * Asks the instance for the options. A timeout, an error, or an answer that is no list give `options: null`, so
 * that the field falls back to a text field - it never throws.
 *
 * @param request from `getSendToRequest`
 * @param sendTo `sendTo` of the socket
 * @param timeout how long to wait, in ms
 */
export async function askSendToOptions(
    request: WebComponentSendToRequest,
    sendTo: SendToFunction,
    timeout: number = SEND_TO_TIMEOUT,
): Promise<SendToAnswer> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        const answer = await Promise.race([
            sendTo(request.instance, request.command, request.data),
            new Promise<never>((_resolve, reject) => {
                timer = setTimeout(() => reject(new Error('timeout')), timeout);
            }),
        ]);
        return { key: request.key, options: Array.isArray(answer) ? toSendToOptions(answer) : null };
    } catch {
        return { key: request.key, options: null };
    } finally {
        if (timer) {
            clearTimeout(timer);
        }
    }
}

/**
 * The options an `autocompleteSendTo` offers: those of the instance, then the `options` of the manifest that the
 * instance did not name already
 *
 * @param answer the options of the instance
 * @param fixed `options` of the setting
 */
export function mergeSendToOptions(
    answer: WebComponentSettingOption[],
    fixed: WebComponentSettingOption[] | undefined,
): WebComponentSettingOption[] {
    const seen = new Set(answer.map(option => String(option.value)));
    return [...answer, ...(fixed || []).filter(option => !seen.has(String(option.value)))];
}

/**
 * The option of a value, if there is one
 *
 * @param options the options offered
 * @param value the value as vis-2 holds it - a text
 */
export function findSendToOption(
    options: WebComponentSettingOption[],
    value: unknown,
): WebComponentSettingOption | undefined {
    const text = toSendToText(value);
    return text ? options.find(option => String(option.value) === text) : undefined;
}

/**
 * The value stored for a text typed into an `autocompleteSendTo`: the value of the option this text is the label
 * of, else the text itself - also without `freeSolo`, so nothing typed is lost; the field marks it instead.
 *
 * @param text what is in the field
 * @param options the options offered
 * @param lang the language of the labels
 */
export function autocompleteValue(
    text: string,
    options: WebComponentSettingOption[],
    lang: ioBroker.Languages,
): string {
    const byLabel = options.find(option => getText(option.label, lang) === text);
    return byLabel ? String(byLabel.value) : text;
}
