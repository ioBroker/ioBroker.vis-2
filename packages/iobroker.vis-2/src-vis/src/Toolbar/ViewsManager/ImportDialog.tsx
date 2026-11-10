import React, { useMemo, useState } from 'react';

import { FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';

import { IconUpload, I18n, type ThemeType } from '@iobroker/gui-components';

import type Editor from '@/Editor';
import IODialog from '@/Components/IODialog';
import { JsonImportField, OpenFileButton, useJsonFile } from '@/Components/JsonTransfer';
import { store } from '@/Store';
import { deepClone } from '@/Utilities/utils';
import { getViewExport, insertView, parseViewImport } from '@/Utilities/viewTransfer';

interface ImportDialogProps {
    changeProject: Editor['changeProject'];
    changeView: Editor['changeView'];
    onClose: () => void;
    /** The view the import replaces; empty to import a new view */
    view: string;
    themeType: ThemeType;
}

/**
 * A name for the imported view that no view has yet: the name it had, with a number if that is taken
 *
 * @param name - the name the view had where it was exported
 */
function getFreeViewName(name: string): string {
    const project = store.getState().visProject;
    const base = name.trim() && !name.startsWith('___') ? name.trim() : I18n.t('Imported view');
    let free = base;
    for (let i = 2; project[free]; i++) {
        free = `${base} (${i})`;
    }
    return free;
}

/**
 * Imports a view that the ExportDialog wrote: from a file, opened or dropped on the editor, or as pasted text.
 * A file of a whole project - like the `vis-views.json` of a project export - offers each of its views.
 */
const ImportDialog: React.FC<ImportDialogProps> = props => {
    // the view that is replaced is shown as it is, so it can also be edited as JSON here
    const [data, setData] = useState(() =>
        props.view && store.getState().visProject[props.view]
            ? JSON.stringify(getViewExport(store.getState().visProject, props.view), null, 2)
            : '',
    );
    /** The view of the text that is imported, by its name there */
    const [source, setSource] = useState(props.view);
    const [name, setName] = useState(props.view);
    /** The user typed a name, or the dialog replaces a view: the name does not follow the text any more */
    const [nameFixed, setNameFixed] = useState(!!props.view);
    const [working, setWorking] = useState(false);

    const parsed = useMemo(() => parseViewImport(data), [data]);
    const sources = parsed.views ? Object.keys(parsed.views) : [];

    const onText = (text: string): void => {
        setData(text);
        const views = parseViewImport(text).views;
        if (views) {
            const first = views[source] ? source : Object.keys(views)[0];
            setSource(first);
            if (!nameFixed) {
                setName(getFreeViewName(first));
            }
        }
    };

    const file = useJsonFile(onText);

    const target = name.trim();
    const project = store.getState().visProject;
    let nameError = '';
    let nameWarning = '';
    if (target.startsWith('___')) {
        nameError = I18n.t('This name is not allowed');
    } else if (target && project[target]) {
        nameWarning = I18n.t('A view with this name exists and will be replaced');
    }

    const view = parsed.views?.[source];

    const importView = async (): Promise<void> => {
        if (!view || !target || nameError) {
            return;
        }
        setWorking(true);
        const newProject = deepClone(store.getState().visProject);
        // a view that is replaced stays in its folder
        insertView(newProject, target, view, newProject[target]?.parentId);
        await props.changeProject(newProject);
        await props.changeView(target);
        props.onClose();
    };

    return (
        <IODialog
            onClose={props.onClose}
            title={props.view ? I18n.t('Import into "%s"', props.view) : I18n.t('Import view')}
            noTranslation
            closeTitle={I18n.t('Cancel')}
            actionTitle={I18n.t('Import')}
            ActionIcon={IconUpload}
            action={() => void importView()}
            actionNoClose
            actionDisabled={!view || !target || !!nameError || working}
            keyboardDisabled
            minWidth="min(800px, 80vw)"
            dialogActions={
                <OpenFileButton
                    file={file}
                    disabled={working}
                />
            }
        >
            <JsonImportField
                file={file}
                value={data}
                onChange={onText}
                error={parsed.error ? I18n.t(parsed.error) : ''}
                hint={I18n.t('Paste the JSON of a view here, drop a file on the field or open one.')}
                themeType={props.themeType}
            />
            {sources.length > 1 ? (
                <FormControl
                    fullWidth
                    variant="standard"
                    style={{ marginTop: 16 }}
                >
                    <InputLabel>{I18n.t('View from the file')}</InputLabel>
                    <Select
                        value={source}
                        onChange={e => {
                            setSource(e.target.value);
                            if (!nameFixed) {
                                setName(getFreeViewName(e.target.value));
                            }
                        }}
                    >
                        {sources.map(one => (
                            <MenuItem
                                key={one}
                                value={one}
                            >
                                {one}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            ) : null}
            <TextField
                variant="standard"
                fullWidth
                style={{ marginTop: 16 }}
                label={I18n.t('View name')}
                value={name}
                disabled={working}
                error={!!nameError}
                helperText={nameError || nameWarning}
                slotProps={{ formHelperText: { sx: nameWarning ? { color: 'warning.main' } : undefined } }}
                onChange={e => {
                    setName(e.target.value);
                    setNameFixed(true);
                }}
            />
        </IODialog>
    );
};

export default ImportDialog;
