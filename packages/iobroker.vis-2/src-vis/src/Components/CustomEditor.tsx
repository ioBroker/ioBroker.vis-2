import React from 'react';
import { Button, Tooltip } from '@mui/material';
import { FormatAlignLeft as IconFormat } from '@mui/icons-material';
import { I18n, type ThemeType } from '@iobroker/gui-components';
import Editor, { type OnMount } from '@monaco-editor/react';

type EditorType = 'javascript' | 'css' | 'html' | 'json' | 'text';
type MonacoEditorInstance = Parameters<OnMount>[0];

interface MonacoEditorProps {
    type?: EditorType;
    value: string;
    onChange?: (value: string) => void;
    themeType?: ThemeType;
    readOnly?: boolean;
    height?: number | string;
    width?: number | string;
    error?: boolean;
    /** controls shown left in the row above the code, next to the format button */
    toolbar?: React.ReactNode;
}

const PRETTIER_PARSERS: Partial<Record<EditorType, string>> = {
    javascript: 'babel',
    css: 'css',
    html: 'html',
    json: 'json',
};

/** Formats the code with prettier. Prettier is loaded on demand, so it costs nothing until it is used. */
async function formatCode(code: string, type: EditorType): Promise<string> {
    const [prettier, babel, estree, postcss, html] = await Promise.all([
        import('prettier/standalone'),
        import('prettier/plugins/babel'),
        import('prettier/plugins/estree'),
        import('prettier/plugins/postcss'),
        import('prettier/plugins/html'),
    ]);

    return prettier.format(code, {
        parser: PRETTIER_PARSERS[type],
        // HTML may carry <script> and <style>, so it needs all plugins
        plugins: [babel, estree, postcss, html],
        printWidth: 120,
        tabWidth: 4,
        singleQuote: true,
        arrowParens: 'avoid',
    });
}

export function CustomEditor(props: MonacoEditorProps): React.JSX.Element {
    const { type, value, onChange, themeType, height } = props;
    const [defaultValue] = React.useState(value);
    const [formatError, setFormatError] = React.useState('');
    const editorRef = React.useRef<MonacoEditorInstance | null>(null);
    const canFormat = !!onChange && !props.readOnly && !!type && !!PRETTIER_PARSERS[type];

    const format = async (): Promise<void> => {
        const editor = editorRef.current;
        const model = editor?.getModel();
        if (!editor || !model || !type) {
            return;
        }
        try {
            const code = model.getValue();
            const formatted = await formatCode(code, type);
            if (formatted !== code) {
                // executeEdits instead of setValue, so that Ctrl+Z can undo the formatting
                editor.pushUndoStop();
                editor.executeEdits('prettier', [{ range: model.getFullModelRange(), text: formatted }]);
                editor.pushUndoStop();
            }
            setFormatError('');
        } catch (e) {
            setFormatError((e as Error).message.split('\n')[0]);
        }
    };

    // The keyboard shortcut is registered once on mount, so it must always reach the current format()
    const formatRef = React.useRef(format);
    formatRef.current = format;

    const onMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        if (canFormat) {
            // Shift+Alt+F is monaco's "Format document": format with prettier instead
            editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
                void formatRef.current();
            });
        }
    };

    return (
        <div
            style={{
                width: props.width,
                height: height ?? '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <style>
                {`
                .vis-monaco {
                    box-sizing: border-box;
                    border: 1px solid transparent;
                }
                .vis-monaco-error {
                    box-sizing: border-box;
                    border: 1px solid #800;
                }
                .vis-monaco-toolbar-end {
                    container-type: inline-size;
                }
                @container (max-width: 180px) {
                    .vis-monaco-format-label {
                        display: none;
                    }
                    .vis-monaco-format {
                        min-width: 0;
                    }
                    .vis-monaco-format .MuiButton-startIcon {
                        margin: 0;
                    }
                }`}
            </style>
            {canFormat || props.toolbar ? (
                // A row of its own above the code, so the button never covers the code
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        minHeight: 34,
                        flexShrink: 0,
                    }}
                >
                    {props.toolbar}
                    {/* takes the space the toolbar leaves; the container query hides the label when it is too narrow */}
                    <div
                        className="vis-monaco-toolbar-end"
                        style={{ flexGrow: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                        <div
                            title={formatError}
                            style={{
                                flexGrow: 1,
                                minWidth: 0,
                                color: '#d32f2f',
                                fontSize: 12,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                textAlign: 'right',
                            }}
                        >
                            {formatError}
                        </div>
                        {canFormat ? (
                            <Tooltip
                                title={`${I18n.t('Format code')} (Shift+Alt+F)`}
                                slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                            >
                                <Button
                                    size="small"
                                    className="vis-monaco-format"
                                    onClick={() => void format()}
                                    color={formatError ? 'error' : 'inherit'}
                                    startIcon={<IconFormat />}
                                    style={{ flexShrink: 0, textTransform: 'none' }}
                                >
                                    <span className="vis-monaco-format-label">{I18n.t('Format code')}</span>
                                </Button>
                            </Tooltip>
                        ) : null}
                    </div>
                </div>
            ) : null}
            <div style={{ flexGrow: 1, minHeight: 0 }}>
                <Editor
                    theme={themeType === 'dark' ? 'vs-dark' : 'vs-light'}
                    height="100%"
                    language={type}
                    // value={value}
                    defaultValue={defaultValue}
                    onChange={
                        onChange
                            ? (value?: string): void => {
                                  setFormatError('');
                                  onChange(value || '');
                              }
                            : undefined
                    }
                    onMount={onMount}
                    className={props.error ? 'vis-monaco-error' : 'vis-monaco'}
                    options={{
                        readOnly: !onChange,
                        minimap: { enabled: false },
                        stickyScroll: {
                            enabled: false,
                        },
                    }}
                />
            </div>
        </div>
    );
}

export default CustomEditor;
