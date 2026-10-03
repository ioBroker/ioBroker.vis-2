import React from 'react';

import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Select,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';

import { Add as AddIcon, Close as CloseIcon, Delete as DeleteIcon, Palette as RulesIcon } from '@mui/icons-material';

import { ColorPicker, I18n, type ThemeType } from '@iobroker/gui-components';

import type { VisTheme } from '@iobroker/types-vis-2';

import { cellRules, type CellOperator, type CellRule } from './cellLook';

/** The operators a rule can be built with, in the order they are offered */
const OPERATORS: CellOperator[] = ['>', '>=', '<', '<=', '=', '!=', '*'];

export interface CellRulesDialogProps {
    /** The rules as the widget carries them: JSON, or nothing */
    value: unknown;
    theme: VisTheme;
    themeType: ThemeType;
    /** The column the rules belong to, for the title of the dialog */
    title?: string;
    /** Called with the rules as JSON, or an empty string where there are none left */
    onChange: (value: string) => void;
}

/** The word for an operator; `*` is the one that needs one */
function operatorLabel(op: CellOperator): string {
    return op === '*' ? I18n.t('otherwise') : op;
}

/**
 * The rules of a column, edited in a dialog of their own.
 *
 * Written as a string - `>25:#e05c5c;>20:#e0a23c` - this would be one field and no work. It would also be a
 * syntax to look up every time, in a panel that otherwise asks for nothing but a word and a colour. So the
 * field is a button with a count on it, and the rules are a small table: a condition, a value, two colours,
 * and a row that catches everything else.
 *
 * The order is the order they are tried in, first one wins, which is how such a list is read aloud.
 *
 * @param props - the rules, the theme and what to do with the result
 */
export default function CellRulesDialog(props: CellRulesDialogProps): React.JSX.Element {
    const [open, setOpen] = React.useState(false);
    const [rules, setRules] = React.useState<CellRule[]>([]);

    /** The rules are read when the dialog opens, so a cancel is simply not writing them back */
    const start = (): void => {
        setRules(cellRules(props.value).map(rule => ({ ...rule })));
        setOpen(true);
    };

    const change = (index: number, part: Partial<CellRule>): void =>
        setRules(rules.map((rule, at) => (at === index ? { ...rule, ...part } : rule)));

    const save = (): void => {
        // a rule without a colour of either kind would do nothing, and an empty list is no setting at all
        const kept = rules.filter(rule => rule.color || rule.background);
        props.onChange(kept.length ? JSON.stringify(kept) : '');
        setOpen(false);
    };

    const count = cellRules(props.value).length;

    const row = (rule: CellRule, index: number): React.JSX.Element => (
        <div
            key={index}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}
        >
            <Select
                variant="standard"
                value={rule.op}
                onChange={e => change(index, { op: e.target.value })}
                sx={{ width: 110, flexShrink: 0 }}
            >
                {OPERATORS.map(op => (
                    <MenuItem
                        key={op}
                        value={op}
                    >
                        {operatorLabel(op)}
                    </MenuItem>
                ))}
            </Select>
            <TextField
                variant="standard"
                value={rule.value ?? ''}
                disabled={rule.op === '*'}
                placeholder={I18n.t('Value')}
                onChange={e => change(index, { value: e.target.value })}
                sx={{ width: 120, flexShrink: 0 }}
            />
            <ColorPicker
                theme={props.theme}
                value={rule.color || ''}
                label={I18n.t('Colour')}
                onChange={color => change(index, { color })}
                style={{ flex: 1, minWidth: 120 }}
            />
            <ColorPicker
                theme={props.theme}
                value={rule.background || ''}
                label={I18n.t('Background')}
                onChange={color => change(index, { background: color })}
                style={{ flex: 1, minWidth: 120 }}
            />
            <IconButton
                size="small"
                onClick={() => setRules(rules.filter((_, at) => at !== index))}
            >
                <DeleteIcon fontSize="small" />
            </IconButton>
        </div>
    );

    return (
        <>
            <Tooltip
                title={I18n.t('A colour per condition, the first that holds wins')}
                slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
            >
                <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    startIcon={<RulesIcon />}
                    onClick={start}
                >
                    {count ? I18n.t('%s rules', count) : I18n.t('Colour by value')}
                </Button>
            </Tooltip>
            {open ? (
                <Dialog
                    open
                    fullWidth
                    maxWidth="md"
                    onClose={() => setOpen(false)}
                >
                    <DialogTitle>
                        {props.title ? I18n.t('Colour by value: %s', props.title) : I18n.t('Colour by value')}
                    </DialogTitle>
                    <DialogContent>
                        {rules.length ? (
                            rules.map(row)
                        ) : (
                            <Typography
                                variant="body2"
                                style={{ opacity: 0.7, marginBottom: 8 }}
                            >
                                {I18n.t('No rule yet. Without one the column keeps the colours of the theme.')}
                            </Typography>
                        )}
                        <Button
                            startIcon={<AddIcon />}
                            onClick={() => setRules([...rules, { op: rules.length ? '*' : '>', value: '' }])}
                        >
                            {I18n.t('Rule')}
                        </Button>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={save}
                        >
                            {I18n.t('Apply')}
                        </Button>
                        <Button
                            variant="contained"
                            color="grey"
                            startIcon={<CloseIcon />}
                            onClick={() => setOpen(false)}
                        >
                            {I18n.t('Cancel')}
                        </Button>
                    </DialogActions>
                </Dialog>
            ) : null}
        </>
    );
}
