import React from 'react';

import { I18n } from '@iobroker/gui-components';

/**
 * The pictures that explain a field of the attributes, shown in the tooltip of its label (see FieldHelp.tsx).
 *
 * They are drawn as SVG in the colors of the editor theme, so they fit the dark and the light theme alike, and
 * they share one language: the view and the sections are light areas, widgets and cells are solid, and what the
 * field sets is drawn in the accent color. Words in a picture are either CSS keywords or come from the catalog.
 */

export interface HelpColors {
    /** the background of the tooltip; laid under a translucent fill, so that it hides what lies below */
    paper: string;
    /** outlines */
    line: string;
    /** the areas of views and sections */
    area: string;
    /** widgets and cells */
    item: string;
    /** what the field sets */
    accent: string;
    /** the areas the field sets */
    accentArea: string;
    /** labels */
    text: string;
}

/** Draws into a box of HELP_IMAGE_WIDTH x HELP_IMAGE_HEIGHT */
export type HelpImage = (c: HelpColors) => React.JSX.Element;

export const HELP_IMAGE_WIDTH = 240;
export const HELP_IMAGE_HEIGHT = 140;

interface RectProps {
    x: number;
    y: number;
    w: number;
    h: number;
    fill?: string;
    stroke?: string;
    r?: number;
    dash?: boolean;
    sw?: number;
    opacity?: number;
    /** paint this color first, so that a translucent fill covers what lies below */
    under?: string;
}

function Rect(props: RectProps): React.JSX.Element {
    const { x, y, w, h, r = 2 } = props;
    const rect = (
        <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx={r}
            fill={props.fill || 'none'}
            stroke={props.stroke || 'none'}
            strokeWidth={props.sw || 1}
            strokeDasharray={props.dash ? '4 3' : undefined}
            opacity={props.opacity}
        />
    );
    if (!props.under) {
        return rect;
    }
    return (
        <>
            <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={r}
                fill={props.under}
            />
            {rect}
        </>
    );
}

function Label(props: {
    x: number;
    y: number;
    text: string;
    color: string;
    size?: number;
    anchor?: 'start' | 'middle' | 'end';
    /** a longer text - a translation may be - is squeezed into this width */
    maxWidth?: number;
}): React.JSX.Element {
    const size = props.size || 11;
    // roughly the width of the text; only used to decide whether to squeeze it
    const tooLong = !!props.maxWidth && props.text.length * size * 0.55 > props.maxWidth;
    return (
        <text
            x={props.x}
            y={props.y}
            fill={props.color}
            fontSize={size}
            fontFamily="sans-serif"
            textAnchor={props.anchor || 'middle'}
            textLength={tooLong ? props.maxWidth : undefined}
            lengthAdjust={tooLong ? 'spacingAndGlyphs' : undefined}
        >
            {props.text}
        </text>
    );
}

/** A horizontal dimension line with arrows at both ends */
function DimH(props: {
    x1: number;
    x2: number;
    y: number;
    color: string;
    label?: string;
    below?: boolean;
}): React.JSX.Element {
    const { x1, x2, y, color } = props;
    return (
        <g
            stroke={color}
            fill={color}
        >
            <line
                x1={x1}
                y1={y}
                x2={x2}
                y2={y}
                strokeWidth={1.5}
            />
            <line
                x1={x1}
                y1={y - 5}
                x2={x1}
                y2={y + 5}
            />
            <line
                x1={x2}
                y1={y - 5}
                x2={x2}
                y2={y + 5}
            />
            <path
                stroke="none"
                d={`M${x1} ${y}l6 -3.5v7z`}
            />
            <path
                stroke="none"
                d={`M${x2} ${y}l-6 -3.5v7z`}
            />
            {props.label ? (
                <g stroke="none">
                    <Label
                        x={(x1 + x2) / 2}
                        y={props.below ? y + 14 : y - 5}
                        text={props.label}
                        color={color}
                    />
                </g>
            ) : null}
        </g>
    );
}

/** A vertical dimension line with arrows at both ends */
function DimV(props: {
    y1: number;
    y2: number;
    x: number;
    color: string;
    label?: string;
    left?: boolean;
}): React.JSX.Element {
    const { y1, y2, x, color } = props;
    return (
        <g
            stroke={color}
            fill={color}
        >
            <line
                x1={x}
                y1={y1}
                x2={x}
                y2={y2}
                strokeWidth={1.5}
            />
            <line
                x1={x - 5}
                y1={y1}
                x2={x + 5}
                y2={y1}
            />
            <line
                x1={x - 5}
                y1={y2}
                x2={x + 5}
                y2={y2}
            />
            <path
                stroke="none"
                d={`M${x} ${y1}l-3.5 6h7z`}
            />
            <path
                stroke="none"
                d={`M${x} ${y2}l-3.5 -6h7z`}
            />
            {props.label ? (
                <g stroke="none">
                    <Label
                        x={props.left ? x - 8 : x + 8}
                        y={(y1 + y2) / 2 + 4}
                        text={props.label}
                        color={color}
                        anchor={props.left ? 'end' : 'start'}
                    />
                </g>
            ) : null}
        </g>
    );
}

/** Cells of a grid - the widgets of a section */
function Cells(props: {
    x: number;
    y: number;
    w: number;
    h: number;
    cols: number;
    rows: number;
    c: HelpColors;
    gap?: number;
    fill?: string;
    stroke?: string;
}): React.JSX.Element {
    const gap = props.gap ?? 4;
    const w = (props.w - gap * (props.cols - 1)) / props.cols;
    const h = (props.h - gap * (props.rows - 1)) / props.rows;
    const cells: React.JSX.Element[] = [];
    for (let row = 0; row < props.rows; row++) {
        for (let col = 0; col < props.cols; col++) {
            cells.push(
                <Rect
                    key={`${row}_${col}`}
                    x={props.x + col * (w + gap)}
                    y={props.y + row * (h + gap)}
                    w={w}
                    h={h}
                    fill={props.fill || props.c.item}
                    stroke={props.stroke}
                    under={props.c.paper}
                />,
            );
        }
    }
    return <>{cells}</>;
}

/** A section of the grid layout: a dashed area with cells */
function Section(props: {
    x: number;
    y: number;
    w: number;
    h: number;
    c: HelpColors;
    cols?: number;
    rows?: number;
    stroke?: string;
    fill?: string;
    label?: string;
}): React.JSX.Element {
    const { x, y, w, h, c } = props;
    return (
        <>
            <Rect
                x={x}
                y={y}
                w={w}
                h={h}
                r={5}
                fill={props.fill || c.area}
                stroke={props.stroke || c.line}
                dash
                under={c.paper}
            />
            {props.cols && props.rows ? (
                <Cells
                    x={x + 5}
                    y={y + 5}
                    w={w - 10}
                    h={h - 10}
                    cols={props.cols}
                    rows={props.rows}
                    c={c}
                />
            ) : null}
            {props.label ? (
                <Label
                    x={x + w / 2}
                    y={y + h / 2 + 7}
                    text={props.label}
                    color={props.stroke || c.text}
                    size={18}
                />
            ) : null}
        </>
    );
}

/** The outline of a view or a screen */
function Frame(props: {
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    c: HelpColors;
    fill?: string;
}): React.JSX.Element {
    return (
        <Rect
            x={props.x ?? 2}
            y={props.y ?? 2}
            w={props.w ?? 236}
            h={props.h ?? 136}
            r={4}
            fill={props.fill || props.c.area}
            stroke={props.c.line}
            under={props.c.paper}
        />
    );
}

/** An arrow head at x/y pointing into `angle` degrees (0 = to the right) */
function ArrowHead(props: { x: number; y: number; angle: number; color: string }): React.JSX.Element {
    return (
        <path
            d="M0 0l-8 -4.5v9z"
            fill={props.color}
            transform={`translate(${props.x} ${props.y}) rotate(${props.angle})`}
        />
    );
}

function Checkbox(props: { x: number; y: number; checked: boolean; c: HelpColors }): React.JSX.Element {
    return (
        <>
            <Rect
                x={props.x}
                y={props.y}
                w={12}
                h={12}
                fill={props.checked ? props.c.accent : 'none'}
                stroke={props.checked ? props.c.accent : props.c.line}
                sw={1.5}
            />
            {props.checked ? (
                <path
                    d={`M${props.x + 2.5} ${props.y + 6}l2.5 3l4.5 -6`}
                    stroke={props.c.paper}
                    strokeWidth={1.8}
                    fill="none"
                />
            ) : null}
        </>
    );
}

// ---------------------------------------------------------------------------------------------------------------
// the column layout of the relative widgets

/** The heights of the widgets in the three columns */
const COLUMNS = [
    [26, 36, 28],
    [40, 22, 26],
    [20, 30, 36],
];
const COLUMN_GAP = 7;

function columnWidgets(
    c: HelpColors,
    what?: 'columnWidth' | 'columnGap' | 'rowGap',
): { widgets: React.JSX.Element[]; gaps: React.JSX.Element[] } {
    const widgets: React.JSX.Element[] = [];
    const gaps: React.JSX.Element[] = [];
    COLUMNS.forEach((heights, col) => {
        const x = 10 + col * 76;
        let y = 10;
        heights.forEach((h, row) => {
            widgets.push(
                <Rect
                    key={`${col}_${row}`}
                    x={x}
                    y={y}
                    w={68}
                    h={h}
                    fill={c.item}
                    under={c.paper}
                />,
            );
            y += h;
            if (what === 'rowGap' && row < heights.length - 1) {
                gaps.push(
                    <Rect
                        key={`gap_${col}_${row}`}
                        x={x}
                        y={y}
                        w={68}
                        h={COLUMN_GAP}
                        r={0}
                        fill={c.accentArea}
                    />,
                );
            }
            y += COLUMN_GAP;
        });
        if (what === 'columnGap' && col < COLUMNS.length - 1) {
            gaps.push(
                <Rect
                    key={`gap_${col}`}
                    x={x + 68}
                    y={10}
                    w={8}
                    h={104}
                    r={0}
                    fill={c.accentArea}
                />,
            );
        }
    });
    return { widgets, gaps };
}

function columnsImage(c: HelpColors, what: 'columnWidth' | 'columnGap' | 'rowGap'): React.JSX.Element {
    const { widgets, gaps } = columnWidgets(c, what);
    return (
        <>
            <Frame
                h={116}
                c={c}
            />
            {widgets}
            {gaps}
            {what === 'columnWidth' ? (
                <>
                    <Rect
                        x={7}
                        y={7}
                        w={74}
                        h={108}
                        r={3}
                        stroke={c.accent}
                        sw={1.5}
                        dash
                    />
                    <DimH
                        x1={10}
                        x2={78}
                        y={128}
                        color={c.accent}
                    />
                </>
            ) : null}
        </>
    );
}

// ---------------------------------------------------------------------------------------------------------------
// the grid layout with sections

function sectionWidthImage(c: HelpColors, which: 'min' | 'max'): React.JSX.Element {
    if (which === 'min') {
        return (
            <>
                <Frame
                    w={150}
                    h={104}
                    c={c}
                />
                <Section
                    x={10}
                    y={10}
                    w={64}
                    h={88}
                    cols={2}
                    rows={3}
                    c={c}
                />
                <Section
                    x={80}
                    y={10}
                    w={64}
                    h={88}
                    cols={2}
                    rows={3}
                    c={c}
                />
                <DimH
                    x1={10}
                    x2={74}
                    y={118}
                    color={c.accent}
                    label="min"
                    below
                />
                <Frame
                    x={164}
                    w={74}
                    c={c}
                />
                <Section
                    x={170}
                    y={8}
                    w={62}
                    h={60}
                    cols={2}
                    rows={2}
                    c={c}
                />
                <Section
                    x={170}
                    y={74}
                    w={62}
                    h={58}
                    cols={2}
                    rows={2}
                    c={c}
                />
            </>
        );
    }
    return (
        <>
            <Frame
                h={108}
                c={c}
            />
            <Rect
                x={8}
                y={8}
                w={26}
                h={96}
                stroke={c.line}
                dash
            />
            <Rect
                x={206}
                y={8}
                w={26}
                h={96}
                stroke={c.line}
                dash
            />
            <Section
                x={40}
                y={8}
                w={78}
                h={96}
                cols={2}
                rows={3}
                c={c}
            />
            <Section
                x={122}
                y={8}
                w={78}
                h={96}
                cols={2}
                rows={3}
                c={c}
            />
            <DimH
                x1={40}
                x2={118}
                y={120}
                color={c.accent}
                label="max"
                below
            />
        </>
    );
}

const maxSectionsImage: HelpImage = c => (
    <>
        <Frame c={c} />
        {[0, 1, 2].map(i => (
            <Section
                key={i}
                x={10 + i * 76}
                y={10}
                w={68}
                h={56}
                label={(i + 1).toString()}
                c={c}
            />
        ))}
        <Section
            x={10}
            y={74}
            w={68}
            h={56}
            label="4"
            fill={c.accentArea}
            stroke={c.accent}
            c={c}
        />
        <path
            d="M196 70C196 100 130 102 88 102"
            stroke={c.accent}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            fill="none"
        />
        <ArrowHead
            x={84}
            y={102}
            angle={180}
            color={c.accent}
        />
    </>
);

const sectionGapImage: HelpImage = c => (
    <>
        <Frame c={c} />
        <Rect
            x={114}
            y={10}
            w={12}
            h={120}
            r={0}
            fill={c.accentArea}
        />
        <Rect
            x={10}
            y={66}
            w={220}
            h={12}
            r={0}
            fill={c.accentArea}
        />
        <Section
            x={10}
            y={10}
            w={104}
            h={56}
            cols={3}
            rows={2}
            c={c}
        />
        <Section
            x={126}
            y={10}
            w={104}
            h={56}
            cols={3}
            rows={2}
            c={c}
        />
        <Section
            x={10}
            y={78}
            w={104}
            h={52}
            cols={3}
            rows={2}
            c={c}
        />
        <Section
            x={126}
            y={78}
            w={104}
            h={52}
            cols={3}
            rows={2}
            c={c}
        />
    </>
);

const gridRowHeightImage: HelpImage = c => (
    <>
        <Rect
            x={10}
            y={8}
            w={190}
            h={124}
            r={5}
            fill={c.area}
            stroke={c.line}
            dash
        />
        <Cells
            x={16}
            y={14}
            w={178}
            h={100 / 3}
            cols={4}
            rows={1}
            gap={6}
            fill={c.accentArea}
            stroke={c.accent}
            c={c}
        />
        <Cells
            x={16}
            y={14 + 100 / 3 + 6}
            w={178}
            h={200 / 3 + 6}
            cols={4}
            rows={2}
            gap={6}
            c={c}
        />
        <DimV
            y1={14}
            y2={14 + 100 / 3}
            x={214}
            color={c.accent}
        />
    </>
);

const gridGapImage: HelpImage = c => (
    <>
        <Frame
            c={c}
            fill={c.accentArea}
        />
        <Cells
            x={14}
            y={14}
            w={212}
            h={112}
            cols={4}
            rows={3}
            gap={10}
            c={c}
        />
        <Rect
            x={14}
            y={14}
            w={212}
            h={112}
            r={3}
            stroke={c.line}
            dash
        />
    </>
);

function densePanel(c: HelpColors, ox: number, dense: boolean): React.JSX.Element {
    return (
        <>
            <Frame
                x={ox}
                w={114}
                h={108}
                c={c}
            />
            <Section
                x={ox + 8}
                y={10}
                w={30}
                h={44}
                label="1"
                c={c}
            />
            <Section
                x={ox + 44}
                y={10}
                w={30}
                h={44}
                label="2"
                c={c}
            />
            <Section
                x={ox + 8}
                y={60}
                w={66}
                h={44}
                label="3"
                c={c}
            />
            {dense ? (
                <Section
                    x={ox + 80}
                    y={10}
                    w={30}
                    h={44}
                    label="4"
                    fill={c.accentArea}
                    stroke={c.accent}
                    c={c}
                />
            ) : (
                <>
                    <Rect
                        x={ox + 80}
                        y={10}
                        w={30}
                        h={44}
                        r={5}
                        stroke={c.accent}
                        dash
                    />
                    <Section
                        x={ox + 80}
                        y={60}
                        w={30}
                        h={44}
                        label="4"
                        c={c}
                    />
                </>
            )}
            <Checkbox
                x={ox + 51}
                y={120}
                checked={dense}
                c={c}
            />
        </>
    );
}

const denseSectionsImage: HelpImage = c => (
    <>
        {densePanel(c, 2, false)}
        {densePanel(c, 124, true)}
    </>
);

const layoutImage: HelpImage = c => {
    const { widgets } = columnWidgets(c);
    return (
        <>
            <Frame
                w={114}
                h={116}
                c={c}
            />
            {/* the columns of the column layout, shrunk into the left half */}
            <g transform="translate(2 1) scale(0.47 1)">{widgets}</g>
            <Frame
                x={124}
                w={114}
                h={116}
                c={c}
            />
            <Section
                x={130}
                y={10}
                w={102}
                h={50}
                cols={3}
                rows={2}
                c={c}
            />
            <Section
                x={130}
                y={66}
                w={48}
                h={46}
                cols={1}
                rows={2}
                c={c}
            />
            <Section
                x={184}
                y={66}
                w={48}
                h={46}
                cols={2}
                rows={2}
                c={c}
            />
            <Label
                x={59}
                y={134}
                text={I18n.t('Columns')}
                color={c.text}
                maxWidth={112}
            />
            <Label
                x={181}
                y={134}
                text={I18n.t('Grid with sections')}
                color={c.text}
                maxWidth={112}
            />
        </>
    );
};

// ---------------------------------------------------------------------------------------------------------------
// other settings of the view

const snapGridImage: HelpImage = c => {
    const lines: React.JSX.Element[] = [];
    for (let x = 18; x < 238; x += 16) {
        lines.push(
            <line
                key={`x${x}`}
                x1={x}
                y1={2}
                x2={x}
                y2={138}
            />,
        );
    }
    for (let y = 18; y < 138; y += 16) {
        lines.push(
            <line
                key={`y${y}`}
                x1={2}
                y1={y}
                x2={238}
                y2={y}
            />,
        );
    }
    return (
        <>
            <Frame c={c} />
            <g
                stroke={c.line}
                opacity={0.35}
            >
                {lines}
            </g>
            <Rect
                x={50}
                y={34}
                w={80}
                h={48}
                fill={c.item}
                stroke={c.line}
                under={c.paper}
            />
            <Rect
                x={146}
                y={82}
                w={16}
                h={16}
                r={0}
                fill={c.accentArea}
                stroke={c.accent}
            />
            <DimH
                x1={146}
                x2={162}
                y={112}
                color={c.accent}
            />
        </>
    );
};

const limitScreenImage: HelpImage = c => (
    <>
        <Frame
            c={c}
            fill={c.item}
        />
        <Rect
            x={86}
            y={8}
            w={68}
            h={124}
            r={6}
            fill={c.area}
            stroke={c.accent}
            sw={2.5}
            under={c.paper}
        />
        <Rect
            x={92}
            y={16}
            w={56}
            h={20}
            fill={c.item}
        />
        <Rect
            x={92}
            y={42}
            w={26}
            h={26}
            fill={c.item}
        />
        <Rect
            x={122}
            y={42}
            w={26}
            h={26}
            fill={c.item}
        />
        <Rect
            x={92}
            y={74}
            w={56}
            h={50}
            fill={c.item}
        />
    </>
);

function menuEntries(c: HelpColors, x: number, y: number, withText: boolean, color?: string): React.JSX.Element[] {
    const entries: React.JSX.Element[] = [];
    for (let i = 0; i < 5; i++) {
        entries.push(
            <g key={i}>
                <circle
                    cx={x + 6}
                    cy={y + i * 20}
                    r={5}
                    fill={color || c.item}
                />
                {withText ? (
                    <Rect
                        x={x + 16}
                        y={y + i * 20 - 3}
                        w={32}
                        h={6}
                        fill={color || c.item}
                    />
                ) : null}
            </g>,
        );
    }
    return entries;
}

function Hamburger(props: { x: number; y: number; color: string }): React.JSX.Element {
    return (
        <g
            stroke={props.color}
            strokeWidth={2}
        >
            {[0, 4, 8].map(dy => (
                <line
                    key={dy}
                    x1={props.x}
                    y1={props.y + dy}
                    x2={props.x + 12}
                    y2={props.y + dy}
                />
            ))}
        </g>
    );
}

function navigationImage(c: HelpColors, what: 'menu' | 'width' | 'hide' | 'bar'): React.JSX.Element {
    const menuShown = what !== 'hide';
    const barAccent = what === 'bar' || what === 'hide';
    return (
        <>
            <Frame c={c} />
            <Rect
                x={2}
                y={2}
                w={236}
                h={20}
                r={0}
                fill={barAccent ? c.accentArea : c.item}
                stroke={barAccent ? c.accent : undefined}
            />
            <Hamburger
                x={8}
                y={8}
                color={barAccent ? c.accent : c.line}
            />
            {menuShown ? (
                <>
                    <Rect
                        x={2}
                        y={22}
                        w={62}
                        h={116}
                        r={0}
                        fill={what === 'bar' ? c.item : c.accentArea}
                        stroke={what === 'bar' ? undefined : c.accent}
                    />
                    {menuEntries(c, 8, 36, true, what === 'bar' ? c.line : c.accent)}
                </>
            ) : (
                <Rect
                    x={2}
                    y={22}
                    w={62}
                    h={116}
                    r={0}
                    stroke={c.line}
                    dash
                />
            )}
            <Cells
                x={menuShown ? 72 : 10}
                y={30}
                w={menuShown ? 158 : 220}
                h={100}
                cols={3}
                rows={2}
                c={c}
            />
            {what === 'width' ? (
                <DimH
                    x1={2}
                    x2={64}
                    y={130}
                    color={c.accent}
                />
            ) : null}
        </>
    );
}

const navigationOrientationImage: HelpImage = c => (
    <>
        <Frame
            w={114}
            h={116}
            c={c}
        />
        <Rect
            x={2}
            y={2}
            w={34}
            h={116}
            r={0}
            fill={c.accentArea}
            stroke={c.accent}
        />
        {[0, 1, 2, 3, 4].map(i => (
            <circle
                key={i}
                cx={19}
                cy={18 + i * 20}
                r={5}
                fill={c.accent}
            />
        ))}
        <Cells
            x={42}
            y={10}
            w={68}
            h={100}
            cols={2}
            rows={3}
            c={c}
        />
        <Frame
            x={124}
            w={114}
            h={116}
            c={c}
        />
        <Rect
            x={124}
            y={2}
            w={114}
            h={20}
            r={0}
            fill={c.accentArea}
            stroke={c.accent}
        />
        {[0, 1, 2, 3, 4].map(i => (
            <circle
                key={i}
                cx={138 + i * 22}
                cy={12}
                r={5}
                fill={c.accent}
            />
        ))}
        <Cells
            x={130}
            y={28}
            w={102}
            h={84}
            cols={3}
            rows={2}
            c={c}
        />
        <Label
            x={59}
            y={134}
            text={I18n.t('Vertical')}
            color={c.text}
            maxWidth={112}
        />
        <Label
            x={181}
            y={134}
            text={I18n.t('Horizontal')}
            color={c.text}
            maxWidth={112}
        />
    </>
);

function horizontalMenu(c: HelpColors, y: number, onlyIcons: boolean): React.JSX.Element {
    const color = onlyIcons ? c.accent : c.line;
    return (
        <>
            <Frame
                y={y}
                h={56}
                c={c}
            />
            <Rect
                x={2}
                y={y}
                w={236}
                h={22}
                r={0}
                fill={onlyIcons ? c.accentArea : c.item}
                stroke={onlyIcons ? c.accent : undefined}
            />
            {[0, 1, 2, 3].map(i => (
                <g key={i}>
                    <circle
                        cx={onlyIcons ? 16 + i * 22 : 16 + i * 56}
                        cy={y + 11}
                        r={5}
                        fill={color}
                    />
                    {onlyIcons ? null : (
                        <Rect
                            x={26 + i * 56}
                            y={y + 8}
                            w={30}
                            h={6}
                            fill={color}
                        />
                    )}
                </g>
            ))}
            <Cells
                x={8}
                y={y + 28}
                w={224}
                h={22}
                cols={4}
                rows={1}
                c={c}
            />
            <Checkbox
                x={222}
                y={y + 5}
                checked={onlyIcons}
                c={c}
            />
        </>
    );
}

const navigationOnlyIconImage: HelpImage = c => (
    <>
        {horizontalMenu(c, 4, false)}
        {horizontalMenu(c, 80, true)}
    </>
);

// ---------------------------------------------------------------------------------------------------------------
// the look of a section and of a widget

function sectionHeaderImage(c: HelpColors, what: 'title' | 'icon'): React.JSX.Element {
    return (
        <>
            <Rect
                x={20}
                y={10}
                w={200}
                h={120}
                r={8}
                fill={c.area}
                stroke={c.line}
                dash
            />
            <circle
                cx={38}
                cy={30}
                r={9}
                fill={what === 'icon' ? c.accent : c.item}
            />
            <Rect
                x={54}
                y={25}
                w={90}
                h={10}
                r={3}
                fill={what === 'title' ? c.accent : c.item}
            />
            <Cells
                x={28}
                y={48}
                w={184}
                h={74}
                cols={3}
                rows={2}
                c={c}
            />
        </>
    );
}

const sectionLookImage: HelpImage = c => (
    <>
        <Rect
            x={8}
            y={10}
            w={104}
            h={104}
            r={5}
            stroke={c.line}
            dash
        />
        <Cells
            x={14}
            y={16}
            w={92}
            h={92}
            cols={2}
            rows={2}
            c={c}
        />
        {/* the shadow of the panel */}
        <Rect
            x={130}
            y={13}
            w={104}
            h={104}
            r={12}
            fill={c.text}
            opacity={0.12}
        />
        <Rect
            x={131}
            y={15}
            w={104}
            h={104}
            r={12}
            fill={c.text}
            opacity={0.08}
        />
        <Rect
            x={128}
            y={10}
            w={104}
            h={104}
            r={12}
            fill={c.accentArea}
            stroke={c.accent}
            under={c.paper}
        />
        <Cells
            x={140}
            y={22}
            w={80}
            h={80}
            cols={2}
            rows={2}
            c={c}
        />
        <Label
            x={60}
            y={134}
            text={I18n.t('Plain')}
            color={c.text}
            maxWidth={112}
        />
        <Label
            x={180}
            y={134}
            text={I18n.t('Panel')}
            color={c.text}
            maxWidth={112}
        />
    </>
);

const backgroundImage: HelpImage = c => (
    <>
        <Rect
            x={20}
            y={10}
            w={200}
            h={120}
            r={8}
            fill={c.accentArea}
            stroke={c.accent}
            under={c.paper}
        />
        <Cells
            x={32}
            y={22}
            w={176}
            h={96}
            cols={3}
            rows={2}
            c={c}
        />
    </>
);

const borderImage: HelpImage = c => (
    <>
        <Rect
            x={18}
            y={18}
            w={116}
            h={104}
            r={4}
            fill={c.area}
            stroke={c.accent}
            sw={5}
        />
        <g
            stroke={c.accent}
            fill="none"
        >
            <line
                x1={158}
                y1={32}
                x2={228}
                y2={32}
                strokeWidth={3}
            />
            <line
                x1={158}
                y1={58}
                x2={228}
                y2={58}
                strokeWidth={3}
                strokeDasharray="8 5"
            />
            <line
                x1={158}
                y1={84}
                x2={228}
                y2={84}
                strokeWidth={3.5}
                strokeDasharray="0.1 6"
                strokeLinecap="round"
            />
            <line
                x1={158}
                y1={107}
                x2={228}
                y2={107}
                strokeWidth={1.5}
            />
            <line
                x1={158}
                y1={113}
                x2={228}
                y2={113}
                strokeWidth={1.5}
            />
        </g>
    </>
);

const borderRadiusImage: HelpImage = c => (
    <>
        <Rect
            x={30}
            y={20}
            w={180}
            h={100}
            r={30}
            fill={c.area}
            stroke={c.line}
            sw={1.5}
        />
        <path
            d="M30 50A30 30 0 0 1 60 20"
            stroke={c.accent}
            strokeWidth={3}
            fill="none"
        />
        <g
            stroke={c.accent}
            strokeDasharray="3 2"
        >
            <line
                x1={60}
                y1={50}
                x2={60}
                y2={20}
            />
            <line
                x1={60}
                y1={50}
                x2={30}
                y2={50}
            />
        </g>
        <Label
            x={68}
            y={42}
            text="r"
            color={c.accent}
            anchor="start"
        />
    </>
);

type Side = 'all' | 'left' | 'top' | 'right' | 'bottom';

function paddingImage(c: HelpColors, side: Side): React.JSX.Element {
    const strips: Record<Exclude<Side, 'all'>, [number, number, number, number]> = {
        left: [30, 16, 24, 108],
        top: [30, 16, 180, 20],
        right: [186, 16, 24, 108],
        bottom: [30, 104, 180, 20],
    };
    return (
        <>
            <Rect
                x={30}
                y={16}
                w={180}
                h={108}
                r={4}
                fill={c.area}
                stroke={c.line}
                under={c.paper}
            />
            {side === 'all' ? (
                <Rect
                    x={30}
                    y={16}
                    w={180}
                    h={108}
                    r={4}
                    fill={c.accentArea}
                />
            ) : (
                <Rect
                    x={strips[side][0]}
                    y={strips[side][1]}
                    w={strips[side][2]}
                    h={strips[side][3]}
                    r={0}
                    fill={c.accentArea}
                />
            )}
            <Rect
                x={54}
                y={36}
                w={132}
                h={68}
                fill={c.item}
                under={c.paper}
            />
        </>
    );
}

function marginImage(c: HelpColors, side: Exclude<Side, 'all'>): React.JSX.Element {
    const strips: Record<Exclude<Side, 'all'>, [number, number, number, number]> = {
        left: [46, 40, 24, 60],
        top: [70, 16, 100, 24],
        right: [170, 40, 24, 60],
        bottom: [70, 100, 100, 24],
    };
    return (
        <>
            <Rect
                x={46}
                y={16}
                w={148}
                h={108}
                stroke={c.line}
                dash
            />
            <Rect
                x={strips[side][0]}
                y={strips[side][1]}
                w={strips[side][2]}
                h={strips[side][3]}
                r={0}
                fill={c.accentArea}
            />
            <Rect
                x={70}
                y={40}
                w={100}
                h={60}
                fill={c.item}
                stroke={c.line}
                under={c.paper}
            />
        </>
    );
}

const boxShadowImage: HelpImage = c => (
    <>
        {[10, 8, 6, 4].map(offset => (
            <Rect
                key={offset}
                x={70 + offset - 2}
                y={36 + offset - 2}
                w={100 + 4}
                h={64 + 4}
                r={6}
                fill={c.accent}
                opacity={0.12}
            />
        ))}
        <Rect
            x={70}
            y={36}
            w={100}
            h={64}
            r={4}
            fill={c.item}
            stroke={c.line}
            under={c.paper}
        />
    </>
);

// ---------------------------------------------------------------------------------------------------------------
// the place and the size of a widget

const positionImage: HelpImage = c => (
    <>
        <Frame
            w={114}
            h={112}
            c={c}
        />
        <Rect
            x={12}
            y={12}
            w={44}
            h={26}
            fill={c.item}
            under={c.paper}
        />
        <Rect
            x={44}
            y={46}
            w={58}
            h={30}
            fill={c.item}
            stroke={c.line}
            under={c.paper}
        />
        <Rect
            x={18}
            y={84}
            w={34}
            h={22}
            fill={c.item}
            under={c.paper}
        />
        <Frame
            x={124}
            w={114}
            h={112}
            c={c}
        />
        <Rect
            x={130}
            y={10}
            w={102}
            h={24}
            fill={c.accentArea}
            stroke={c.accent}
        />
        <Rect
            x={130}
            y={40}
            w={49}
            h={30}
            fill={c.accentArea}
            stroke={c.accent}
        />
        <Rect
            x={183}
            y={40}
            w={49}
            h={30}
            fill={c.accentArea}
            stroke={c.accent}
        />
        <Rect
            x={130}
            y={76}
            w={102}
            h={30}
            fill={c.accentArea}
            stroke={c.accent}
        />
        <Label
            x={59}
            y={132}
            text="absolute"
            color={c.text}
        />
        <Label
            x={181}
            y={132}
            text="relative"
            color={c.accent}
        />
    </>
);

const leftTopImage: HelpImage = c => (
    <>
        <Frame c={c} />
        <g
            stroke={c.line}
            strokeDasharray="3 3"
        >
            <line
                x1={96}
                y1={2}
                x2={96}
                y2={54}
            />
            <line
                x1={2}
                y1={54}
                x2={96}
                y2={54}
            />
        </g>
        <Rect
            x={96}
            y={54}
            w={100}
            h={56}
            fill={c.item}
            stroke={c.accent}
            sw={1.5}
            under={c.paper}
        />
        <DimH
            x1={2}
            x2={96}
            y={82}
            color={c.accent}
            label="left"
        />
        <DimV
            y1={2}
            y2={54}
            x={146}
            color={c.accent}
            label="top"
        />
    </>
);

const sizeImage: HelpImage = c => (
    <>
        <Rect
            x={50}
            y={16}
            w={130}
            h={84}
            fill={c.item}
            stroke={c.accent}
            sw={1.5}
            under={c.paper}
        />
        <DimH
            x1={50}
            x2={180}
            y={114}
            color={c.accent}
            label="width"
            below
        />
        <DimV
            y1={16}
            y2={100}
            x={194}
            color={c.accent}
            label="height"
        />
    </>
);

const zIndexImage: HelpImage = c => (
    <>
        <Rect
            x={30}
            y={62}
            w={100}
            h={60}
            fill={c.item}
            stroke={c.line}
            under={c.paper}
        />
        <Label
            x={50}
            y={100}
            text="1"
            color={c.text}
            size={16}
        />
        <Rect
            x={70}
            y={40}
            w={100}
            h={60}
            fill={c.item}
            stroke={c.line}
            under={c.paper}
        />
        <Label
            x={90}
            y={78}
            text="2"
            color={c.text}
            size={16}
        />
        <Rect
            x={110}
            y={18}
            w={100}
            h={60}
            fill={c.accentArea}
            stroke={c.accent}
            sw={1.5}
            under={c.paper}
        />
        <Label
            x={160}
            y={54}
            text="3"
            color={c.accent}
            size={16}
        />
    </>
);

function overflowImage(c: HelpColors, axis: 'x' | 'y'): React.JSX.Element {
    if (axis === 'x') {
        return (
            <>
                <Rect
                    x={38}
                    y={32}
                    w={172}
                    h={56}
                    stroke={c.line}
                    dash
                />
                <Rect
                    x={30}
                    y={24}
                    w={120}
                    h={84}
                    fill={c.area}
                    stroke={c.line}
                    sw={1.5}
                />
                <Rect
                    x={38}
                    y={32}
                    w={112}
                    h={56}
                    r={0}
                    fill={c.item}
                />
                <Rect
                    x={30}
                    y={98}
                    w={120}
                    h={10}
                    r={0}
                    fill={c.area}
                />
                <Rect
                    x={32}
                    y={100}
                    w={76}
                    h={6}
                    r={3}
                    fill={c.accent}
                />
            </>
        );
    }
    return (
        <>
            <Rect
                x={68}
                y={18}
                w={96}
                h={116}
                stroke={c.line}
                dash
            />
            <Rect
                x={60}
                y={10}
                w={120}
                h={84}
                fill={c.area}
                stroke={c.line}
                sw={1.5}
            />
            <Rect
                x={68}
                y={18}
                w={96}
                h={76}
                r={0}
                fill={c.item}
            />
            <Rect
                x={170}
                y={10}
                w={10}
                h={84}
                r={0}
                fill={c.area}
            />
            <Rect
                x={172}
                y={12}
                w={6}
                h={48}
                r={3}
                fill={c.accent}
            />
        </>
    );
}

const opacityImage: HelpImage = c => {
    const squares: React.JSX.Element[] = [];
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 22; col++) {
            if ((row + col) % 2 === 0) {
                squares.push(
                    <rect
                        key={`${row}_${col}`}
                        x={10 + col * 10}
                        y={10 + row * 10}
                        width={10}
                        height={10}
                        fill={c.item}
                    />,
                );
            }
        }
    }
    return (
        <>
            {squares}
            {[
                [30, 1],
                [95, 0.6],
                [160, 0.25],
            ].map(([x, opacity]) => (
                <g key={x}>
                    <Rect
                        x={x}
                        y={30}
                        w={50}
                        h={60}
                        fill={c.accent}
                        opacity={opacity}
                    />
                    <Label
                        x={x + 25}
                        y={128}
                        text={opacity.toString()}
                        color={c.text}
                    />
                </g>
            ))}
        </>
    );
};

const transformImage: HelpImage = c => (
    <>
        <Rect
            x={80}
            y={36}
            w={80}
            h={56}
            stroke={c.line}
            dash
        />
        <g transform="rotate(20 120 64)">
            <Rect
                x={80}
                y={36}
                w={80}
                h={56}
                fill={c.accentArea}
                stroke={c.accent}
                sw={1.5}
            />
        </g>
        <Label
            x={120}
            y={130}
            text="rotate(20deg)"
            color={c.accent}
        />
    </>
);

function widthVisibilityImage(c: HelpColors, which: 'min' | 'max'): React.JSX.Element {
    const views = [
        { x: 4, w: 44 },
        { x: 60, w: 72 },
        { x: 144, w: 92 },
    ];
    return (
        <>
            {views.map((view, i) => {
                const shown = which === 'min' ? i >= 1 : i <= 1;
                return (
                    <g key={i}>
                        <Frame
                            x={view.x}
                            y={6}
                            w={view.w}
                            h={98}
                            c={c}
                        />
                        <Rect
                            x={view.x + 5}
                            y={12}
                            w={view.w - 10}
                            h={20}
                            fill={c.item}
                        />
                        <Rect
                            x={view.x + 5}
                            y={38}
                            w={view.w - 10}
                            h={26}
                            fill={shown ? c.accentArea : undefined}
                            stroke={shown ? c.accent : c.line}
                            dash={!shown}
                        />
                    </g>
                );
            })}
            <line
                x1={4}
                y1={116}
                x2={230}
                y2={116}
                stroke={c.line}
                strokeWidth={1.5}
            />
            <ArrowHead
                x={236}
                y={116}
                angle={0}
                color={c.line}
            />
            <line
                x1={which === 'min' ? 54 : 138}
                y1={108}
                x2={which === 'min' ? 54 : 138}
                y2={124}
                stroke={c.accent}
                strokeWidth={2}
            />
            <Label
                x={which === 'min' ? 54 : 138}
                y={137}
                text={which}
                color={c.accent}
            />
        </>
    );
}

// ---------------------------------------------------------------------------------------------------------------
// the header, layout, visibility and opening of a section

/** A section with a header bar and cells, the header drawn by the caller */
function sectionBody(c: HelpColors, x: number, y: number, w: number, h: number, stroke?: string): React.JSX.Element {
    return (
        <Rect
            x={x}
            y={y}
            w={w}
            h={h}
            r={6}
            fill={c.area}
            stroke={stroke || c.line}
            dash={!stroke}
            under={c.paper}
        />
    );
}

/** A toggle switch, standing for a state that is on or off */
function Switch(props: { x: number; y: number; on: boolean; c: HelpColors }): React.JSX.Element {
    const { x, y, on, c } = props;
    return (
        <>
            <Rect
                x={x}
                y={y}
                w={30}
                h={14}
                r={7}
                fill={on ? c.accent : c.item}
            />
            <circle
                cx={on ? x + 23 : x + 7}
                cy={y + 7}
                r={5}
                fill={c.paper}
            />
        </>
    );
}

/** An arrow head drawn as a chevron: down when open, to the right when closed */
function Chevron(props: { x: number; y: number; open: boolean; color: string }): React.JSX.Element {
    return (
        <path
            d={props.open ? `M${props.x - 5} ${props.y - 2}l5 5l5 -5` : `M${props.x - 2} ${props.y - 5}l5 5l-5 5`}
            stroke={props.color}
            strokeWidth={2}
            fill="none"
        />
    );
}

function Person(props: { x: number; y: number; color: string }): React.JSX.Element {
    return (
        <g fill={props.color}>
            <circle
                cx={props.x}
                cy={props.y}
                r={6}
            />
            <path d={`M${props.x - 11} ${props.y + 20}a11 11 0 0 1 22 0z`} />
        </g>
    );
}

const sectionSubtitleImage: HelpImage = c => (
    <>
        {sectionBody(c, 20, 10, 200, 120)}
        <circle
            cx={38}
            cy={30}
            r={9}
            fill={c.item}
        />
        <Rect
            x={54}
            y={21}
            w={90}
            h={9}
            r={3}
            fill={c.item}
        />
        <Rect
            x={54}
            y={34}
            w={60}
            h={6}
            r={3}
            fill={c.accent}
        />
        <Cells
            x={28}
            y={50}
            w={184}
            h={72}
            cols={3}
            rows={2}
            c={c}
        />
    </>
);

const sectionTitleAlignImage: HelpImage = c => (
    <>
        {[0, 1, 2].map(i => {
            const y = 8 + i * 44;
            const x = [30, 75, 120][i];
            return (
                <g key={i}>
                    <Rect
                        x={20}
                        y={y}
                        w={200}
                        h={36}
                        r={5}
                        fill={c.area}
                        stroke={c.line}
                        dash
                    />
                    <Rect
                        x={x}
                        y={y + 13}
                        w={90}
                        h={10}
                        r={3}
                        fill={c.accent}
                    />
                </g>
            );
        })}
    </>
);

const sectionDividerImage: HelpImage = c => (
    <>
        {sectionBody(c, 20, 10, 200, 120)}
        <Rect
            x={32}
            y={22}
            w={90}
            h={10}
            r={3}
            fill={c.item}
        />
        <line
            x1={28}
            y1={42}
            x2={212}
            y2={42}
            stroke={c.accent}
            strokeWidth={2}
        />
        <Cells
            x={28}
            y={50}
            w={184}
            h={72}
            cols={3}
            rows={2}
            c={c}
        />
    </>
);

const sectionLinkImage: HelpImage = c => (
    <>
        {sectionBody(c, 8, 20, 104, 100)}
        <Rect
            x={8}
            y={20}
            w={104}
            h={24}
            r={6}
            fill={c.accentArea}
            stroke={c.accent}
        />
        <Rect
            x={18}
            y={28}
            w={60}
            h={8}
            r={3}
            fill={c.accent}
        />
        <Cells
            x={16}
            y={52}
            w={88}
            h={60}
            cols={2}
            rows={2}
            c={c}
        />
        <path
            d="M100 32C130 32 140 60 158 60"
            stroke={c.accent}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            fill="none"
        />
        <ArrowHead
            x={164}
            y={60}
            angle={0}
            color={c.accent}
        />
        <Frame
            x={168}
            y={20}
            w={68}
            h={100}
            c={c}
        />
        <Cells
            x={174}
            y={28}
            w={56}
            h={84}
            cols={1}
            rows={3}
            c={c}
        />
    </>
);

const sectionTextColorImage: HelpImage = c => (
    <>
        {sectionBody(c, 20, 10, 200, 120)}
        {[0, 1, 2].map(col =>
            [0, 1].map(row => (
                <g key={`${col}_${row}`}>
                    <Rect
                        x={28 + col * 62}
                        y={18 + row * 56}
                        w={58}
                        h={50}
                        fill={c.item}
                        under={c.paper}
                    />
                    <Rect
                        x={34 + col * 62}
                        y={28 + row * 56}
                        w={40}
                        h={6}
                        r={3}
                        fill={c.accent}
                    />
                    <Rect
                        x={34 + col * 62}
                        y={40 + row * 56}
                        w={28}
                        h={6}
                        r={3}
                        fill={c.accent}
                    />
                </g>
            )),
        )}
    </>
);

const glassImage: HelpImage = c => {
    const blobs = (
        <>
            <circle
                cx={60}
                cy={50}
                r={34}
                fill={c.accent}
            />
            <circle
                cx={170}
                cy={96}
                r={40}
                fill={c.item}
            />
            <circle
                cx={130}
                cy={30}
                r={20}
                fill={c.accentArea}
            />
        </>
    );
    return (
        <>
            <defs>
                <filter id="visHelpGlassBlur">
                    <feGaussianBlur stdDeviation="5" />
                </filter>
                <clipPath id="visHelpGlassClip">
                    <rect
                        x={50}
                        y={30}
                        width={140}
                        height={84}
                        rx={10}
                    />
                </clipPath>
            </defs>
            {blobs}
            <g clipPath="url(#visHelpGlassClip)">
                <rect
                    x={0}
                    y={0}
                    width={240}
                    height={140}
                    fill={c.paper}
                />
                <g filter="url(#visHelpGlassBlur)">{blobs}</g>
                <rect
                    x={0}
                    y={0}
                    width={240}
                    height={140}
                    fill={c.paper}
                    opacity={0.35}
                />
            </g>
            <Rect
                x={50}
                y={30}
                w={140}
                h={84}
                r={10}
                stroke={c.accent}
                sw={1.5}
            />
        </>
    );
};

const sectionSpanImage: HelpImage = c => (
    <>
        <Frame
            h={120}
            c={c}
        />
        <Section
            x={10}
            y={10}
            w={144}
            h={50}
            cols={4}
            rows={2}
            fill={c.accentArea}
            stroke={c.accent}
            c={c}
        />
        <Section
            x={162}
            y={10}
            w={68}
            h={50}
            cols={2}
            rows={2}
            c={c}
        />
        <Section
            x={10}
            y={66}
            w={68}
            h={46}
            cols={2}
            rows={2}
            c={c}
        />
        <DimH
            x1={10}
            x2={154}
            y={130}
            color={c.accent}
            label="2"
        />
    </>
);

const sectionNewRowImage: HelpImage = c => (
    <>
        <Frame c={c} />
        <Section
            x={10}
            y={10}
            w={68}
            h={56}
            label="1"
            c={c}
        />
        <Rect
            x={86}
            y={10}
            w={144}
            h={56}
            r={5}
            stroke={c.line}
            dash
        />
        <Section
            x={10}
            y={74}
            w={68}
            h={56}
            label="2"
            fill={c.accentArea}
            stroke={c.accent}
            c={c}
        />
        <path
            d="M130 60C130 96 110 102 86 102"
            stroke={c.accent}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            fill="none"
        />
        <ArrowHead
            x={82}
            y={102}
            angle={180}
            color={c.accent}
        />
    </>
);

const sectionStretchImage: HelpImage = c => (
    <>
        <Frame c={c} />
        <Section
            x={10}
            y={10}
            w={106}
            h={120}
            cols={2}
            rows={4}
            c={c}
        />
        <Rect
            x={124}
            y={10}
            w={106}
            h={120}
            r={5}
            fill={c.accentArea}
            stroke={c.accent}
            dash
        />
        <Section
            x={124}
            y={10}
            w={106}
            h={50}
            cols={2}
            rows={1}
            c={c}
        />
        <DimV
            y1={64}
            y2={128}
            x={177}
            color={c.accent}
        />
    </>
);

const sectionMinHeightImage: HelpImage = c => (
    <>
        {sectionBody(c, 20, 10, 170, 120, c.accent)}
        <Cells
            x={28}
            y={18}
            w={154}
            h={36}
            cols={3}
            rows={1}
            c={c}
        />
        <DimV
            y1={10}
            y2={130}
            x={206}
            color={c.accent}
            label="min"
        />
    </>
);

/** Two cases side by side: what the runtime shows in each */
function twoCases(c: HelpColors, left: React.JSX.Element, right: React.JSX.Element): React.JSX.Element {
    return (
        <>
            <g>{left}</g>
            <g transform="translate(124 0)">{right}</g>
        </>
    );
}

const sectionGroupsImage: HelpImage = c =>
    twoCases(
        c,
        <>
            <Person
                x={58}
                y={12}
                color={c.accent}
            />
            {sectionBody(c, 8, 42, 100, 90, c.accent)}
            <Cells
                x={16}
                y={50}
                w={84}
                h={74}
                cols={2}
                rows={2}
                c={c}
            />
        </>,
        <>
            <Person
                x={58}
                y={12}
                color={c.line}
            />
            <Rect
                x={8}
                y={42}
                w={100}
                h={90}
                r={6}
                stroke={c.line}
                dash
            />
        </>,
    );

function stateCase(c: HelpColors, on: boolean, shown: React.JSX.Element, hidden: React.JSX.Element): React.JSX.Element {
    return (
        <>
            <Switch
                x={43}
                y={8}
                on={on}
                c={c}
            />
            {on ? shown : hidden}
        </>
    );
}

const sectionVisibilityStateImage: HelpImage = c => {
    const shown = (
        <>
            {sectionBody(c, 8, 32, 100, 100, c.accent)}
            <Cells
                x={16}
                y={40}
                w={84}
                h={84}
                cols={2}
                rows={2}
                c={c}
            />
        </>
    );
    const hidden = (
        <Rect
            x={8}
            y={32}
            w={100}
            h={100}
            r={6}
            stroke={c.line}
            dash
        />
    );
    return twoCases(c, stateCase(c, true, shown, hidden), stateCase(c, false, shown, hidden));
};

function collapsibleSection(c: HelpColors, open: boolean, y: number): React.JSX.Element {
    return (
        <>
            {sectionBody(c, 8, y, 100, open ? 100 - (y - 32) : 26, open ? undefined : c.accent)}
            <Rect
                x={16}
                y={y + 9}
                w={50}
                h={8}
                r={3}
                fill={open ? c.item : c.accent}
            />
            <Chevron
                x={96}
                y={y + 13}
                open={open}
                color={open ? c.line : c.accent}
            />
            {open ? (
                <Cells
                    x={16}
                    y={y + 28}
                    w={84}
                    h={100 - (y - 32) - 36}
                    cols={2}
                    rows={2}
                    c={c}
                />
            ) : null}
        </>
    );
}

const sectionCollapseImage: HelpImage = c =>
    twoCases(c, collapsibleSection(c, true, 20), collapsibleSection(c, false, 20));

const sectionExpandStateImage: HelpImage = c =>
    twoCases(
        c,
        stateCase(c, true, collapsibleSection(c, true, 32), collapsibleSection(c, false, 32)),
        stateCase(c, false, collapsibleSection(c, true, 32), collapsibleSection(c, false, 32)),
    );

export const HELP_IMAGES: Record<string, HelpImage> = {
    // the view: responsive settings
    layout: layoutImage,
    columnWidth: c => columnsImage(c, 'columnWidth'),
    columnGap: c => columnsImage(c, 'columnGap'),
    rowGap: c => columnsImage(c, 'rowGap'),
    sectionMinWidth: c => sectionWidthImage(c, 'min'),
    sectionMaxWidth: c => sectionWidthImage(c, 'max'),
    maxSections: maxSectionsImage,
    sectionGap: sectionGapImage,
    gridRowHeight: gridRowHeightImage,
    gridGap: gridGapImage,
    denseSections: denseSectionsImage,
    // the view: options and navigation
    snapGrid: snapGridImage,
    limitScreen: limitScreenImage,
    navigation: c => navigationImage(c, 'menu'),
    navigationWidth: c => navigationImage(c, 'width'),
    navigationHideMenu: c => navigationImage(c, 'hide'),
    navigationBar: c => navigationImage(c, 'bar'),
    navigationOrientation: navigationOrientationImage,
    navigationOnlyIcon: navigationOnlyIconImage,
    // a section, and the look of a widget
    sectionTitle: c => sectionHeaderImage(c, 'title'),
    sectionIcon: c => sectionHeaderImage(c, 'icon'),
    sectionLook: sectionLookImage,
    sectionSubtitle: sectionSubtitleImage,
    sectionTitleAlign: sectionTitleAlignImage,
    sectionDivider: sectionDividerImage,
    sectionLink: sectionLinkImage,
    sectionTextColor: sectionTextColorImage,
    glass: glassImage,
    sectionSpan: sectionSpanImage,
    sectionNewRow: sectionNewRowImage,
    sectionStretch: sectionStretchImage,
    sectionMinHeight: sectionMinHeightImage,
    sectionGroups: sectionGroupsImage,
    sectionVisibilityState: sectionVisibilityStateImage,
    sectionCollapse: sectionCollapseImage,
    sectionExpandState: sectionExpandStateImage,
    background: backgroundImage,
    border: borderImage,
    borderRadius: borderRadiusImage,
    padding: c => paddingImage(c, 'all'),
    paddingLeft: c => paddingImage(c, 'left'),
    paddingTop: c => paddingImage(c, 'top'),
    paddingRight: c => paddingImage(c, 'right'),
    paddingBottom: c => paddingImage(c, 'bottom'),
    marginLeft: c => marginImage(c, 'left'),
    marginTop: c => marginImage(c, 'top'),
    marginRight: c => marginImage(c, 'right'),
    marginBottom: c => marginImage(c, 'bottom'),
    boxShadow: boxShadowImage,
    // a widget: place and size
    position: positionImage,
    leftTop: leftTopImage,
    size: sizeImage,
    zIndex: zIndexImage,
    overflowX: c => overflowImage(c, 'x'),
    overflowY: c => overflowImage(c, 'y'),
    opacity: opacityImage,
    transform: transformImage,
    visibilityMinWidth: c => widthVisibilityImage(c, 'min'),
    visibilityMaxWidth: c => widthVisibilityImage(c, 'max'),
};
