import React from 'react';

import {
    Cyclone as DryerIcon,
    LocalLaundryService as WasherIcon,
    Restaurant as DishwasherIcon,
} from '@mui/icons-material';

import ApplianceDrum from '../Base/controls/ApplianceDrum';
import { asNumber, asText } from '../Base/controls/stateValue';
import {
    asClock,
    asClockTime,
    asDuration,
    asTime,
    longestRun,
    runShare,
    type RemainingUnit,
    type RunRecord,
} from '../Base/applianceTime';
import { defineDeviceWidget, type DeviceContext, type StandardRxData } from '../Base/defineDeviceWidget';

interface ApplianceRxData extends StandardRxData {
    /** It is running, where that is a state of its own rather than a word of the status */
    oidRunning?: string;
    /** The programme it is running: cotton, eco, 60° */
    oidProgram?: string;
    /** How much longer it has */
    oidRemaining?: string;
    /** How long it has been running, in the unit of `oidRemaining` */
    oidElapsed?: string;
    /** What the numbers of `oidRemaining` and `oidElapsed` count in */
    remainingUnit?: RemainingUnit;
    /** When it was started */
    oidStart?: string;
    /** When it will be done */
    oidEnd?: string;
    /** The value of the status that means it is running */
    runValue?: string;
    /** How far it has got, in % */
    oidProgress?: string;
    /** The ring fills from 0 to 100 % where only the time left is known, instead of turning */
    fill?: boolean;
    /** Which machine it is, which is what it is drawn as */
    kind?: 'washer' | 'dryer' | 'dishwasher';
}

/** What a status says when the machine is doing nothing */
const IDLE_WORDS = ['0', 'false', 'off', 'stop', 'stopped', 'idle', 'standby', 'ready', 'aus', 'bereit', 'gestoppt'];

/** What it says when it is done, which is worth another colour than being off */
const DONE_WORDS = ['end', 'ended', 'done', 'finish', 'finished', 'complete', 'completed', 'fertig', 'beendet'];

/** How often the countdown catches up with the clock, in ms; a countdown in minutes needs no more */
const TICK = 15_000;

/** Where the whole length of a running programme is remembered, so a reload does not start the ring at 0 */
const MEMORY = 'vis-2-appliance-run-';

/** The words a state carries for its values, where it carries any */
function wordOf(context: DeviceContext<ApplianceRxData>, attr: string, value: unknown): string {
    const states = context.commonOf(attr)?.states;
    const text = asText(value);
    if (states) {
        const word = Array.isArray(states) ? states[Number(text)] : (states as Record<string, string>)[text];
        if (word) {
            return `${word}`;
        }
    }

    return text;
}

interface LiveDrumProps {
    running: boolean;
    /** When the programme was started, where the machine says so */
    start: number | null;
    /** When it will be done */
    end: number | null;
    /** How long it has left, where that is all there is */
    remaining: number | null;
    /** How long it has been running, where the machine says so */
    elapsed: number | null;
    /** How far it has got, 0..1, where the machine says so itself */
    progress: number | null;
    /** The ring fills where only the time left is known, instead of a mark that turns */
    fill: boolean;
    /** What the whole length of the programme is remembered under, where the ring fills */
    memory?: string;
    /** The status was read, so a machine that is not running really is not */
    settled: boolean;
    /** What stands in the middle while nothing runs */
    idle: string;
    /** What stands under it: the programme, or the time of day it will be done at */
    note?: string;
    /** What was set in the CSS attributes of the widget for how the time is written */
    textStyle?: React.CSSProperties;
    accent: string;
    track: string;
    ink: string;
    quiet: string;
}

/**
 * The drum with the clock behind it.
 *
 * How far a programme has got and how much longer it has are both worked out against now, and a widget that
 * read the clock while it renders would draw something different on every render for reasons of its own -
 * which is how React ends up rendering for ever. So the clock is read in an effect, and every quarter of a
 * minute after that, which is as often as a countdown in minutes can change.
 *
 * @param props - the two moments, what is left, and in which colours
 */
function LiveDrum(props: LiveDrumProps): React.JSX.Element {
    const [now, setNow] = React.useState(0);

    React.useEffect(() => {
        setNow(Date.now());
        const timer = setInterval(() => setNow(Date.now()), TICK);

        return () => clearInterval(timer);
    }, []);

    const left = props.end !== null && now ? props.end - now : props.remaining;

    // the whole length of a programme that only says how much longer it has, for a ring that fills
    const [total, setTotal] = React.useState<number | null>(null);
    const key = props.memory ? `${MEMORY}${props.memory}` : '';

    React.useEffect(() => {
        if (!key) {
            return;
        }
        if (!props.running) {
            // only a status that was read says the programme is over; one that has not arrived yet says nothing
            if (props.settled) {
                setTotal(null);
                try {
                    window.localStorage.removeItem(key);
                } catch {
                    // a browser without storage forgets it anyway
                }
            }
            return;
        }
        if (left === null) {
            return;
        }
        let record: RunRecord | null = null;
        try {
            record = JSON.parse(window.localStorage.getItem(key) || 'null') as RunRecord | null;
        } catch {
            // nothing remembered, or nothing that can be read
        }
        const next = longestRun(record, left, Date.now());
        try {
            window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
            // remembered for as long as the page is open
        }
        setTotal(next.total);
    }, [key, props.running, props.settled, left]);

    /*
     * The time run and the time left are the whole programme: the ring is right from its start on and on every
     * device, also one that opened the page in the middle of it. The time left as the machine wrote it, not as
     * counted down here - the time run is not counted up either, and the two have to be of the same moment.
     */
    const written = props.remaining ?? left;

    const share =
        props.start !== null && props.end !== null && props.end > props.start && now
            ? Math.max(0, Math.min(1, (now - props.start) / (props.end - props.start)))
            : props.progress !== null
              ? props.progress
              : props.running && props.elapsed !== null && written !== null
                ? runShare(props.elapsed + written, written)
                : props.fill && props.running
                  ? total !== null && left !== null
                      ? runShare(total, left)
                      : 0
                  : null;

    const clock = props.running && left !== null ? asClock(left) : null;

    return (
        <ApplianceDrum
            running={props.running}
            share={share}
            text={clock ? clock.text : props.idle}
            unit={clock ? clock.unit : undefined}
            note={props.note}
            accent={props.accent}
            track={props.track}
            ink={props.ink}
            quiet={props.quiet}
            textStyle={props.textStyle}
        />
    );
}

/**
 * The washing machine, the tumble dryer and the dishwasher: how much longer.
 *
 * It is the one device in the house that is looked at for a single reason - whether it is done yet - and
 * everything here serves that: the ring says how far the programme has got, the middle says how long it still
 * has, and underneath stands the time of day it will be finished at, because that is the number one plans an
 * evening around.
 *
 * What a machine says about itself it says in its own words, and no two of them agree: `run`, `2`, `Waschen`,
 * `DelayedStart`. The words come out of `common.states` of the status where it has any, and which of them
 * means that something is running is a setting for the case where guessing it goes wrong.
 *
 * Every state is optional but the status. A machine that only reports the remaining minutes is drawn with a
 * turning drum instead of a ring, and one that reports nothing else at all is still a card that says whether
 * it runs.
 */
const applianceDevice = defineDeviceWidget<ApplianceRxData>({
    name: 'Appliance',
    label: 'widget_appliance',
    help: 'help_appliance',
    picture: {
        glyph:
            '<rect x="4" y="3" width="16" height="18" rx="2.5" stroke-width="2"/>' +
            '<circle cx="12" cy="14" r="4.5" stroke-width="2"/>' +
            '<path d="M7 6.5h4" stroke-width="2" stroke-linecap="round"/>',
        value: '1:24 h',
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<rect x="5" y="3" width="22" height="26" rx="3.5" stroke="currentColor" stroke-width="2.5"/>' +
        '<circle cx="16" cy="19" r="6.5" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M9 8h5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
    // the type detector knows no washing machine: what it is made of is a status and a few numbers
    deviceTypes: [],
    fields: [
        { name: 'oid', type: 'id', label: 'oid_appliance_status' },
        { name: 'runValue', label: 'appliance_run_value', tooltip: 'appliance_run_value_tooltip' },
        { name: 'oidRunning', type: 'id', label: 'oid_running' },
        { name: 'oidProgram', type: 'id', label: 'oid_program' },
        { name: 'oidRemaining', type: 'id', label: 'oid_remaining' },
        { name: 'oidElapsed', type: 'id', label: 'oid_run_time', tooltip: 'oid_run_time_tooltip' },
        {
            name: 'remainingUnit',
            type: 'select',
            label: 'remaining_unit',
            default: 'minutes',
            hidden: '!data.oidRemaining && !data.oidElapsed',
            options: [
                { value: 'minutes', label: 'unit_minutes' },
                { value: 'seconds', label: 'unit_seconds' },
                { value: 'hours', label: 'unit_hours' },
                { value: 'clock', label: 'unit_clock' },
            ],
        },
        { name: 'fill', type: 'checkbox', label: 'appliance_fill', tooltip: 'appliance_fill_tooltip' },
        { name: 'oidProgress', type: 'id', label: 'oid_progress' },
        { name: 'oidStart', type: 'id', label: 'oid_start_time', tooltip: 'oid_start_time_tooltip' },
        { name: 'oidEnd', type: 'id', label: 'oid_end_time', tooltip: 'oid_end_time_tooltip' },
        {
            name: 'kind',
            type: 'select',
            label: 'appliance_kind',
            default: 'washer',
            options: [
                { value: 'washer', label: 'appliance_washer' },
                { value: 'dryer', label: 'appliance_dryer' },
                { value: 'dishwasher', label: 'appliance_dishwasher' },
            ],
        },
    ],
    tile: { columns: 4, rows: 4, minColumns: 2, minRows: 2 },
    markerShape: 'icon',
    // the drum is the widget; a coin on a plan says how much longer, and the card behind a click
    popup: true,
    render: context => {
        const { data, accents, theme, t } = context;

        const raw = context.valueOf('oid');
        const known = raw !== undefined && raw !== null;
        const word = known ? wordOf(context, 'oid', raw) : '';
        const plain = word.toLowerCase();

        const remaining = asDuration(context.valueOf('oidRemaining'), data.remainingUnit);
        const elapsed = data.oidElapsed ? asDuration(context.valueOf('oidElapsed'), data.remainingUnit) : null;
        const start = asTime(context.valueOf('oidStart'));
        const end = asTime(context.valueOf('oidEnd'));
        // in % of whatever the object says is all of it, which is 100 where it says nothing
        const percent = data.oidProgress ? asNumber(context.valueOf('oidProgress')) : null;
        const progress =
            percent !== null ? Math.max(0, Math.min(1, percent / (context.commonOf('oidProgress')?.max || 100))) : null;

        /**
         * Whether something is running.
         *
         * In order: the state that was given for it, the value that was named for it, what a boolean says,
         * and otherwise the word itself - everything that is not one of the words for standing still.
         */
        const running = data.oidRunning
            ? !!context.valueOf('oidRunning')
            : data.runValue
              ? asText(raw) === data.runValue
              : typeof raw === 'boolean'
                ? raw
                : known && word !== ''
                  ? !IDLE_WORDS.includes(plain)
                  : (remaining ?? 0) > 0;

        const finished = !running && DONE_WORDS.includes(plain);
        const accent = running ? accents.blue : finished ? accents.green : accents.off;

        const program = data.oidProgram ? wordOf(context, 'oidProgram', context.valueOf('oidProgram')) : '';
        const idle = finished ? t('appliance_done') : known ? word || t('off') : '--';

        /** How much longer, for the places that have no clock of their own to count against */
        const left = remaining !== null ? asClock(remaining) : null;
        const note = !running
            ? undefined
            : end !== null
              ? t('appliance_ready_at', asClockTime(end))
              : left
                ? t('appliance_left', `${left.text} ${left.unit}`)
                : undefined;

        const Glyph = data.kind === 'dryer' ? DryerIcon : data.kind === 'dishwasher' ? DishwasherIcon : WasherIcon;

        return {
            accent,
            // a machine that is done is worth a card in its colour; one that is running is looked at, not seen
            active: finished,
            icon: <Glyph style={{ width: '100%', height: '100%' }} />,
            value: running ? word || t('appliance_running') : idle,
            valueColor: accent,
            label: note,
            stateText: note || idle,
            body:
                context.layout === 'default' ? (
                    <LiveDrum
                        running={running}
                        start={start}
                        end={end}
                        remaining={remaining}
                        elapsed={elapsed}
                        progress={progress}
                        fill={!!data.fill}
                        memory={data.fill ? data.oidRemaining || data.oidEnd || data.oid : undefined}
                        settled={known || remaining !== null}
                        idle={idle}
                        // the programme where there is one, and otherwise the time it will be done at
                        note={program || note}
                        accent={accent}
                        track={theme.palette.divider}
                        ink={context.css.text.color ?? theme.palette.text.primary}
                        quiet={context.css.text.color ?? theme.palette.text.secondary}
                        textStyle={context.css.text}
                    />
                ) : null,
            chart: { attrs: ['oidRemaining'] },
        };
    },
});

export default applianceDevice;
