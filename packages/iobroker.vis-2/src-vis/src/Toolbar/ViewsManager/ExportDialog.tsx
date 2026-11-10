import React, { useMemo } from 'react';

import { I18n, type ThemeType } from '@iobroker/gui-components';

import { JsonExportDialog } from '@/Components/JsonTransfer';
import { store } from '@/Store';
import { getViewExport, getViewFileName } from '@/Utilities/viewTransfer';

interface ExportDialogProps {
    onClose: () => void;
    themeType: ThemeType;
    view: string;
}

/** Shows a view as JSON, to save it as a file or to copy it, and to import it again with the ImportDialog */
const ExportDialog: React.FC<ExportDialogProps> = props => {
    const json = useMemo(
        () => JSON.stringify(getViewExport(store.getState().visProject, props.view), null, 2),
        [props.view],
    );

    return (
        <JsonExportDialog
            title={I18n.t('Export "%s"', props.view)}
            json={json}
            fileName={getViewFileName(props.view)}
            themeType={props.themeType}
            onClose={props.onClose}
        />
    );
};

export default ExportDialog;
