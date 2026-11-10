/**
 * Copying, exporting and importing a section of the grid layout, from the attributes of the section.
 */
import React, { useMemo, useState } from 'react';

import { FormControl, IconButton, InputLabel, MenuItem, Select, Tooltip } from '@mui/material';

import { FileCopy as DuplicateIcon } from '@mui/icons-material';
import { BiCut, BiExport } from 'react-icons/bi';

import { IconCopyToClipboard, IconUpload, I18n, type ThemeType } from '@iobroker/gui-components';

import type Editor from '@/Editor';
import type { ViewSection } from '@iobroker/types-vis-2';
import IODialog from '@/Components/IODialog';
import { JsonExportDialog, JsonImportField, OpenFileButton, useJsonFile } from '@/Components/JsonTransfer';
import { store } from '@/Store';
import {
    getSectionLabel,
    getSectionTransfer,
    getViewFileName,
    parseSectionImport,
    type SectionTransfer,
} from '@/Utilities/viewTransfer';

interface SectionImportDialogProps {
    onClose: () => void;
    themeType: ThemeType;
    /** The section the imported one is put after; at the end if none */
    after: ViewSection | null;
    insert: (transfer: SectionTransfer) => Promise<void>;
}

/**
 * Imports a section that the export of a section wrote, from a file or as pasted text. The export of a view, and a
 * whole project, offer each of their sections.
 */
function SectionImportDialog(props: SectionImportDialogProps): React.JSX.Element {
    const [data, setData] = useState('');
    const [source, setSource] = useState('');
    const [working, setWorking] = useState(false);

    const parsed = useMemo(() => parseSectionImport(data), [data]);
    const sources = parsed.sections ? Object.keys(parsed.sections) : [];
    const selected = parsed.sections?.[source] ? source : sources[0];
    const transfer = selected === undefined ? undefined : parsed.sections?.[selected];

    const file = useJsonFile(setData);

    return (
        <IODialog
            onClose={props.onClose}
            title={I18n.t('Import section')}
            noTranslation
            closeTitle={I18n.t('Cancel')}
            actionTitle={I18n.t('Import')}
            ActionIcon={IconUpload}
            action={() => {
                if (transfer) {
                    setWorking(true);
                    void props.insert(transfer).then(() => props.onClose());
                }
            }}
            actionNoClose
            actionDisabled={!transfer || working}
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
                onChange={setData}
                error={parsed.error ? I18n.t(parsed.error) : ''}
                hint={I18n.t('Paste the JSON of a section here, drop a file on the field or open one.')}
                themeType={props.themeType}
            />
            {sources.length > 1 ? (
                <FormControl
                    fullWidth
                    variant="standard"
                    style={{ marginTop: 16 }}
                >
                    <InputLabel>{I18n.t('Section from the file')}</InputLabel>
                    <Select
                        value={selected}
                        onChange={e => setSource(e.target.value)}
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
            <div style={{ marginTop: 16, fontSize: 'small', opacity: 0.7 }}>
                {props.after
                    ? I18n.t('The section is inserted after "%s"', getSectionLabel(props.after))
                    : I18n.t('The section is inserted at the end')}
            </div>
        </IODialog>
    );
}

interface SectionTransferBarProps {
    view: string;
    /** The section of the attributes; without one only the import is offered */
    section: ViewSection | null;
    /** Where the section is in the list of the sections */
    index: number;
    themeType: ThemeType;
    copySection: Editor['copySection'];
    duplicateSection: Editor['duplicateSection'];
    insertSectionTransfer: Editor['insertSectionTransfer'];
}

/** The buttons of the attributes of a section that copy, cut, duplicate, export and import it */
export default function SectionTransferBar(props: SectionTransferBarProps): React.JSX.Element {
    const [dialog, setDialog] = useState<'export' | 'import' | null>(null);
    const { section } = props;

    const button = (
        title: string,
        icon: React.JSX.Element,
        onClick: () => void,
        disabled?: boolean,
    ): React.JSX.Element => (
        <Tooltip
            title={title}
            slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
        >
            <span>
                <IconButton
                    size="small"
                    onClick={onClick}
                    disabled={disabled}
                >
                    {icon}
                </IconButton>
            </span>
        </Tooltip>
    );

    let exportDialog: React.JSX.Element | null = null;
    if (dialog === 'export' && section) {
        const transfer = getSectionTransfer(store.getState().visProject[props.view], section.id);
        const label = getSectionLabel(section);
        exportDialog = (
            <JsonExportDialog
                title={I18n.t('Export section "%s"', label)}
                json={JSON.stringify(transfer, null, 2)}
                fileName={getViewFileName(`${props.view} - ${label}`)}
                themeType={props.themeType}
                onClose={() => setDialog(null)}
            />
        );
    }

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            {button(
                `${I18n.t('Copy section')} (Ctrl+C)`,
                <IconCopyToClipboard fontSize="small" />,
                () => section && void props.copySection(section.id),
                !section,
            )}
            {button(
                `${I18n.t('Cut section')} (Ctrl+X)`,
                <BiCut />,
                () => section && void props.copySection(section.id, true),
                !section,
            )}
            {button(
                I18n.t('Duplicate section'),
                <DuplicateIcon fontSize="small" />,
                () => section && void props.duplicateSection(section.id),
                !section,
            )}
            {button(I18n.t('Export section'), <BiExport />, () => setDialog('export'), !section)}
            {button(I18n.t('Import section'), <IconUpload fontSize="small" />, () => setDialog('import'))}
            {exportDialog}
            {dialog === 'import' ? (
                <SectionImportDialog
                    onClose={() => setDialog(null)}
                    themeType={props.themeType}
                    after={section}
                    insert={transfer =>
                        props.insertSectionTransfer(
                            transfer,
                            section && props.index !== -1 ? props.index + 1 : undefined,
                        )
                    }
                />
            ) : null}
        </span>
    );
}
