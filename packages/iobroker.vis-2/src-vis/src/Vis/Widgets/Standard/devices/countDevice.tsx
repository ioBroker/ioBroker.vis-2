import React from 'react';

import { Checklist as CountIcon } from '@mui/icons-material';

import { I18n } from '@iobroker/gui-components';

import { describeObject } from '../Base/adoptObject';
import { countSentence, countsAsOn } from '../Base/controls/countStates';
import { softChip } from '../Base/tokens';
import { defineDeviceWidget, type DeviceContext, type StandardRxData } from '../Base/defineDeviceWidget';

/** The most states one card counts; past that it is a list of its own */
const MAX_STATES = 40;

interface CountRxData extends StandardRxData {
    /** How many states are counted */
    states?: number | string;
    /** What the card says while some of them are on, with `%s` for how many */
    countText?: string;
    /** What it says while none is */
    zeroText?: string;
    /** The colour while some are on; without it yellow, or red for an alarm */
    countColor?: string;
    /** Some being on is something to be alarmed about */
    alarm?: boolean | 'true';
    /** The names of those that are on stand on the card */
    showList?: boolean | 'true' | 'false';
}

/** One of the counted states */
interface Counted {
    name: string;
    on: boolean;
    known: boolean;
}

/**
 * The states the card was given, with their names and whether they are on.
 *
 * @param context - the widget, its states and its settings
 */
function countedOf(context: DeviceContext<CountRxData>): Counted[] {
    const count = Math.max(0, Math.min(parseInt(`${context.data.states ?? 0}`, 10) || 0, MAX_STATES));
    const result: Counted[] = [];

    for (let index = 1; index <= count; index++) {
        const attr = `oidCount${index}`;
        const id = context.data[attr] as string | undefined;
        if (!id) {
            continue;
        }
        const raw = context.valueOf(attr);
        const inverted =
            context.data[`countInverted${index}`] === true || context.data[`countInverted${index}`] === 'true';
        const known = raw !== undefined && raw !== null;
        const on = known && (inverted ? !countsAsOn(raw) : countsAsOn(raw));
        result.push({ name: context.data[`countName${index}`] || id.split('.').pop() || id, on, known });
    }
    return result;
}

/**
 * The status tile: how many of a group of states are on, and which.
 *
 * "3 windows open", "2 lights on", "1 battery low" - a question about a whole house that no single device can
 * answer, and that a page full of sensors only answers to whoever counts them. The tile counts them: the sentence
 * with the number in it, another sentence for none, a colour for some, and the names of those that are on, so
 * that "which ones" does not need another page.
 */
const countDevice = defineDeviceWidget<CountRxData>({
    name: 'Count',
    label: 'widget_count',
    help: 'help_count',
    picture: {
        glyph:
            '<path d="M4 6.5l1.8 1.8L9 5M4 13.5l1.8 1.8L9 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<path d="M12 7h8M12 14h8M4 20h16" stroke-width="2" stroke-linecap="round"/>',
        value: '3',
        label: 'offen',
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5" ' +
        'stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M5 9l2.5 2.5L12 7M5 19l2.5 2.5L12 17M16 9h11M16 19h11"/></svg>',
    deviceTypes: [],
    fields: [
        {
            name: 'states',
            type: 'number',
            label: 'count_states',
            min: 1,
            max: MAX_STATES,
            default: 3,
        },
        { name: 'countText', label: 'count_text', tooltip: 'count_text_tooltip' },
        { name: 'zeroText', label: 'count_zero_text', tooltip: 'count_zero_text_tooltip' },
        { name: 'countColor', type: 'color', label: 'count_color' },
        { name: 'alarm', type: 'checkbox', label: 'sensor_alarm', tooltip: 'count_alarm_tooltip' },
        { name: 'showList', type: 'checkbox', label: 'count_list', default: true },
    ],
    groups: [
        {
            name: 'counted',
            label: 'group_counted',
            indexFrom: 1,
            indexTo: 'states',
            fields: [
                {
                    name: 'oidCount',
                    type: 'id',
                    label: 'oid',
                    // the name is taken over from the object, so a group of ten windows is ten clicks
                    onChange: async (_field, data, changeData, socket, index): Promise<void> => {
                        const suffix = index ?? '';
                        if (data[`countName${suffix}`]) {
                            return;
                        }
                        const described = await describeObject(socket, data[`oidCount${suffix}`], I18n.getLanguage());
                        if (described.name) {
                            data[`countName${suffix}`] = described.name;
                            changeData(data);
                        }
                    },
                },
                { name: 'countName', label: 'name' },
                { name: 'countInverted', type: 'checkbox', label: 'inverted' },
            ],
        },
    ],
    tile: { columns: 6, rows: 3, minColumns: 3, minRows: 2 },
    markerShape: 'icon',
    // the names of those that are on do not fit on a coin; the click brings up the card
    popup: true,
    render: context => {
        const { data, accents, tokens } = context;

        const counted = countedOf(context);
        const on = counted.filter(item => item.on);
        const known = counted.some(item => item.known);
        const alarm = data.alarm === true || data.alarm === 'true';

        const accent = !known
            ? accents.off
            : on.length
              ? data.countColor || (alarm ? accents.red : accents.yellow)
              : accents.green;
        const sentence = known ? countSentence(on.length, data.countText, data.zeroText) : '--';
        const withList = data.showList !== false && data.showList !== 'false' && context.layout === 'default';
        const chip = softChip(accent);

        return {
            accent,
            active: alarm && on.length > 0,
            icon: <CountIcon style={{ width: '100%', height: '100%' }} />,
            value: sentence,
            valueColor: on.length ? accent : undefined,
            valueOnTop: true,
            stateText: sentence,
            marker: known ? { text: `${on.length}` } : undefined,
            body:
                withList && on.length ? (
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignContent: 'flex-start',
                            gap: 4,
                            height: '100%',
                            overflow: 'hidden',
                        }}
                    >
                        {on.map((item, index) => (
                            <span
                                key={`${item.name}-${index}`}
                                title={item.name}
                                style={{
                                    ...chip,
                                    borderRadius: 999,
                                    padding: '1px 8px',
                                    fontSize: tokens.smallSize,
                                    lineHeight: 1.5,
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    boxSizing: 'border-box',
                                }}
                            >
                                {item.name}
                            </span>
                        ))}
                    </div>
                ) : undefined,
        };
    },
});

export default countDevice;
