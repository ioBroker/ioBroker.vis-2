import React, { Component } from 'react';

import { Dialog, Button, DialogActions, DialogContent, DialogTitle } from '@mui/material';

import { ContentCopy as IconCopy, Close as CloseIcon } from '@mui/icons-material';

import { I18n, type ThemeType, Utils } from '@iobroker/adapter-react-v5';

import CustomEditor from './CustomEditor';

interface CodeDialogProps {
    onClose: () => void;
    title?: string;
    themeType?: ThemeType;
    code: string;
    mode?: 'text' | 'css' | 'json' | 'javascript' | 'html';
}

class CodeDialog extends Component<CodeDialogProps> {
    render(): React.JSX.Element {
        return (
            <Dialog
                open={!0}
                onClose={() => this.props.onClose()}
                maxWidth="xl"
                fullWidth
            >
                <DialogTitle>{this.props.title || I18n.t('Code')}</DialogTitle>
                <DialogContent>
                    <CustomEditor
                        type={this.props.mode || 'html'}
                        themeType={this.props.themeType}
                        readOnly
                        value={this.props.code}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        onClick={() => {
                            Utils.copyToClipboard(this.props.code);
                            window.alert(I18n.t('Copied to clipboard'));
                        }}
                        startIcon={<IconCopy />}
                        color="primary"
                    >
                        {I18n.t('Copy to clipboard')}
                    </Button>
                    <Button
                        variant="contained"
                        color="grey"
                        startIcon={<CloseIcon />}
                        onClick={() => this.props.onClose()}
                    >
                        {I18n.t('Close')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default CodeDialog;
