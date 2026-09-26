import React from 'react';

import {
    MusicNote as MediaIcon,
    Pause as PauseIcon,
    PlayArrow as PlayIcon,
    SkipNext as NextIcon,
    SkipPrevious as PreviousIcon,
    VolumeOff as MutedIcon,
    VolumeUp as VolumeIcon,
} from '@mui/icons-material';

import { Types } from '@iobroker/type-detector';

import FatSlider from '../Base/controls/FatSlider';
import { asNumber, asText } from '../Base/controls/stateValue';
import { defineDeviceWidget, type DeviceContext, type StandardRxData } from '../Base/defineDeviceWidget';
import { limitsOf } from '../Base/limits';

interface MediaRxData extends StandardRxData {
    /** What is playing */
    oidTitle?: string;
    oidArtist?: string;
    /** The picture of the album, as an address or as a `data:image/...` */
    oidCover?: string;
    /** The buttons; a player that has only `oid` is started and stopped with that one */
    oidPlay?: string;
    oidPause?: string;
    oidNext?: string;
    oidPrev?: string;
    /** How loud it is */
    oidVolume?: string;
    oidMute?: string;
    /** How long the track is and how far it has come, both in seconds */
    oidDuration?: string;
    oidElapsed?: string;
    min?: number | string;
    max?: number | string;
}

/** Whether the player is playing, out of whatever its state carries */
function isPlaying(context: DeviceContext<MediaRxData>): boolean {
    const raw = context.valueOf('oid');
    if (typeof raw === 'boolean') {
        return raw;
    }
    const text = asText(raw).toLowerCase();
    // players say this in words as often as in booleans, and they say it in three or four of them
    return text === 'play' || text === 'playing' || text === '1' || text === 'true';
}

/** A length in seconds as `3:07` */
function asTime(seconds: number | null): string {
    if (seconds === null || seconds < 0) {
        return '';
    }
    const whole = Math.floor(seconds);
    return `${Math.floor(whole / 60)}:${(whole % 60).toString().padStart(2, '0')}`;
}

/**
 * The player: what is playing, and the four buttons one reaches for.
 *
 * Which of them a given player has is its own business - some have one state that is play and pause
 * at once, some have a button per action - so every one of them is a field and the card shows what it
 * was given. A player without a next button simply has none.
 *
 * The cover, where there is one, is what the card is mostly made of: a title in twelve point tells
 * you what is playing, a cover tells you across the room.
 */
const mediaDevice = defineDeviceWidget<MediaRxData>({
    name: 'Media',
    label: 'widget_media',
    help: 'help_media',
    picture: {
        glyph:
            '<circle cx="8" cy="17.5" r="3" stroke-width="2"/>' +
            '<path d="M11 17.5V5l9-2v12.5" stroke-width="2" stroke-linejoin="round"/>' +
            '<circle cx="17" cy="15.5" r="3" stroke-width="2"/>',
        value: 'Titel',
        slider: true,
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<circle cx="10" cy="23" r="4" stroke="currentColor" stroke-width="2.5"/>' +
        '<path d="M14 23V7l12-2.5V19" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<circle cx="22" cy="19" r="4" stroke="currentColor" stroke-width="2.5"/></svg>',
    deviceTypes: [Types.media],
    fields: [
        { name: 'oid', type: 'id', label: 'oid_media_state' },
        { name: 'oidTitle', type: 'id', label: 'oid_title' },
        { name: 'oidArtist', type: 'id', label: 'oid_artist' },
        { name: 'oidCover', type: 'id', label: 'oid_cover' },
        { name: 'oidPlay', type: 'id', label: 'oid_play' },
        { name: 'oidPause', type: 'id', label: 'oid_pause_media' },
        { name: 'oidPrev', type: 'id', label: 'oid_previous' },
        { name: 'oidNext', type: 'id', label: 'oid_next' },
        { name: 'oidVolume', type: 'id', label: 'oid_volume' },
        { name: 'oidMute', type: 'id', label: 'oid_mute' },
        { name: 'oidElapsed', type: 'id', label: 'oid_elapsed' },
        { name: 'oidDuration', type: 'id', label: 'oid_duration' },
        { name: 'min', type: 'number', label: 'min', hidden: '!data.oidVolume' },
        { name: 'max', type: 'number', label: 'max', hidden: '!data.oidVolume' },
    ],
    tile: { columns: 6, rows: 4, minColumns: 4, minRows: 3 },
    markerShape: 'icon',
    // four buttons and a volume slider do not fit on a coin
    popup: true,
    render: context => {
        const { data, accents, theme, t } = context;

        const playing = isPlaying(context);
        const title = asText(context.valueOf('oidTitle'));
        const artist = asText(context.valueOf('oidArtist'));
        const cover = asText(context.valueOf('oidCover'));
        const muted = data.oidMute ? !!context.valueOf('oidMute') : false;

        const volume = asNumber(context.valueOf('oidVolume'));
        const volumeLimits = limitsOf(context, 'oidVolume');

        const elapsed = asNumber(context.valueOf('oidElapsed'));
        const duration = asNumber(context.valueOf('oidDuration'));
        const progress = elapsed !== null && duration ? Math.max(0, Math.min(100, (elapsed / duration) * 100)) : null;

        const accent = playing ? accents.blue : accents.off;

        /** Play or pause, with whatever states this player was given */
        const togglePlay = (): void => {
            if (playing && data.oidPause) {
                context.setValue(data.oidPause, true);
            } else if (!playing && data.oidPlay) {
                context.setValue(data.oidPlay, true);
            } else if (data.oid) {
                // one state for both: a boolean is turned round, a word is written as a word
                const raw = context.valueOf('oid');
                context.setValue(data.oid, typeof raw === 'boolean' ? !playing : playing ? 'pause' : 'play');
            }
        };

        const round = (icon: React.ReactNode, onClick: () => void, big?: boolean): React.JSX.Element => (
            <button
                type="button"
                disabled={context.editMode}
                onClick={onClick}
                style={{
                    width: big ? 40 : 32,
                    height: big ? 40 : 32,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    border: `1px solid ${big ? accent : theme.palette.divider}`,
                    background: big ? `${accent}22` : 'transparent',
                    color: big ? accent : theme.palette.text.secondary,
                    cursor: context.editMode ? undefined : 'pointer',
                    padding: 0,
                }}
            >
                <span style={{ display: 'flex', width: big ? 24 : 18, height: big ? 24 : 18 }}>{icon}</span>
            </button>
        );

        return {
            accent,
            active: false,
            icon: <MediaIcon style={{ width: '100%', height: '100%' }} />,
            // the title is what the card is about; the artist rides under it
            value: title || t('media_nothing'),
            valueColor: title ? theme.palette.text.primary : theme.palette.text.disabled,
            label: artist || undefined,
            stateText: [title, artist].filter(part => part).join(' · ') || t('media_nothing'),
            body:
                context.layout === 'default' && cover ? (
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: 8,
                            overflow: 'hidden',
                            display: 'flex',
                        }}
                    >
                        <img
                            src={cover}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                ) : null,
            footer:
                context.layout === 'default' ? (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {/* how far the track has come, and the two times beside it */}
                        {progress !== null ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 11, color: theme.palette.text.secondary }}>
                                    {asTime(elapsed)}
                                </span>
                                <div
                                    style={{
                                        flex: 1,
                                        height: 4,
                                        borderRadius: 2,
                                        background: theme.palette.divider,
                                        overflow: 'hidden',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: `${progress}%`,
                                            height: '100%',
                                            background: accent,
                                            transition: 'width 1s linear',
                                        }}
                                    />
                                </div>
                                <span style={{ fontSize: 11, color: theme.palette.text.secondary }}>
                                    {asTime(duration)}
                                </span>
                            </div>
                        ) : null}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                            {data.oidPrev
                                ? round(<PreviousIcon />, () => context.setValue(data.oidPrev as string, true))
                                : null}
                            {round(playing ? <PauseIcon /> : <PlayIcon />, togglePlay, true)}
                            {data.oidNext
                                ? round(<NextIcon />, () => context.setValue(data.oidNext as string, true))
                                : null}
                        </div>

                        {data.oidVolume ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span
                                    style={{
                                        display: 'flex',
                                        width: 18,
                                        height: 18,
                                        flexShrink: 0,
                                        color: muted ? accents.red : theme.palette.text.secondary,
                                        cursor: data.oidMute && !context.editMode ? 'pointer' : undefined,
                                    }}
                                    onClick={() =>
                                        data.oidMute && !context.editMode
                                            ? context.setValue(data.oidMute, !muted)
                                            : undefined
                                    }
                                >
                                    {muted ? <MutedIcon /> : <VolumeIcon />}
                                </span>
                                <FatSlider
                                    value={volume ?? volumeLimits.min}
                                    min={volumeLimits.min}
                                    max={volumeLimits.max}
                                    step={volumeLimits.step}
                                    color={accent}
                                    disabled={context.editMode}
                                    onChange={value => context.preview('oidVolume', value, true)}
                                    onChangeCommitted={value => {
                                        context.preview('oidVolume', value, false);
                                        context.setValue(data.oidVolume as string, value);
                                    }}
                                />
                            </div>
                        ) : null}
                    </div>
                ) : null,
        };
    },
});

export default mediaDevice;
