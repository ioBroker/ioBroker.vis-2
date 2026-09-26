import { useCallback, useEffect, useRef, useState } from 'react';

import { I18n, type Connection } from '@iobroker/gui-components';

import type { AnyWidgetId, Project } from '@iobroker/types-vis-2';

import { AI_TOOLS, projectCopy, runTool, type AiToolContext } from './aiTools';
import { ask, getModels, getProviders, preferredModel, rememberModel } from './aiService';
import { systemPrompt } from './aiPrompt';
import type { AiApiMessage, AiChatMessage, AiProvider } from './aiTypes';

/**
 * The agent loop.
 *
 * It is one loop and it is small: say everything to the model, get back either an answer or a list of
 * calls, run the calls, hand the results back, repeat. What makes it an assistant rather than a chat
 * is the tools in `aiTools.ts`; what makes it safe to use is the two rules below.
 *
 * First, a turn works on one copy of the project and stores it once at the end. A page with twelve
 * widgets is then one step of the undo, and a turn that goes wrong is undone with one keystroke.
 *
 * Second, the loop is bounded. A model that keeps calling tools without ever answering would
 * otherwise run until the tab is closed - and it would spend real money doing it.
 */

/** How many times the model may call tools before it has to say something */
const MAX_ROUNDS = 12;

export interface UseAiChatOptions {
    socket: Connection;
    /** The vis-2 instance to send to, like `vis-2.0` */
    instance: string;
    /** The view the user is looking at */
    selectedView: string;
    changeProject: (project: Project) => Promise<void>;
    openView: (view: string) => void;
    selectWidgets: (view: string, widgets: AnyWidgetId[]) => void;
}

export interface UseAiChat {
    messages: AiChatMessage[];
    /** The model is thinking or a tool is running */
    busy: boolean;
    /** Why there is nothing to talk to: no key at all, or an adapter that does not know the question */
    problem: '' | 'unconfigured' | 'unreachable';
    provider: AiProvider | '';
    providers: AiProvider[];
    setProvider: (provider: AiProvider) => void;
    model: string;
    models: string[];
    /** What the provider said instead of a list of models */
    modelsError: string;
    setModel: (model: string) => void;
    send: (text: string) => void;
    clear: () => void;
    /** Stop after the call that is running */
    stop: () => void;
}

let counter = 0;
const nextId = (): string => `m${Date.now()}_${++counter}`;

export function useAiChat(options: UseAiChatOptions): UseAiChat {
    const { socket, instance } = options;

    const [messages, setMessages] = useState<AiChatMessage[]>([]);
    const [busy, setBusy] = useState(false);
    const [providers, setProviders] = useState<AiProvider[]>([]);
    const [provider, setProviderState] = useState<AiProvider | ''>('');
    const [models, setModels] = useState<string[]>([]);
    const [model, setModelState] = useState('');
    const [modelsError, setModelsError] = useState('');
    const [problem, setProblem] = useState<'' | 'unconfigured' | 'unreachable'>('');

    /** The conversation as the model sees it; the panel shows something shorter */
    const history = useRef<AiApiMessage[]>([]);
    const cancelled = useRef(false);
    /** What the editor is looking at, without the loop having to be rebuilt when it changes */
    const latest = useRef(options);
    latest.current = options;

    // which providers have a key, and what the first of them can do
    useEffect(() => {
        let dropped = false;
        void (async () => {
            const available = await getProviders(socket, instance);
            if (dropped) {
                return;
            }
            if (!available) {
                setProblem('unreachable');
                return;
            }
            if (!available.length) {
                setProblem('unconfigured');
                return;
            }
            const names = available.map(one => one.provider);
            setProviders(names);
            setProviderState(names[0]);
        })();
        return () => {
            dropped = true;
        };
    }, [socket, instance]);

    // the models of the chosen provider
    useEffect(() => {
        if (!provider) {
            return;
        }
        let dropped = false;
        void (async () => {
            const answer = await getModels(socket, instance, provider);
            if (dropped) {
                return;
            }
            setModels(answer.models);
            setModelState(preferredModel(answer.models, provider));
            setModelsError(
                answer.error ? (answer.error === 'timeout' ? I18n.t('vis_ai_no_answer') : answer.error) : '',
            );
        })();
        return () => {
            dropped = true;
        };
    }, [socket, instance, provider]);

    const setModel = useCallback((next: string): void => {
        setModelState(next);
        rememberModel(next);
    }, []);

    const clear = useCallback((): void => {
        history.current = [];
        setMessages([]);
    }, []);

    const stop = useCallback((): void => {
        cancelled.current = true;
    }, []);

    const send = useCallback(
        (text: string): void => {
            if (!text.trim() || !model || !provider) {
                return;
            }
            cancelled.current = false;
            setBusy(true);

            const userMessage: AiChatMessage = { id: nextId(), role: 'user', content: text };
            const answerId = nextId();
            setMessages(current => [
                ...current,
                userMessage,
                { id: answerId, role: 'assistant', content: '', pending: true, actions: [] },
            ]);

            void (async () => {
                // the whole conversation goes along every time: a model has no memory of its own
                if (!history.current.length) {
                    history.current.push({ role: 'system', content: systemPrompt(latest.current.selectedView) });
                }
                history.current.push({ role: 'user', content: text });

                /*
                 * One copy of the project for the whole turn. Every tool changes this one, and it is
                 * stored once at the end - so twelve widgets are one step of the undo, and nothing is
                 * saved at all if the model changed nothing.
                 */
                const project = projectCopy();
                let touched = false;
                const actions: string[] = [];

                const context: AiToolContext = {
                    socket,
                    project,
                    changed: () => {
                        touched = true;
                    },
                    openView: view => latest.current.openView(view),
                    select: (view, widgets) => latest.current.selectWidgets(view, widgets),
                    selectedView: latest.current.selectedView,
                };

                let finalText = '';
                let failure = '';

                for (let round = 0; round < MAX_ROUNDS; round++) {
                    if (cancelled.current) {
                        failure = I18n.t('vis_ai_stopped');
                        break;
                    }

                    const answer = await ask(socket, instance, {
                        provider: provider,
                        model,
                        messages: history.current,
                        tools: AI_TOOLS,
                    });

                    if (answer.error) {
                        failure = answer.error;
                        break;
                    }

                    // the answer goes into the history as it was, tool calls and all
                    history.current.push({
                        role: 'assistant',
                        content: answer.content || '',
                        ...(answer.tool_calls?.length ? { tool_calls: answer.tool_calls } : {}),
                    });

                    if (!answer.tool_calls?.length) {
                        finalText = answer.content || '';
                        break;
                    }

                    for (const call of answer.tool_calls) {
                        let args: Record<string, unknown> = {};
                        try {
                            args = JSON.parse(call.function.arguments || '{}');
                        } catch {
                            // a model that writes broken JSON is told so rather than left guessing
                            history.current.push({
                                role: 'tool',
                                tool_call_id: call.id,
                                content: 'The arguments were not valid JSON',
                            });
                            continue;
                        }

                        let result;
                        try {
                            result = await runTool(call.function.name, args, context);
                        } catch (e) {
                            result = { content: `The tool failed: ${e instanceof Error ? e.message : String(e)}` };
                        }

                        history.current.push({ role: 'tool', tool_call_id: call.id, content: result.content });

                        if (result.action) {
                            actions.push(result.action);
                            // the user watches the page being built rather than waiting for the answer
                            setMessages(current =>
                                current.map(one => (one.id === answerId ? { ...one, actions: [...actions] } : one)),
                            );
                        }
                    }

                    if (round === MAX_ROUNDS - 1) {
                        failure = I18n.t('vis_ai_too_many_steps');
                    }
                }

                // what was built is stored once, whatever the model said afterwards
                if (touched) {
                    await latest.current.changeProject(project);
                }

                setMessages(current =>
                    current.map(one =>
                        one.id === answerId
                            ? {
                                  ...one,
                                  role: failure ? 'error' : 'assistant',
                                  content: failure || finalText || I18n.t('vis_ai_done'),
                                  actions: [...actions],
                                  pending: false,
                              }
                            : one,
                    ),
                );
                setBusy(false);
            })();
        },
        [socket, instance, provider, model],
    );

    return {
        messages,
        busy,
        problem,
        provider,
        providers,
        setProvider: setProviderState,
        model,
        models,
        modelsError,
        setModel,
        send,
        clear,
        stop,
    };
}
