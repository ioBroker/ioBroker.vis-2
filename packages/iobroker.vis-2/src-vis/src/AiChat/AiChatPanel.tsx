import React from 'react';

import { Alert, Box, CircularProgress, IconButton, MenuItem, TextField, Tooltip, Typography } from '@mui/material';
import { Close as CloseIcon, DeleteSweep as ClearIcon, Send as SendIcon, Stop as StopIcon } from '@mui/icons-material';

import { I18n, type Connection } from '@iobroker/gui-components';

import type { AnyWidgetId, Project, VisTheme } from '@iobroker/types-vis-2';

import { useAiChat } from './useAiChat';
import type { AiChatMessage } from './aiTypes';

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

/**
 * The assistant, as a column of the editor.
 *
 * A chat, and under every answer the list of what it actually did - `Seite Küche angelegt`,
 * `Schalter auf Küche gesetzt`. That list is the point: an assistant that changes a project has to
 * say what it changed, in the words of the thing it changed, or nobody can tell an error from a
 * misunderstanding.
 *
 * @param props - the connection, the project, and what the editor lets it do
 */
export default function AiChatPanel(props: AiChatPanelProps): React.JSX.Element {
    const chat = useAiChat({
        socket: props.socket,
        instance: props.instance,
        selectedView: props.selectedView,
        changeProject: props.changeProject,
        openView: props.openView,
        selectWidgets: props.selectWidgets,
    });
    const [text, setText] = React.useState('');
    const endRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chat.messages]);

    const submit = (): void => {
        if (!text.trim() || chat.busy) {
            return;
        }
        chat.send(text);
        setText('');
    };

    const renderMessage = (message: AiChatMessage): React.JSX.Element => {
        const mine = message.role === 'user';
        return (
            <Box
                key={message.id}
                sx={{
                    alignSelf: mine ? 'flex-end' : 'flex-start',
                    maxWidth: '92%',
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    fontSize: 14,
                    lineHeight: 1.45,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    bgcolor: mine ? 'primary.main' : message.role === 'error' ? 'error.dark' : 'action.hover',
                    color: mine ? 'primary.contrastText' : 'text.primary',
                }}
            >
                {message.pending && !message.content ? (
                    <CircularProgress
                        size={16}
                        color="inherit"
                    />
                ) : (
                    message.content
                )}
                {message.actions?.length ? (
                    <Box
                        component="ul"
                        sx={{ m: 0, mt: message.content ? 1 : 0, pl: 2.5, opacity: 0.75, fontSize: 12.5 }}
                    >
                        {message.actions.map((action, index) => (
                            <li key={index}>{action}</li>
                        ))}
                    </Box>
                ) : null}
            </Box>
        );
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            {/* the head: what it is, which model, and the two buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, flexShrink: 0 }}>
                <Typography
                    sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}
                    noWrap
                >
                    {I18n.t('vis_ai_title')}
                </Typography>
                <Tooltip title={I18n.t('vis_ai_clear')}>
                    <span>
                        <IconButton
                            size="small"
                            disabled={!chat.messages.length || chat.busy}
                            onClick={chat.clear}
                        >
                            <ClearIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
                <IconButton
                    size="small"
                    onClick={props.onClose}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            {chat.problem ? (
                <Alert
                    severity={chat.problem === 'unreachable' ? 'warning' : 'info'}
                    sx={{ m: 1 }}
                >
                    {I18n.t(chat.problem === 'unreachable' ? 'vis_ai_no_adapter' : 'vis_ai_no_key')}
                </Alert>
            ) : (
                <Box sx={{ display: 'flex', gap: 1, px: 1, pb: 1, flexShrink: 0 }}>
                    {chat.providers.length > 1 ? (
                        <TextField
                            select
                            size="small"
                            variant="standard"
                            sx={{ width: 110 }}
                            value={chat.provider}
                            onChange={event =>
                                chat.setProvider(event.target.value as typeof chat.provider extends '' ? never : any)
                            }
                        >
                            {chat.providers.map(one => (
                                <MenuItem
                                    key={one}
                                    value={one}
                                >
                                    {one}
                                </MenuItem>
                            ))}
                        </TextField>
                    ) : null}
                    <TextField
                        select
                        size="small"
                        variant="standard"
                        sx={{ flex: 1, minWidth: 0 }}
                        value={chat.models.includes(chat.model) ? chat.model : ''}
                        onChange={event => chat.setModel(event.target.value)}
                    >
                        {chat.models.map(one => (
                            <MenuItem
                                key={one}
                                value={one}
                            >
                                {one}
                            </MenuItem>
                        ))}
                    </TextField>
                </Box>
            )}

            {chat.modelsError ? (
                <Alert
                    severity="error"
                    sx={{ m: 1 }}
                >
                    {chat.modelsError}
                </Alert>
            ) : !chat.problem && chat.provider && !chat.models.length ? (
                <Alert
                    severity="info"
                    sx={{ m: 1 }}
                >
                    {I18n.t('vis_ai_no_models')}
                </Alert>
            ) : null}

            {/* the conversation */}
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    px: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                }}
            >
                {chat.messages.length ? (
                    chat.messages.map(renderMessage)
                ) : (
                    <Box sx={{ p: 1, opacity: 0.7, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <div>{I18n.t('vis_ai_intro')}</div>
                        {EXAMPLES.map(example => (
                            <Box
                                key={example}
                                onClick={() => setText(I18n.t(example))}
                                sx={{
                                    cursor: 'pointer',
                                    borderRadius: 2,
                                    border: theme => `1px solid ${theme.palette.divider}`,
                                    px: 1.5,
                                    py: 1,
                                    '&:hover': { borderColor: 'primary.main' },
                                }}
                            >
                                {I18n.t(example)}
                            </Box>
                        ))}
                    </Box>
                )}
                <div ref={endRef} />
            </Box>

            {/* what to say to it */}
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, p: 1, flexShrink: 0 }}>
                <TextField
                    fullWidth
                    multiline
                    maxRows={6}
                    size="small"
                    disabled={!!chat.problem || !chat.model}
                    placeholder={I18n.t('vis_ai_placeholder')}
                    value={text}
                    onChange={event => setText(event.target.value)}
                    onKeyDown={event => {
                        // Enter sends, Shift+Enter is a new line - as everywhere else
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            submit();
                        }
                    }}
                />
                {chat.busy ? (
                    <Tooltip title={I18n.t('vis_ai_stop')}>
                        <IconButton
                            color="error"
                            onClick={chat.stop}
                        >
                            <StopIcon />
                        </IconButton>
                    </Tooltip>
                ) : (
                    <IconButton
                        color="primary"
                        disabled={!text.trim() || !!chat.problem || !chat.model}
                        onClick={submit}
                    >
                        <SendIcon />
                    </IconButton>
                )}
            </Box>
        </Box>
    );
}
