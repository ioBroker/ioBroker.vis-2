import React, { useState } from 'react';

import { TextField } from '@mui/material';

import { I18n, type ThemeType } from '@iobroker/adapter-react-v5';

import IODialog from '../../Components/IODialog';
import CustomEditor from '../../Components/CustomEditor';
import { store } from '../../Store';

interface ImportDialogProps {
    importViewAction: (view: string, data: string) => void;
    onClose: () => void;
    view: string;
    themeType: ThemeType;
}

const ImportDialog: React.FC<ImportDialogProps> = props => {
    const visProject = store.getState().visProject;

    const [data, setData] = useState(
        visProject[props.view]
            ? JSON.stringify(visProject[props.view], null, 2)
            : `{
  "settings": {
    "style": {}
  },
  "widgets": {},
  "activeWidgets": {}
}`,
    );
    const [view, setView] = useState(props.view);
    const [error, setError] = useState(false);

    return (
        <IODialog
            onClose={props.onClose}
            title="Import view"
            closeTitle="Close"
            actionTitle="Import"
            action={() => props.importViewAction(view, data)}
            actionDisabled={!view.length || error}
        >
            <CustomEditor
                type="json"
                themeType={props.themeType}
                value={data}
                onChange={newValue => {
                    let _error = false;
                    try {
                        JSON.parse(newValue);
                    } catch {
                        _error = true;
                    }
                    setError(_error);
                    setData(newValue);
                }}
                height={200}
            />
            <div>
                <TextField
                    variant="standard"
                    fullWidth
                    label={I18n.t('View name')}
                    value={view}
                    onChange={e => setView(e.target.value)}
                />
            </div>
        </IODialog>
    );
};

export default ImportDialog;
