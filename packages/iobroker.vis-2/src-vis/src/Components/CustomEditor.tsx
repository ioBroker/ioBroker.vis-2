import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
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
        <div style={{ position: 'relative', width: props.width, height: height ?? '100%' }}>
            <style>
                {`
                .vis-monaco {
                    boxSizing: border-box;
                    border: 1px solid transparent;
                }
                .vis-monaco-error {
                    boxSizing: border-box;
                    border: 1px solid #800;
                }`}
            </style>
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
            {canFormat ? (
                <Tooltip
                    title={formatError || `${I18n.t('Format code')} (Shift+Alt+F)`}
                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                >
                    <IconButton
                        size="small"
                        onClick={() => void format()}
                        color={formatError ? 'error' : 'default'}
                        style={{ position: 'absolute', top: 4, right: 20, zIndex: 1, opacity: 0.8 }}
                    >
                        <IconFormat fontSize="small" />
                    </IconButton>
                </Tooltip>
            ) : null}
        </div>
    );
}

export default CustomEditor;
