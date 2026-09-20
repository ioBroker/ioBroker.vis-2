import React from 'react';

import { Box, Tooltip } from '@mui/material';
import { alpha, useTheme, type Theme } from '@mui/material/styles';

import { HELP_IMAGES, HELP_IMAGE_HEIGHT, HELP_IMAGE_WIDTH, type HelpColors } from './helpImages';

interface FieldHelpProps {
    /** The key of the picture in HELP_IMAGES */
    image?: string;
    /** The explanation, already translated */
    text?: string;
    /** What shows the help when hovered - the label of the field; it must be able to hold a ref */
    children: React.ReactElement;
}

function getHelpColors(theme: Theme): HelpColors {
    const text = theme.palette.text.primary;
    const accent = theme.palette.primary.main;
    return {
        paper: theme.palette.background.paper,
        line: alpha(text, 0.55),
        area: alpha(text, 0.07),
        item: alpha(text, 0.22),
        accent,
        accentArea: alpha(accent, 0.3),
        text,
    };
}

/** Whether a field has something to explain, so that its label can show the info icon */
export function hasFieldHelp(image: string | undefined, text: string | undefined): boolean {
    return !!text || (!!image && !!HELP_IMAGES[image]);
}

/**
 * Shows the picture that explains a field (see helpImages.tsx) and its explanation in a tooltip on its label.
 * The tooltip is drawn on the paper of the theme and not in the dark default of MUI, so that the picture can be in
 * the colors of the editor.
 */
export default function FieldHelp(props: FieldHelpProps): React.JSX.Element {
    const theme = useTheme();
    const image = props.image ? HELP_IMAGES[props.image] : undefined;
    if (!image && !props.text) {
        return props.children;
    }

    return (
        <Tooltip
            // the attributes are on the right side of the editor, so the help opens over the view
            placement="left"
            enterDelay={300}
            enterNextDelay={300}
            title={
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {image ? (
                        <svg
                            width={HELP_IMAGE_WIDTH}
                            height={HELP_IMAGE_HEIGHT}
                            viewBox={`0 0 ${HELP_IMAGE_WIDTH} ${HELP_IMAGE_HEIGHT}`}
                            style={{ display: 'block' }}
                        >
                            {image(getHelpColors(theme))}
                        </svg>
                    ) : null}
                    {props.text ? <div>{props.text}</div> : null}
                </Box>
            }
            slotProps={{
                popper: { sx: { pointerEvents: 'none' } },
                tooltip: {
                    sx: {
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                        border: 1,
                        borderColor: 'divider',
                        boxShadow: 6,
                        // the picture plus the padding
                        maxWidth: HELP_IMAGE_WIDTH + 20,
                        p: 1.25,
                        fontSize: 12,
                        lineHeight: 1.4,
                    },
                },
            }}
        >
            {props.children}
        </Tooltip>
    );
}
