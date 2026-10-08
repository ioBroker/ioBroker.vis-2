import React from 'react';

import { I18n, type Connection } from '@iobroker/gui-components';
import {
    AiChatPanel as AiChat,
    AiClient,
    createToolSet,
    ioBrokerReadTools,
    registerAiTranslations,
    useAiChat,
} from '@iobroker/ai-gui';

import type { AnyWidgetId, Project, VisTheme } from '@iobroker/types-vis-2';

import { projectCopy, visTools } from './aiTools';
import { systemPrompt } from './aiPrompt';

export interface AiChatPanelProps {
    socket: Connection;
    /** The vis-2 instance to send to, like `vis-2.0` */
    instance: string;
    selectedView: string;
    theme: VisTheme;
    changeProject: (project: Project) => Promise<void>;
    openView: (view: string) => void;
    selectWidgets: (view: string, widgets: AnyWidgetId[]) => void;
    onClose: () => void;
}

/** What the panel offers when there is nothing in it yet */
const EXAMPLES = ['vis_ai_example_1', 'vis_ai_example_2', 'vis_ai_example_3'];

registerAiTranslations();

/**
 * The assistant, as a column of the editor. The chat itself is `@iobroker/ai-gui`; what is vis-2 here
 * are the tools, the prompt, and that one turn works on one copy of the project.
 *
 * That copy is stored once at the end of the turn: a page with twelve widgets is one step of the undo,
 * and a turn that goes wrong is undone with one keystroke.
 *
 * @param props - the connection, the project, and what the editor lets it do
 */
export default function AiChatPanel(props: AiChatPanelProps): React.JSX.Element {
    const client = React.useMemo(
        () => new AiClient(props.socket, props.instance, { storageKey: 'vis.ai.model' }),
        [props.socket, props.instance],
    );

    /** What the editor is looking at, without the chat having to be rebuilt when it changes */
    const latest = React.useRef(props);
    React.useLayoutEffect(() => {
        latest.current = props;
    });

    const chat = useAiChat({
        client,
        systemPrompt: () => systemPrompt(latest.current.selectedView),
        beginTurn: () => {
            const project = projectCopy();
            let touched = false;
            const editor = latest.current;
            return {
                tools: createToolSet(
                    ioBrokerReadTools(editor.socket),
                    visTools({
                        socket: editor.socket,
                        project,
                        changed: () => {
                            touched = true;
                        },
                        openView: view => latest.current.openView(view),
                        select: (view, widgets) => latest.current.selectWidgets(view, widgets),
                        selectedView: editor.selectedView,
                    }),
                ),
                // what was built is stored once, whatever the model said afterwards
                end: async () => {
                    if (touched) {
                        await latest.current.changeProject(project);
                    }
                },
            };
        },
    });

    return (
        <AiChat
            chat={chat}
            intro={I18n.t('vis_ai_intro')}
            examples={EXAMPLES.map(example => I18n.t(example))}
            placeholder={I18n.t('vis_ai_placeholder')}
            unconfiguredText={I18n.t('vis_ai_no_key')}
            unreachableText={I18n.t('vis_ai_no_adapter')}
            onClose={props.onClose}
        />
    );
}
