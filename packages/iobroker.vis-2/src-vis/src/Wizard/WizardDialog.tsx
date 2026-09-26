import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    InputAdornment,
    LinearProgress,
    MenuItem,
    Radio,
    RadioGroup,
    Step,
    StepLabel,
    Stepper,
    Switch,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    AutoAwesome as WizardIcon,
    Check as CheckIcon,
    Close as CloseIcon,
    ExpandMore as ExpandMoreIcon,
    NavigateBefore as BackIcon,
    NavigateNext as NextIcon,
    Search as SearchIcon,
} from '@mui/icons-material';

import { DeviceTypeIcon, I18n, Icon, extendDeviceTypeTranslation, type Connection } from '@iobroker/gui-components';

import type { Project } from '@iobroker/types-vis-2';

import { store } from '@/Store';
import { deepClone, getNewWidgetIdNumber } from '@/Utilities/utils';
import { getDefaultGridSpan, getGridLayout, type GridCellSpan } from '@/Vis/visGridLayout';
import { getWidgetTypes } from '@/Vis/visWidgetsCatalog';

import {
    CANCELLED,
    NO_GROUP_ID,
    detectDevices,
    type WizardDetection,
    type WizardDevice,
    type WizardEnum,
} from './deviceDetection';
import {
    applyWizardPlan,
    planWizardPages,
    type WizardGrouping,
    type WizardPages,
    type WizardPlan,
} from './planWizardPages';

const STEPS = ['Scope', 'Check devices', 'Structure', 'Summary'];

const styles: Record<string, React.CSSProperties> = {
    content: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
    },
    filters: {
        display: 'flex',
        gap: 16,
        alignItems: 'flex-end',
        flexWrap: 'wrap',
    },
    deviceRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
    },
    deviceIcon: {
        width: 24,
        height: 24,
        flexShrink: 0,
    },
    deviceName: {
        flexGrow: 1,
    },
    deviceType: {
        opacity: 0.6,
        whiteSpace: 'nowrap',
    },
    groupSummary: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
    },
    hint: {
        opacity: 0.7,
    },
};

export interface WizardDialogProps {
    socket: Connection;
    changeProject: (project: Project) => Promise<void>;
    changeView: (view: string) => Promise<void>;
    onClose: () => void;
}

// the names of the kinds of devices come with the components, in every language the editor speaks
extendDeviceTypeTranslation();

/** The name of a kind of device, like `Blinds` for `blind` */
function typeName(type: string): string {
    return I18n.t(`type-${type}`);
}

/** `hm-rpc.0.ABC.STATE` belongs to the adapter `hm-rpc` */
function adapterOf(id: string): string {
    return id.split('.')[0];
}

/**
 * The wizard that builds pages out of the devices of the installation.
 *
 * It finds the devices with the type detector, sorts them into the rooms or the functions they are in, and
 * writes one page with a section per group - or one page per group. Everything it creates is one change of the
 * project, so one press of undo takes it all back.
 *
 * @param props - the connection, the theme and how the editor is told about the new pages
 */
export default function WizardDialog(props: WizardDialogProps): React.JSX.Element {
    const [step, setStep] = useState(0);
    const [detection, setDetection] = useState<WizardDetection | null>(null);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [adapter, setAdapter] = useState('');
    const [grouping, setGrouping] = useState<WizardGrouping>('room');

    const [unchecked, setUnchecked] = useState<Record<string, boolean>>({});
    const [names, setNames] = useState<Record<string, string>>({});

    const [pages, setPages] = useState<WizardPages>('single');
    const [pageName, setPageName] = useState(I18n.t('Devices'));
    const [standardIcons, setStandardIcons] = useState(window.localStorage.getItem('Wizard.standardIcons') === 'true');
    const [sectionVariant, setSectionVariant] = useState<'panel' | 'plain'>(
        window.localStorage.getItem('Wizard.sectionVariant') === 'plain' ? 'plain' : 'panel',
    );

    const [creating, setCreating] = useState(false);

    // closing the dialog while the detection is still running stops it
    const cancelled = useRef(false);
    useEffect(() => {
        cancelled.current = false;
        detectDevices({
            socket: props.socket,
            language: I18n.getLanguage(),
            onProgress: setProgress,
            isCancelled: () => cancelled.current,
        })
            .then(setDetection)
            .catch(e => {
                if (e?.message !== CANCELLED) {
                    setError(e?.message || e?.toString());
                }
            });

        return () => {
            cancelled.current = true;
        };
    }, [props.socket]);

    /** The groups the devices are sorted into: the rooms, or the functions */
    const groups: WizardEnum[] = useMemo(
        () => (grouping === 'room' ? detection?.rooms || [] : detection?.functions || []),
        [detection, grouping],
    );

    const withoutGroupName = I18n.t(grouping === 'room' ? 'Without room' : 'Without function');

    /** Every adapter that has a device, so the scope can be narrowed to one of them */
    const adapters: string[] = useMemo(() => {
        const list = new Set<string>();
        detection?.devices.forEach(device => list.add(adapterOf(device.id)));
        return [...list].sort();
    }, [detection]);

    /** The devices the filters of the first step let through */
    const visible: WizardDevice[] = useMemo(() => {
        const filter = search.trim().toLowerCase();
        return (detection?.devices || []).filter(device => {
            if (adapter && adapterOf(device.id) !== adapter) {
                return false;
            }
            if (!filter) {
                return true;
            }
            return (
                device.name.toLowerCase().includes(filter) ||
                device.id.toLowerCase().includes(filter) ||
                typeName(device.type).toLowerCase().includes(filter)
            );
        });
    }, [detection, search, adapter]);

    /** The devices that are visible and ticked, with the names the user gave them */
    const selected: WizardDevice[] = useMemo(
        () =>
            visible
                .filter(device => !unchecked[device.id])
                .map(device => (names[device.id] ? { ...device, name: names[device.id] } : device)),
        [visible, unchecked, names],
    );

    /** The devices of every group, in the order the groups come in */
    const byGroup: { group: WizardEnum; devices: WizardDevice[] }[] = useMemo(() => {
        const result: { group: WizardEnum; devices: WizardDevice[] }[] = [];
        const find = (group: WizardEnum): WizardDevice[] => {
            let found = result.find(entry => entry.group.id === group.id);
            if (!found) {
                found = { group, devices: [] };
                result.push(found);
            }
            return found.devices;
        };
        groups.forEach(find);
        visible.forEach(device => {
            const id = grouping === 'room' ? device.roomId : device.functionId;
            const group = groups.find(g => g.id === id) || { id: NO_GROUP_ID, name: withoutGroupName };
            find(group).push(device);
        });
        return result.filter(entry => entry.devices.length);
    }, [visible, groups, grouping, withoutGroupName]);

    /** How many cells a widget of a type takes in a section; the widget types say it themselves */
    const getSpan = useMemo(() => {
        const layout = getGridLayout(null);
        const types = getWidgetTypes();
        return (tpl: string): GridCellSpan => {
            const type = types.find(widgetType => widgetType.name === tpl);
            return getDefaultGridSpan(type?.grid, type?.style, layout);
        };
    }, []);

    const plan: WizardPlan | null = useMemo(() => {
        if (!detection) {
            return null;
        }
        const project = store.getState().visProject;
        return planWizardPages(selected, {
            grouping,
            pages,
            groups,
            withoutGroupName,
            pageName,
            existingNames: Object.keys(project).filter(view => view !== '___settings'),
            firstWidgetNumber: getNewWidgetIdNumber(false, project),
            getSpan,
            standardIcons,
            sectionVariant,
        });
    }, [
        detection,
        selected,
        grouping,
        pages,
        groups,
        withoutGroupName,
        pageName,
        getSpan,
        standardIcons,
        sectionVariant,
    ]);

    const toggleGroup = (devices: WizardDevice[], checked: boolean): void => {
        const next = { ...unchecked };
        devices.forEach(device => {
            if (checked) {
                delete next[device.id];
            } else {
                next[device.id] = true;
            }
        });
        setUnchecked(next);
    };

    const create = async (): Promise<void> => {
        if (!plan?.pages.length) {
            return;
        }
        setCreating(true);
        try {
            const project = deepClone(store.getState().visProject);
            applyWizardPlan(project, plan);
            await props.changeProject(project);
            await props.changeView(plan.pages[0].name);
            props.onClose();
        } catch (e: any) {
            setError(e?.message || e?.toString());
            setCreating(false);
        }
    };

    const renderScope = (): React.JSX.Element => (
        <>
            <div style={styles.filters}>
                <TextField
                    variant="standard"
                    label={I18n.t('Search')}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    sx={{ flexGrow: 1, minWidth: 200 }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                            endAdornment: search ? (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        onClick={() => setSearch('')}
                                    >
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ) : null,
                        },
                    }}
                />
                <TextField
                    variant="standard"
                    select
                    label={I18n.t('Adapter')}
                    value={adapter}
                    onChange={e => setAdapter(e.target.value)}
                    sx={{ minWidth: 180 }}
                >
                    <MenuItem value="">{I18n.t('All adapters')}</MenuItem>
                    {adapters.map(name => (
                        <MenuItem
                            key={name}
                            value={name}
                        >
                            {name}
                        </MenuItem>
                    ))}
                </TextField>
            </div>
            <div>
                <Typography
                    variant="body2"
                    style={styles.hint}
                >
                    {I18n.t('Group the devices by')}
                </Typography>
                <ToggleButtonGroup
                    exclusive
                    value={grouping}
                    onChange={(_e, value) => value && setGrouping(value as WizardGrouping)}
                >
                    <ToggleButton value="room">{I18n.t('Rooms')}</ToggleButton>
                    <ToggleButton value="function">{I18n.t('Functions')}</ToggleButton>
                </ToggleButtonGroup>
            </div>
            <Typography variant="body2">
                {I18n.t('%s of %s devices', visible.length, detection?.devices.length || 0)}
            </Typography>
        </>
    );

    const renderDevices = (): React.JSX.Element => (
        <>
            <Typography
                variant="body2"
                style={styles.hint}
            >
                {I18n.t('Every device that is ticked becomes a widget. Its name becomes the title of the widget.')}
            </Typography>
            {byGroup.map(entry => {
                const checkedCount = entry.devices.filter(device => !unchecked[device.id]).length;
                return (
                    <Accordion
                        key={entry.group.id || '__none__'}
                        defaultExpanded={byGroup.length < 6}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <div style={styles.groupSummary}>
                                <Checkbox
                                    checked={checkedCount === entry.devices.length}
                                    indeterminate={!!checkedCount && checkedCount < entry.devices.length}
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => toggleGroup(entry.devices, e.target.checked)}
                                />
                                {entry.group.icon ? (
                                    <Icon
                                        src={entry.group.icon}
                                        style={styles.deviceIcon}
                                    />
                                ) : null}
                                <Typography>{entry.group.name || withoutGroupName}</Typography>
                                <Typography style={styles.hint}>
                                    {checkedCount} / {entry.devices.length}
                                </Typography>
                            </div>
                        </AccordionSummary>
                        <AccordionDetails>
                            {entry.devices.map(device => (
                                <div
                                    key={device.id}
                                    style={styles.deviceRow}
                                >
                                    <Checkbox
                                        checked={!unchecked[device.id]}
                                        onChange={e => {
                                            const next = { ...unchecked };
                                            if (e.target.checked) {
                                                delete next[device.id];
                                            } else {
                                                next[device.id] = true;
                                            }
                                            setUnchecked(next);
                                        }}
                                    />
                                    {device.icon ? (
                                        <Icon
                                            src={device.icon}
                                            style={styles.deviceIcon}
                                        />
                                    ) : (
                                        <DeviceTypeIcon
                                            type={device.type}
                                            style={styles.deviceIcon}
                                        />
                                    )}
                                    <Tooltip
                                        title={device.id}
                                        slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                    >
                                        <TextField
                                            variant="standard"
                                            style={styles.deviceName}
                                            value={names[device.id] ?? device.name}
                                            onChange={e => setNames({ ...names, [device.id]: e.target.value })}
                                        />
                                    </Tooltip>
                                    <Typography
                                        variant="body2"
                                        style={styles.deviceType}
                                    >
                                        {typeName(device.type)}
                                    </Typography>
                                </div>
                            ))}
                        </AccordionDetails>
                    </Accordion>
                );
            })}
        </>
    );

    const renderStructure = (): React.JSX.Element => (
        <>
            <div>
                <Typography
                    variant="body2"
                    style={styles.hint}
                >
                    {I18n.t('Pages')}
                </Typography>
                <RadioGroup
                    value={pages}
                    onChange={e => setPages(e.target.value as WizardPages)}
                >
                    <FormControlLabel
                        value="single"
                        control={<Radio />}
                        label={I18n.t('One page with a section per group')}
                    />
                    <FormControlLabel
                        value="perGroup"
                        control={<Radio />}
                        label={I18n.t('One page per group, with its entry in the navigation')}
                    />
                </RadioGroup>
            </div>
            {pages === 'single' ? (
                <TextField
                    variant="standard"
                    label={I18n.t('Name of the page')}
                    value={pageName}
                    onChange={e => setPageName(e.target.value)}
                    sx={{ maxWidth: 320 }}
                />
            ) : null}
            <FormControlLabel
                control={
                    <Switch
                        checked={sectionVariant === 'panel'}
                        onChange={e => {
                            const variant = e.target.checked ? 'panel' : 'plain';
                            window.localStorage.setItem('Wizard.sectionVariant', variant);
                            setSectionVariant(variant);
                        }}
                    />
                }
                label={I18n.t('Sections look like cards')}
            />
            <FormControlLabel
                control={
                    <Switch
                        checked={standardIcons}
                        onChange={e => {
                            window.localStorage.setItem('Wizard.standardIcons', e.target.checked ? 'true' : 'false');
                            setStandardIcons(e.target.checked);
                        }}
                    />
                }
                label={I18n.t('Take the icon of the device type instead of the one of the object')}
            />
            <Typography
                variant="body2"
                style={styles.hint}
            >
                {I18n.t('The pages use the grid layout, so they fit a phone as well as a monitor.')}
            </Typography>
        </>
    );

    const renderSummary = (): React.JSX.Element => (
        <>
            <Typography>
                {I18n.t(
                    'Widgets: %s · Sections: %s · Pages: %s',
                    plan?.widgetCount || 0,
                    plan?.sectionCount || 0,
                    plan?.pages.length || 0,
                )}
            </Typography>
            {plan?.pages.map(page => (
                <div key={page.name}>
                    <Typography variant="subtitle2">{page.name}</Typography>
                    <Typography
                        variant="body2"
                        style={styles.hint}
                    >
                        {(page.settings.sections || [])
                            .map(section => `${section.title} (${section.widgets.length})`)
                            .join(', ')}
                    </Typography>
                </div>
            ))}
            {plan?.skipped.length ? (
                <Alert severity="info">
                    <Typography variant="subtitle2">{I18n.t('Passed over')}</Typography>
                    {plan.skipped.map(skip => (
                        <Typography
                            key={skip.device.id}
                            variant="body2"
                        >
                            {skip.device.name} ({typeName(skip.device.type)}) —{' '}
                            {I18n.t(
                                skip.reason === 'no-widget'
                                    ? 'no widget of vis-2 shows this kind of device yet'
                                    : 'no state that could be shown',
                            )}
                        </Typography>
                    ))}
                </Alert>
            ) : null}
            {!plan?.pages.length ? <Alert severity="warning">{I18n.t('Nothing would be created')}</Alert> : null}
        </>
    );

    const renderStep = (): React.JSX.Element | null => {
        if (error) {
            return <Alert severity="error">{error}</Alert>;
        }
        if (!detection) {
            return (
                <Box sx={{ width: '100%', mt: 4 }}>
                    <Typography style={styles.hint}>{I18n.t('Looking for devices...')}</Typography>
                    <LinearProgress
                        variant="determinate"
                        value={progress * 100}
                    />
                </Box>
            );
        }
        if (!detection.devices.length) {
            return <Alert severity="warning">{I18n.t('No devices found')}</Alert>;
        }

        switch (step) {
            case 0:
                return renderScope();
            case 1:
                return renderDevices();
            case 2:
                return renderStructure();
            default:
                return renderSummary();
        }
    };

    const last = step === STEPS.length - 1;

    return (
        <Dialog
            open={!0}
            fullWidth
            maxWidth="md"
            // a height of its own, so the steps do not make the dialog jump - and so that the buttons stay where
            // they are, which a content that grows with its list pushed out of a short window
            slotProps={{ paper: { sx: { height: 'min(720px, 100%)' } } }}
            onClose={props.onClose}
        >
            <DialogTitle>
                <WizardIcon style={{ verticalAlign: 'middle', marginRight: 8 }} />
                {I18n.t('Create pages from devices')}
            </DialogTitle>
            <DialogContent style={styles.content}>
                <Stepper activeStep={step}>
                    {STEPS.map(name => (
                        <Step key={name}>
                            <StepLabel>{I18n.t(name)}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
                {renderStep()}
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    color="grey"
                    disabled={!step || creating}
                    onClick={() => setStep(step - 1)}
                    startIcon={<BackIcon />}
                >
                    {I18n.t('Back')}
                </Button>
                {last ? (
                    <Button
                        variant="contained"
                        color="primary"
                        disabled={!plan?.pages.length || creating}
                        onClick={() => void create()}
                        startIcon={<CheckIcon />}
                    >
                        {I18n.t('Create')}
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        color="primary"
                        disabled={!detection || !detection.devices.length || !!error}
                        onClick={() => setStep(step + 1)}
                        endIcon={<NextIcon />}
                    >
                        {I18n.t('Next')}
                    </Button>
                )}
                <Button
                    variant="contained"
                    color="grey"
                    disabled={creating}
                    onClick={props.onClose}
                    startIcon={<CloseIcon />}
                >
                    {I18n.t('Cancel')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
