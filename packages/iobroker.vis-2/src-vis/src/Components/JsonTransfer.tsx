/**
 * The parts the export and import dialogs of views and of sections share: a dialog that shows JSON to download or
 * to copy, and a field for the JSON to import that also takes a file, opened or dropped on it.
 */
import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';

import { Button } from '@mui/material';

import { Check as CheckIcon, Download as DownloadIcon, FolderOpen as FolderOpenIcon } from '@mui/icons-material';

import { IconCopyToClipboard, Utils, I18n, type ThemeType } from '@iobroker/gui-components';

import IODialog from './IODialog';
import CustomEditor from './CustomEditor';

/**
 * Hand a text to the browser as a file to save.
 *
 * @param text - the content of the file
 * @param fileName - the name of the file
 */
export function downloadJson(text: string, fileName: string): void {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // the browser has the file once the click is handled
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface JsonExportDialogProps {
    /** Translated already */
    title: string;
    json: string;
    fileName: string;
    themeType: ThemeType;
    onClose: () => void;
}

/** Shows JSON, to save it as a file or to copy it */
export function JsonExportDialog(props: JsonExportDialogProps): React.JSX.Element {
    const [copied, setCopied] = useState(false);

    return (
        <IODialog
            onClose={props.onClose}
            title={props.title}
            noTranslation
            closeTitle={I18n.t('Close')}
            action={() => downloadJson(props.json, props.fileName)}
            actionTitle={I18n.t('Download')}
            actionNoClose
            ActionIcon={DownloadIcon}
            minWidth="min(800px, 80vw)"
            dialogActions={
                <Button
                    variant="outlined"
                    color="primary"
                    startIcon={copied ? <CheckIcon /> : <IconCopyToClipboard />}
                    onClick={() => {
                        Utils.copyToClipboard(props.json);
                        setCopied(true);
                    }}
                >
                    {I18n.t(copied ? 'Copied to clipboard' : 'Copy to clipboard')}
                </Button>
            }
        >
            <CustomEditor
                type="json"
                readOnly
                themeType={props.themeType}
                value={props.json}
                height={400}
            />
        </IODialog>
    );
}

/**
 * A JSON file for an import dialog, opened with `dropzone.open()` or dropped on the JsonImportField. Its text is
 * handed to `onText`.
 *
 * @param onText - gets the text of the file
 */
export function useJsonFile(onText: (text: string) => void): {
    dropzone: ReturnType<typeof useDropzone>;
    /** The editor takes its text only when it is created, so a file that is read creates it anew */
    editorKey: number;
    fileError: string;
    setFileError: (error: string) => void;
} {
    const [editorKey, setEditorKey] = useState(0);
    const [fileError, setFileError] = useState('');

    const dropzone = useDropzone({
        onDrop: (files: File[]): void => {
            files[0]
                ?.text()
                .then(text => {
                    setFileError('');
                    onText(text);
                    setEditorKey(key => key + 1);
                })
                .catch((e: unknown) => setFileError(String(e)));
        },
        // a click into the editor is for typing
        noClick: true,
        noKeyboard: true,
        multiple: false,
        accept: { 'application/json': ['.json'] },
        onDropRejected: () => setFileError(I18n.t('Invalid file type')),
    });

    return { dropzone, editorKey, fileError, setFileError };
}

interface JsonImportFieldProps {
    file: ReturnType<typeof useJsonFile>;
    value: string;
    onChange: (text: string) => void;
    /** What is wrong with the text, translated already; empty if nothing */
    error: string;
    /** Translated already */
    hint: string;
    themeType: ThemeType;
}

/** The JSON to import, typed or pasted - or the text of a file dropped on it */
export function JsonImportField(props: JsonImportFieldProps): React.JSX.Element {
    const { dropzone, editorKey, fileError, setFileError } = props.file;
    const error = fileError || props.error;

    return (
        <>
            <div style={{ fontSize: 'small', opacity: 0.7, marginBottom: 8 }}>{props.hint}</div>
            <div
                {...dropzone.getRootProps()}
                style={{
                    borderRadius: 4,
                    border: '2px dashed',
                    borderColor: dropzone.isDragActive
                        ? props.themeType === 'dark'
                            ? 'lightgreen'
                            : 'green'
                        : 'transparent',
                }}
            >
                <input {...dropzone.getInputProps()} />
                <CustomEditor
                    key={editorKey}
                    type="json"
                    error={!!error}
                    themeType={props.themeType}
                    value={props.value}
                    onChange={text => {
                        setFileError('');
                        props.onChange(text);
                    }}
                    height={300}
                />
            </div>
            {error ? <div style={{ color: '#d32f2f', marginTop: 4 }}>{error}</div> : null}
        </>
    );
}

/** The button of an import dialog that opens a file */
export function OpenFileButton(props: { file: ReturnType<typeof useJsonFile>; disabled?: boolean }): React.JSX.Element {
    return (
        <Button
            variant="outlined"
            color="primary"
            startIcon={<FolderOpenIcon />}
            onClick={props.file.dropzone.open}
            disabled={props.disabled}
        >
            {I18n.t('Open file')}
        </Button>
    );
}
