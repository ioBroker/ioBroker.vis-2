import React from 'react';

import {
    AcUnit as CoolIcon,
    Autorenew as AutoIcon,
    EnergySavingsLeaf as EcoIcon,
    LocalFireDepartment as HeatIcon,
    PowerSettingsNew as OffIcon,
    Thermostat as ThermostatIcon,
} from '@mui/icons-material';

import { Types } from '@iobroker/type-detector';

import ModeButtons, { type Mode } from '../Base/controls/ModeButtons';
import { parsePresets, presetModes } from '../Base/presets';
import SlideToggle from '../Base/controls/SlideToggle';
import ThermostatDial from '../Base/controls/ThermostatDial';
import { asNumber } from '../Base/controls/stateValue';
import { defineDeviceWidget, type DeviceContext, type StandardRxData } from '../Base/defineDeviceWidget';
import { limitsOf } from '../Base/limits';

interface ThermostatRxData extends StandardRxData {
    /** What the room is, as opposed to what it should be */
    oidActual?: string;
    /** What the thermostat is doing: heating, cooling, off - whatever the object offers */
    oidMode?: string;
    /** The state that switches the whole thing on and off */
    oidPower?: string;
    /** What is written and read, like `°C` */
    unit?: string;
    /** The temperatures offered as buttons, like `12;18;22;24` */
    presets?: string;
    /** `dial`, `presets` or `both` */
    controls?: 'dial' | 'presets' | 'both';
    min?: number | string;
    max?: number | string;
    step?: number | string;
}

/** What a thermostat is taken to reach when neither the widget nor the object says */
const RANGE = { min: 5, max: 35 };

/** The symbol of a mode, as far as its name gives it away */
function modeIcon(label: string): React.ReactNode {
    const word = label.toLowerCase();
    if (word.includes('heat') || word.includes('heiz')) {
        return <HeatIcon style={{ width: '100%', height: '100%' }} />;
    }
    if (word.includes('cool') || word.includes('kühl') || word.includes('kuehl')) {
        return <CoolIcon style={{ width: '100%', height: '100%' }} />;
    }
    if (word.includes('eco') || word.includes('spar')) {
        return <EcoIcon style={{ width: '100%', height: '100%' }} />;
    }
    if (word.includes('auto')) {
        return <AutoIcon style={{ width: '100%', height: '100%' }} />;
    }
    if (word === 'off' || word === 'aus' || word.includes('ausgeschaltet')) {
        return <OffIcon style={{ width: '100%', height: '100%' }} />;
    }
    return undefined;
}

/**
 * What this thermostat can be set to, out of what its object says.
 *
 * `common.states` is where ioBroker keeps that, as an object of value and word, sometimes as a list. What a
 * manufacturer calls its programmes is its own business; the widget shows what it finds.
 *
 * @param context - the widget, its states and its settings
 */
function modesOf(context: DeviceContext<ThermostatRxData>): Mode[] {
    const states = context.commonOf('oidMode')?.states;
    if (!states) {
        return [];
    }
    const pairs: [string, string][] = Array.isArray(states)
        ? states.map((label, index) => [`${index}`, `${label}`])
        : Object.entries(states).map(([value, label]) => [value, `${label}`]);

    return pairs.map(([value, label]) => ({ value, label, icon: modeIcon(label) }));
}

/**
 * The thermostat: what the room is, what it should be, and what the thing is doing about it.
 *
 * The dial is one SVG that scales with the card, so the same widget works as a tile in a section and as a
 * dialog over a floor plan - see {@link ThermostatDial}. Where the card is too short for the row of modes it
 * drops it rather than squeezing everything; that rule is a container query in `Vis/css/vis.css`, because the
 * browser knows the height of the card at every frame and a widget that measures itself does not.
 *
 * `min` and `max` come from the object where it says them, which for a radiator valve is usually 5 to 30.
 */
const thermostatDevice = defineDeviceWidget<ThermostatRxData>({
    name: 'Thermostat',
    label: 'widget_thermostat',
    help: 'help_thermostat',
    picture: {
        glyph:
            '<path d="M12 3a2.5 2.5 0 0 1 2.5 2.5v7a4.5 4.5 0 1 1-5 0v-7A2.5 2.5 0 0 1 12 3z" stroke-width="2"/>' +
            '<path d="M12 8v6.5" stroke-width="2" stroke-linecap="round"/>',
        value: '21.5 °C',
        dial: true,
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<path d="M7 24a11 11 0 1 1 18 0" stroke="currentColor" stroke-width="3" stroke-linecap="round" ' +
        'opacity="0.45"/>' +
        '<path d="M7 24a11 11 0 0 1 4-15" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
        '<circle cx="11" cy="9" r="3.5" fill="currentColor"/></svg>',
    deviceTypes: [Types.thermostat],
    fields: [
        { name: 'oid', type: 'id', label: 'oid_target' },
        { name: 'oidActual', type: 'id', label: 'oid_actual_temperature' },
        { name: 'oidMode', type: 'id', label: 'oid_mode' },
        { name: 'oidPower', type: 'id', label: 'oid_switch' },
        { name: 'unit', label: 'unit' },
        { name: 'presets', label: 'presets', tooltip: 'presets_tooltip' },
        {
            name: 'controls',
            type: 'select',
            label: 'controls',
            default: 'dial',
            hidden: '!data.presets',
            options: [
                { value: 'dial', label: 'controls_dial' },
                { value: 'presets', label: 'controls_presets' },
                { value: 'both', label: 'controls_both' },
            ],
        },
        { name: 'min', type: 'number', label: 'min' },
        { name: 'max', type: 'number', label: 'max' },
        { name: 'step', type: 'number', label: 'step' },
    ],
    tile: { columns: 6, rows: 5, minColumns: 4, minRows: 3 },
    markerShape: 'value',
    // a dial is dragged and the modes are pressed - a coin on a plan can do neither
    popup: true,
    confirmable: true,
    render: context => {
        const { data, accents, theme, t } = context;
        const limits = limitsOf(context, 'oid', RANGE);
        const target = asNumber(context.valueOf('oid'));
        const actual = asNumber(context.valueOf('oidActual'));
        const unit = data.unit || context.commonOf('oidActual')?.unit || context.commonOf('oid')?.unit || '°C';

        const modes = modesOf(context);
        const mode = context.valueOf('oidMode');
        const modeLabel = modes.find(m => `${m.value}` === `${mode}`)?.label;

        /*
         * Four temperatures on four buttons are a better thermostat than a dial for most people:
         * nobody wants 21.5 degrees, they want the number they call "night" or "comfortable". Where
         * they are given, the dial can step aside for them - or stand beside them.
         */
        const presets = parsePresets(data.presets);
        const shown = presets.length ? data.controls || 'dial' : 'dial';
        const withDial = shown !== 'presets';
        const withPresets = shown !== 'dial' && presets.length > 0;

        const powered = data.oidPower ? !!context.valueOf('oidPower') : true;
        // it warms when it should be warmer than it is, and the other way round
        const heating = powered && target !== null && actual !== null && target > actual;
        const cooling = powered && target !== null && actual !== null && target < actual;
        const accent = !powered ? accents.off : heating ? accents.red : cooling ? accents.blue : accents.green;

        /**
         * Set the temperature, and show it at once.
         *
         * @param value - what it should be
         * @param done - the finger was let go, so this one is written
         */
        const setTarget = (value: number, done: boolean): void => {
            const wanted = Math.max(limits.min, Math.min(limits.max, value));
            context.preview('oid', wanted, !done);
            if (done && data.oid) {
                context.setValue(data.oid, wanted);
            }
        };

        const dial = (
            <ThermostatDial
                actual={actual}
                target={target ?? limits.min}
                min={limits.min}
                max={limits.max}
                step={asNumber(data.step) ?? undefined}
                unit={unit}
                setWord={t('set_to')}
                cold={accents.blue}
                warm={accents.red}
                track={theme.palette.divider}
                ink={powered ? theme.palette.text.primary : theme.palette.text.disabled}
                quiet={theme.palette.text.secondary}
                isFloatComma={context.isFloatComma}
                // in the editor the pointer belongs to the editor: a drag there moves the widget
                onChange={context.editMode || !data.oid ? undefined : setTarget}
            />
        );

        const written = actual !== null ? actual.toFixed(1) : target !== null ? target.toFixed(1) : '--';
        const reading = context.isFloatComma ? written.replace('.', ',') : written;

        return {
            accent,
            active: heating || cooling,
            icon: <ThermostatIcon style={{ width: '100%', height: '100%' }} />,
            // the dial says both temperatures itself, so the value row would only repeat it; the other two
            // layouts have no room for a dial and show the number instead
            body: context.layout === 'default' && withDial ? dial : null,
            // without the dial the card says the temperature itself, as the other two layouts do
            value: context.layout === 'default' && withDial ? undefined : `${reading}${unit}`,
            valueColor: accent,
            stateText: modeLabel ? `${reading}${unit} · ${modeLabel}` : `${reading}${unit}`,
            marker: { text: reading, unit },
            container: true,
            control: data.oidPower ? (
                <SlideToggle
                    on={powered}
                    color={accents.green}
                    offColor={theme.palette.divider}
                    onChange={() =>
                        context.act(powered ? 'off' : 'on', () => context.setValue(data.oidPower as string, !powered))
                    }
                />
            ) : null,
            footer:
                context.layout === 'default' && (withPresets || modes.length) ? (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {withPresets ? (
                            <ModeButtons
                                modes={presetModes(presets, unit, context.isFloatComma)}
                                current={target ?? undefined}
                                accent={accent}
                                theme={theme}
                                disabled={context.editMode}
                                onChange={value => setTarget(Number(value), true)}
                            />
                        ) : null}
                        {modes.length ? (
                            <div className="vis-thermostat-modes">
                                <ModeButtons
                                    modes={modes}
                                    current={mode as string | number | boolean | undefined}
                                    accent={accent}
                                    theme={theme}
                                    disabled={context.editMode}
                                    onChange={value => data.oidMode && context.setValue(data.oidMode, value)}
                                />
                            </div>
                        ) : null}
                    </div>
                ) : null,
        };
    },
});

export default thermostatDevice;
