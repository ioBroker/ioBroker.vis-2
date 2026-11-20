import React, { useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';

import { Box, CircularProgress, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

import { CloudUpload, ErrorOutlineOutlined, FolderZip, InsertDriveFile } from '@mui/icons-material';

import { I18n, Utils } from '@iobroker/gui-components';

const IMAGE_TYPES = [
    '.png',
    '.jpg',
    '.svg',
    '.gif',
    '.apng',
    '.avif',
    '.webp',
    '.jpeg',
    '.bmp',
    '.ico',
    '.tiff',
    '.tif',
];

interface UploadFileProps {
    onUpload: (fileName: string, fileData: string | ArrayBuffer) => void;
    disabled?: boolean;
    accept?: Record<string, string[]>; // {'application/zip': ['.zip'], 'application/json': ['.json']},
    instruction?: string;
    maxSize?: number;
    /** Shown with a spinner instead of the file while the caller works with it (e.g. sends it to the server) */
    busy?: React.ReactNode;
}

interface SelectedFile {
    name: string;
    size: number;
    data: string | ArrayBuffer;
}

const UploadFile = (props: UploadFileProps): React.JSX.Element => {
    const [file, setFile] = useState<SelectedFile | null>(null);
    const [reading, setReading] = useState(false);
    const [error, setError] = useState('');

    const onDrop = (acceptedFiles: File[], fileRejections: FileRejection[]): void => {
        setError('');
        if (acceptedFiles?.length) {
            const accepted = acceptedFiles[0];
            setReading(true);
            const reader = new FileReader();
            reader.onload = (evt: ProgressEvent<FileReader>): void => {
                setReading(false);
                const result = evt.target?.result;
                if (result == null) {
                    return;
                }
                setFile({ name: accepted.name, size: accepted.size, data: result });
                props.onUpload(accepted.name, result);
            };
            reader.onerror = (): void => {
                setReading(false);
                setError(`Error: ${reader.error?.message || 'cannot read the file'}`);
            };
            reader.readAsDataURL(accepted);
        } else if (fileRejections?.length) {
            const err = fileRejections[0].errors[0];
            if (err?.code === 'file-too-large') {
                setError(
                    props.maxSize
                        ? `${I18n.t('File too large')} (${I18n.t('max. %s', Utils.formatBytes(props.maxSize))})`
                        : I18n.t('File too large'),
                );
            } else if (err?.code === 'file-invalid-type') {
                setError(I18n.t('Invalid file type'));
            } else if (err) {
                setError(`Error: ${err.message}`);
            }
        }
    };

    const disabled = !!props.disabled || reading || !!props.busy;

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxFiles: 1,
        multiple: false,
        maxSize: props.maxSize || undefined,
        accept: props.accept,
        disabled,
    });

    // ".zip" or ".png, .jpg, .svg · max. 14.65 KB"
    const extensions = props.accept ? [...new Set(Object.values(props.accept).flat())].join(', ') : '';
    const limits = [extensions, props.maxSize ? I18n.t('max. %s', Utils.formatBytes(props.maxSize)) : '']
        .filter(Boolean)
        .join(' · ');

    let preview: React.JSX.Element;
    if (file && IMAGE_TYPES.find(ext => file.name.toLowerCase().endsWith(ext))) {
        preview = (
            <Box
                component="img"
                src={file.data as string}
                alt=""
                sx={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }}
            />
        );
    } else if (file?.name.toLowerCase().endsWith('.zip')) {
        preview = <FolderZip sx={{ fontSize: 40, color: 'primary.main', flexShrink: 0 }} />;
    } else {
        preview = <InsertDriveFile sx={{ fontSize: 40, color: 'primary.main', flexShrink: 0 }} />;
    }

    let content: React.JSX.Element;
    if (props.busy) {
        content = (
            <>
                <CircularProgress sx={{ mb: 1 }} />
                {props.busy}
            </>
        );
    } else if (reading) {
        content = <CircularProgress />;
    } else if (file) {
        content = (
            <>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        alignSelf: 'stretch',
                        p: 1.5,
                        borderRadius: '8px',
                        bgcolor: 'action.hover',
                    }}
                >
                    {preview}
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 500, wordBreak: 'break-all' }}>{file.name}</Typography>
                        <Typography
                            variant="body2"
                            sx={{ color: 'text.secondary' }}
                        >
                            {Utils.formatBytes(file.size)}
                        </Typography>
                    </Box>
                </Box>
                <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary' }}
                    align="center"
                >
                    {I18n.t('Click or drop another file to replace it')}
                </Typography>
            </>
        );
    } else {
        content = (
            <>
                <CloudUpload sx={{ fontSize: 48, color: isDragActive ? 'primary.main' : 'text.secondary' }} />
                <Typography align="center">
                    {props.instruction || I18n.t('Drop the file here or click to select it')}
                </Typography>
                {limits ? (
                    <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary' }}
                        align="center"
                    >
                        {limits}
                    </Typography>
                ) : null}
            </>
        );
    }

    return (
        <div>
            <Box
                {...getRootProps()}
                sx={theme => ({
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    minHeight: 180,
                    p: 3,
                    boxSizing: 'border-box',
                    borderRadius: '12px',
                    border: '2px dashed',
                    borderColor: isDragActive ? 'primary.main' : 'text.disabled',
                    bgcolor: isDragActive ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                    cursor: disabled ? 'default' : 'pointer',
                    opacity: props.disabled && !props.busy ? 0.6 : 1,
                    outline: 'none',
                    transition: 'border-color 150ms, background-color 150ms',
                    '&:hover, &:focus-visible': disabled
                        ? undefined
                        : {
                              borderColor: 'primary.main',
                              bgcolor: alpha(theme.palette.primary.main, 0.04),
                          },
                })}
            >
                <input {...getInputProps()} />
                {content}
            </Box>
            {error ? (
                <Typography
                    variant="body2"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, color: 'error.main' }}
                >
                    <ErrorOutlineOutlined fontSize="small" />
                    {error}
                </Typography>
            ) : null}
        </div>
    );
};

export default UploadFile;
