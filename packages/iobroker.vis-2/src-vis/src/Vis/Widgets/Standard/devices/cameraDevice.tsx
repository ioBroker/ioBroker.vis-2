import React from 'react';

import { Videocam as CameraIcon } from '@mui/icons-material';

import { Types } from '@iobroker/type-detector';

import CameraView from '../Base/controls/CameraView';
import { asNumber, asText } from '../Base/controls/stateValue';
import { defineDeviceWidget, type StandardRxData } from '../Base/defineDeviceWidget';

interface CameraRxData extends StandardRxData {
    /** A fixed address of the picture */
    src?: string;
    /** How often a new picture is fetched, in seconds */
    refresh?: number | string;
    /** `cover` fills the box and crops, `contain` shows the whole picture */
    fit?: 'cover' | 'contain';
    /** The camera hangs at an angle */
    rotate?: number | string;
}

/**
 * The camera: the picture it takes, and nothing else.
 *
 * Where the picture comes from is the installation's business - the `cameras` adapter serves one behind an
 * address, a doorbell serves one over HTTP, and a state that carries a `data:image/...` is a picture in
 * itself. All three end up in the same widget, and it asks for a new one as often as it is told to.
 *
 * On a floor plan a camera is a dot like everything else: a picture the size of a coin is no picture. The
 * click opens the card, and that is where the picture is.
 */
const cameraDevice = defineDeviceWidget<CameraRxData>({
    name: 'Camera',
    label: 'widget_camera',
    help: 'help_camera',
    picture: {
        glyph:
            '<rect x="2.5" y="6" width="13" height="12" rx="2" stroke-width="2"/>' +
            '<path d="M15.5 11l6-3.5v9l-6-3.5z" stroke-width="2" stroke-linejoin="round"/>',
        camera: true,
    },
    prev:
        '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
        '<rect x="3" y="9" width="17" height="15" rx="2" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M20 14l9-5v14l-9-5z" fill="currentColor" opacity="0.6"/></svg>',
    deviceTypes: [Types.camera, Types.image],
    fields: [
        { name: 'src', label: 'camera_src' },
        { name: 'oid', type: 'id', label: 'camera_oid', tooltip: 'camera_oid_tooltip' },
        { name: 'refresh', type: 'number', label: 'camera_refresh', min: 0, default: 10 },
        {
            name: 'fit',
            type: 'select',
            label: 'camera_fit',
            default: 'cover',
            options: [
                { value: 'cover', label: 'camera_fit_cover' },
                { value: 'contain', label: 'camera_fit_contain' },
            ],
        },
        {
            name: 'rotate',
            type: 'select',
            label: 'camera_rotate',
            default: '0',
            options: [
                { value: '0', label: 'camera_rotate_0' },
                { value: '90', label: 'camera_rotate_90' },
                { value: '180', label: 'camera_rotate_180' },
                { value: '270', label: 'camera_rotate_270' },
            ],
        },
    ],
    tile: { columns: 6, rows: 4, minColumns: 3, minRows: 2 },
    markerShape: 'icon',
    // a picture the size of a coin is no picture: the click opens the card it belongs on
    popup: true,
    render: context => {
        const { data, accents, theme, t } = context;
        const fromState = data.oid ? asText(context.valueOf('oid')) : '';
        const src = fromState || data.src || '';

        return {
            accent: src ? accents.blue : accents.off,
            active: false,
            icon: <CameraIcon style={{ width: '100%', height: '100%' }} />,
            // the picture is the widget; the other two layouts have no room for it and say the name instead
            body:
                context.layout === 'default' ? (
                    <CameraView
                        src={src}
                        refresh={asNumber(data.refresh) ?? 10}
                        fit={data.fit === 'contain' ? 'contain' : 'cover'}
                        rotate={asNumber(data.rotate) ?? 0}
                        emptyText={t('camera_src')}
                        quiet={theme.palette.text.disabled}
                        outline={theme.palette.divider}
                    />
                ) : null,
            stateText: src ? t('widget_camera') : '--',
        };
    },
});

export default cameraDevice;
