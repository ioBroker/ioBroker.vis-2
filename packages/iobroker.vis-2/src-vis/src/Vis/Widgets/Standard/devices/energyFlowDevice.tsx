import React from 'react';

import { SolarPower as EnergyIcon } from '@mui/icons-material';

import { asNumber } from '../Base/controls/stateValue';
import { flowDuration, formatPower, splitFlows, toWatts, type EnergyFlows } from '../Base/controls/energyFlow';
import { defineDeviceWidget, type DeviceContext, type StandardRxData } from '../Base/defineDeviceWidget';

interface EnergyFlowRxData extends StandardRxData {
    /** What the panels make */
    oidSolar?: string;
    /** What goes over the meter: positive bought, negative sold */
    oidGrid?: string;
    /** The meter counts the other way round */
    gridInverted?: boolean | 'true';
    /** What goes over the battery: positive out of it, negative into it */
    oidBattery?: string;
    /** The battery counts the other way round */
    batteryInverted?: boolean | 'true';
    /** How full the battery is, in percent */
    oidBatterySoc?: string;
    /** What the house uses; without it, it is worked out */
    oidHome?: string;
}

/** The drawing is laid out in this box and scaled to the card */
const VIEW = { width: 240, height: 200 };
const RADIUS = 26;

/** Where the four circles stand */
const NODES = {
    solar: { x: 120, y: 32 },
    grid: { x: 32, y: 100 },
    home: { x: 208, y: 100 },
    battery: { x: 120, y: 168 },
};

/**
 * The lines between the circles, from edge to edge.
 *
 * The four around the outside are bent outwards, so they do not run through the middle where the two straight
 * ones cross. Each is drawn from its first circle to its second; a flow the other way runs the dots backwards.
 */
const LINES = {
    solarHome: 'M138,50 Q178,50 190,82',
    solarGrid: 'M102,50 Q62,50 50,82',
    solarBattery: 'M120,58 L120,142',
    gridHome: 'M58,100 L182,100',
    gridBattery: 'M50,118 Q62,150 102,150',
    batteryHome: 'M138,150 Q178,150 190,118',
};

/** The symbols in the circles, as paths in a box of 24 by 24 */
const GLYPHS = {
    solar:
        'M12 7.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9z' +
        'M12 1.5v2.5M12 20v2.5M1.5 12h2.5M20 12h2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8',
    grid: 'M13 2 4.5 13.5h6.5l-1 8.5 8.5-11.5h-6.5z',
    home: 'M3 11.5 12 3.5l9 8M5.5 9.5V20.5h13V9.5M10 20.5v-6h4v6',
};

function isOn(value: unknown): boolean {
    return value === true || value === 'true';
}

/**
 * A reading in watts, with the sign the field description gives it.
 *
 * @param context - the widget
 * @param attr - the attribute that names the state
 * @param inverted - the state counts the other way round
 */
function readingOf(
    context: DeviceContext<EnergyFlowRxData>,
    attr: 'oidSolar' | 'oidGrid' | 'oidBattery' | 'oidHome',
    inverted = false,
): number | null {
    if (!context.data[attr]) {
        return null;
    }
    const watts = toWatts(context.valueOf(attr), context.commonOf(attr)?.unit);
    return watts === null ? null : inverted ? -watts : watts;
}

interface FlowLineProps {
    path: string;
    watts: number;
    /** The dots run from the end of the path to its start */
    reverse?: boolean;
    color: string;
    largest: number;
    /** The colour of a line nothing flows on */
    idle: string;
}

/**
 * One line between two circles: grey while nothing flows on it, and in the colour of where the power comes
 * from, with dots running along it, while something does. The more power, the faster the dots.
 *
 * @param props - the line
 */
function FlowLine(props: FlowLineProps): React.JSX.Element {
    const duration = flowDuration(props.watts, props.largest);
    return (
        <g>
            <path
                d={props.path}
                fill="none"
                stroke={duration ? props.color : props.idle}
                strokeOpacity={duration ? 0.55 : 1}
                strokeWidth={1.6}
            />
            {duration
                ? [0, 0.5].map(offset => (
                      <circle
                          key={offset}
                          r={2.8}
                          fill={props.color}
                      >
                          <animateMotion
                              dur={`${duration}s`}
                              begin={`${-offset * duration}s`}
                              repeatCount="indefinite"
                              path={props.path}
                              keyPoints={props.reverse ? '1;0' : '0;1'}
                              keyTimes="0;1"
                              calcMode="linear"
                          />
                      </circle>
                  ))
                : null}
        </g>
    );
}

interface NodeProps {
    x: number;
    y: number;
    color: string;
    /** The ring is drawn in the colour, not only the symbol */
    lit: boolean;
    glyph?: string;
    /** A symbol of its own instead of a path */
    symbol?: React.ReactNode;
    text: string;
    textColor: string;
    background: string;
    idle: string;
    /** The ring in the shares of where the power comes from, for the house */
    shares?: { color: string; share: number }[];
}

/**
 * A circle: a symbol, and the power under it.
 *
 * @param props - the circle
 */
function FlowNode(props: NodeProps): React.JSX.Element {
    const circumference = 2 * Math.PI * RADIUS;
    let start = 0;

    return (
        <g>
            <circle
                cx={props.x}
                cy={props.y}
                r={RADIUS}
                fill={props.background}
                stroke={props.lit && !props.shares?.length ? props.color : props.idle}
                strokeWidth={2.2}
            />
            {/* the ring of the house, in the colours of where its power comes from */}
            {props.shares?.map(part => {
                const length = part.share * circumference;
                const arc = (
                    <circle
                        key={part.color}
                        cx={props.x}
                        cy={props.y}
                        r={RADIUS}
                        fill="none"
                        stroke={part.color}
                        strokeWidth={2.2}
                        strokeDasharray={`${length} ${circumference}`}
                        strokeDashoffset={-start}
                        transform={`rotate(-90 ${props.x} ${props.y})`}
                    />
                );
                start += length;
                return arc;
            })}
            <g
                transform={`translate(${props.x - 9} ${props.y - 19}) scale(0.75)`}
                color={props.color}
            >
                {props.symbol || (
                    <path
                        d={props.glyph}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}
            </g>
            <text
                x={props.x}
                y={props.y + 14}
                textAnchor="middle"
                fontSize={9.5}
                fontWeight={600}
                fill={props.textColor}
            >
                {props.text}
            </text>
        </g>
    );
}

/**
 * The symbol of the battery, filled as far as it is charged.
 *
 * @param props - the battery
 * @param props.soc - how full it is, in percent, if that is known
 */
function BatterySymbol(props: { soc: number | null }): React.JSX.Element {
    const soc = props.soc === null ? null : Math.max(0, Math.min(100, props.soc));
    const height = soc === null ? 0 : (14 * soc) / 100;
    return (
        <g>
            <rect
                x={6.5}
                y={4.5}
                width={11}
                height={17}
                rx={2}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
            />
            <path
                d="M10 2.5h4"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
            />
            {height ? (
                <rect
                    x={8.5}
                    y={6.5 + 14 - height}
                    width={7}
                    height={height}
                    rx={0.8}
                    fill="currentColor"
                />
            ) : null}
        </g>
    );
}

interface EnergyFlowViewProps {
    flows: EnergyFlows;
    /** What the sources say, in watts, or null for a source the card was not given */
    solar: number | null;
    grid: number | null;
    battery: number | null;
    /** How full the battery is, in percent */
    soc: number | null;
    colors: { solar: string; grid: string; battery: string; text: string; background: string; idle: string };
    isFloatComma: boolean;
}

/**
 * The drawing of the card: the four circles and the six lines between them.
 *
 * @param props - what flows, and what the card was given states for
 */
function EnergyFlowView(props: EnergyFlowViewProps): React.JSX.Element {
    const { flows, colors, isFloatComma } = props;
    const withSolar = props.solar !== null;
    const withGrid = props.grid !== null;
    const withBattery = props.battery !== null;

    const largest = Math.max(
        flows.solarToHome,
        flows.solarToGrid,
        flows.solarToBattery,
        flows.gridToHome,
        flows.gridToBattery,
        flows.batteryToHome,
        flows.batteryToGrid,
    );
    const line = (path: string, watts: number, color: string, reverse = false): React.JSX.Element => (
        <FlowLine
            path={path}
            watts={watts}
            color={color}
            reverse={reverse}
            largest={largest}
            idle={colors.idle}
        />
    );

    const fromSources = flows.solarToHome + flows.gridToHome + flows.batteryToHome;
    const shares = fromSources
        ? [
              { color: colors.solar, share: flows.solarToHome / fromSources },
              { color: colors.grid, share: flows.gridToHome / fromSources },
              { color: colors.battery, share: flows.batteryToHome / fromSources },
          ].filter(part => part.share > 0)
        : undefined;

    const power = (watts: number | null): string =>
        watts === null ? '--' : formatPower(Math.abs(watts), isFloatComma);
    const common = { textColor: colors.text, background: colors.background, idle: colors.idle };

    return (
        <svg
            viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
        >
            {withSolar ? line(LINES.solarHome, flows.solarToHome, colors.solar) : null}
            {withSolar && withGrid ? line(LINES.solarGrid, flows.solarToGrid, colors.solar) : null}
            {withSolar && withBattery ? line(LINES.solarBattery, flows.solarToBattery, colors.solar) : null}
            {withGrid ? line(LINES.gridHome, flows.gridToHome, colors.grid) : null}
            {withGrid && withBattery
                ? flows.batteryToGrid
                    ? line(LINES.gridBattery, flows.batteryToGrid, colors.battery, true)
                    : line(LINES.gridBattery, flows.gridToBattery, colors.grid)
                : null}
            {withBattery ? line(LINES.batteryHome, flows.batteryToHome, colors.battery) : null}

            {withSolar ? (
                <FlowNode
                    {...NODES.solar}
                    {...common}
                    color={colors.solar}
                    lit={(props.solar || 0) > 0}
                    glyph={GLYPHS.solar}
                    text={power(props.solar)}
                />
            ) : null}
            {withGrid ? (
                <FlowNode
                    {...NODES.grid}
                    {...common}
                    color={colors.grid}
                    lit={flows.gridToHome + flows.gridToBattery + flows.solarToGrid + flows.batteryToGrid > 0}
                    glyph={GLYPHS.grid}
                    text={power(props.grid)}
                />
            ) : null}
            <FlowNode
                {...NODES.home}
                {...common}
                color={colors.text}
                lit
                glyph={GLYPHS.home}
                text={power(flows.home)}
                shares={shares}
            />
            {withBattery ? (
                <FlowNode
                    {...NODES.battery}
                    {...common}
                    color={colors.battery}
                    lit={flows.batteryToHome + flows.batteryToGrid + flows.solarToBattery + flows.gridToBattery > 0}
                    symbol={<BatterySymbol soc={props.soc} />}
                    text={power(props.battery)}
                />
            ) : null}
            {withBattery && props.soc !== null ? (
                <text
                    x={NODES.battery.x + RADIUS + 6}
                    y={NODES.battery.y + 4}
                    fontSize={10}
                    fontWeight={600}
                    fill={colors.battery}
                >
                    {`${Math.round(props.soc)} %`}
                </text>
            ) : null}
        </svg>
    );
}

/**
 * The energy flow: the panels, the grid, the battery and the house, and what flows between them.
 *
 * The question a house with panels on its roof asks all day is not "how much" but "where to": is the sun
 * running the washing machine, is the battery filling up, is the grid being paid for something the battery
 * could do. Three numbers answer that - what the panels make, what goes over the meter, what goes over the
 * battery - and the arrows between them are worked out, see `energyFlow.ts`. What the house uses is worked out
 * as well, unless a state says it.
 *
 * Meters do not agree on signs, so the grid and the battery each have a box for the other way round, and they
 * do not agree on units either, so a state in kW is read as kW. A circle whose state was not given is left out
 * with its lines: a house without a battery has no battery on its card.
 */
const energyFlowDevice = defineDeviceWidget<EnergyFlowRxData>({
    name: 'EnergyFlow',
    label: 'widget_energy_flow',
    help: 'help_energy_flow',
    picture: {
        glyph:
            '<circle cx="12" cy="5" r="3" stroke-width="2"/>' +
            '<circle cx="4.5" cy="15" r="2.5" stroke-width="2"/>' +
            '<circle cx="19.5" cy="15" r="2.5" stroke-width="2"/>' +
            '<path d="M10 7.5 6 13M14 7.5l4 5.5M7 15h10" stroke-width="2" stroke-linecap="round"/>',
        value: '2,4 kW',
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">' +
        '<circle cx="16" cy="6" r="4"/><circle cx="6" cy="16" r="4"/><circle cx="26" cy="16" r="4"/>' +
        '<circle cx="16" cy="26" r="4"/><path d="M10 16h12M16 10v12" stroke-dasharray="2 2"/></svg>',
    deviceTypes: [],
    fields: [
        { name: 'oidSolar', type: 'id', label: 'energy_solar', tooltip: 'energy_unit_tooltip' },
        { name: 'oidGrid', type: 'id', label: 'energy_grid', tooltip: 'energy_grid_tooltip' },
        { name: 'gridInverted', type: 'checkbox', label: 'energy_inverted', hidden: '!data.oidGrid' },
        { name: 'oidBattery', type: 'id', label: 'energy_battery', tooltip: 'energy_battery_tooltip' },
        { name: 'batteryInverted', type: 'checkbox', label: 'energy_inverted', hidden: '!data.oidBattery' },
        { name: 'oidBatterySoc', type: 'id', label: 'energy_battery_soc', hidden: '!data.oidBattery' },
        { name: 'oidHome', type: 'id', label: 'energy_home', tooltip: 'energy_home_tooltip' },
    ],
    tile: { columns: 6, rows: 4, minColumns: 4, minRows: 3 },
    markerShape: 'value',
    // four circles do not fit on a coin; the click brings up the card
    popup: true,
    render: context => {
        const { data, accents, theme, isFloatComma } = context;

        const solar = readingOf(context, 'oidSolar');
        const grid = readingOf(context, 'oidGrid', isOn(data.gridInverted));
        const battery = readingOf(context, 'oidBattery', isOn(data.batteryInverted));
        const home = readingOf(context, 'oidHome');
        const soc = data.oidBatterySoc ? asNumber(context.valueOf('oidBatterySoc')) : null;

        const flows = splitFlows({ solar, grid, battery, home });
        const homeText = formatPower(flows.home, isFloatComma);
        const [markerNumber, markerUnit] = homeText.split(' ');

        // the card is in the colour of what runs the house at the moment
        const accent =
            flows.solarToHome > 0
                ? accents.yellow
                : flows.batteryToHome > 0
                  ? accents.green
                  : flows.gridToHome > 0
                    ? accents.blue
                    : accents.off;

        return {
            accent,
            active: false,
            icon: <EnergyIcon style={{ width: '100%', height: '100%' }} />,
            body:
                context.layout === 'default' ? (
                    <EnergyFlowView
                        flows={flows}
                        solar={solar}
                        grid={grid}
                        battery={battery}
                        soc={soc}
                        isFloatComma={isFloatComma}
                        colors={{
                            solar: accents.yellow,
                            grid: accents.blue,
                            battery: accents.green,
                            text: theme.palette.text.primary,
                            background: theme.palette.background.paper,
                            idle: theme.palette.divider,
                        }}
                    />
                ) : undefined,
            // the drawing says it all; a row and a coin say what the house uses
            value: context.layout === 'default' ? undefined : homeText,
            valueColor: accent,
            stateText: homeText,
            marker: { text: markerNumber, unit: markerUnit },
        };
    },
});

export default energyFlowDevice;
