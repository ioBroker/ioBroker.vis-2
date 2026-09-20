import React, { type CSSProperties } from 'react';

import {
    rgbaToHsva,
    hsvaToHsla,
    hsvaToRgba,
    hexToHsva,
    hsvaToHex,
    hslaToHsva,
    rgbaToHex,
    type HsvaColor,
} from './Components/colorUtils';
import ColorWheel, { ShadeSlider } from './Components/ColorWheel';

import { Button, Dialog, DialogContent, DialogTitle, IconButton, Slider, Switch, Tooltip } from '@mui/material';

import { Brightness6, Close, ColorLens, Thermostat, WbAuto } from '@mui/icons-material';
import TbSquareLetterW from './Components/TbSquareLetterW';

import { ColorPicker, Icon, type Connection } from '@iobroker/gui-components';

import Generic from './Generic';
import type {
    RxRenderWidgetProps,
    RxWidgetInfo,
    RxWidgetInfoAttributesField,
    VisWidgetCommand,
    WidgetData,
    VisRxWidgetState,
    VisRxWidgetStateValues,
    VisRxWidgetProps,
} from '@iobroker/types-vis-2';

/**
 * Determine if we are on a mobile device
 */
/*
function mobileCheck(): boolean {
    let check = false;
    // @ts-expect-error
    const userAgent = window.navigator.userAgent || window.navigator.vendor || window.opera;
    if (
        /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series([46])0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
            userAgent,
        ) ||
        /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br([ev])w|bumb|bw-([nu])|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do([cp])o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly([-_])|g1 u|g560|gene|gf-5|g-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd-([mpt])|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c([- _agpst])|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac([ \-/])|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja([tv])a|jbro|jemu|jigs|kddi|keji|kgt([ /])|klon|kpt |kwc-|kyo([ck])|le(no|xi)|lg( g|\/([klu])|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t([- ov])|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30([02])|n50([025])|n7(0([01])|10)|ne(([cm])-|on|tf|wf|wg|wt)|nok([6i])|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan([adt])|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c([-01])|47|mc|nd|ri)|sgh-|shar|sie([-m])|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl-|tdg-|tel([im])|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c([- ])|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(
            userAgent.substr(0, 4),
        )
    ) {
        check = true;
    }
    return check;
}
*/
/**
 * Determine if the device supports touch input
 */
/* function isTouchDevice(): boolean {
    if (!mobileCheck()) {
        return false;
    }
    return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-expect-error this is only for Internet Explorer 10, if unsupported remove it.
        navigator.msMaxTouchPoints > 0
    );
}
*/
const styles: Record<string, CSSProperties> = {
    rgbDialog: {
        maxWidth: 400,
    },
    rgbSliderContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
    },
    rgbDialogContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        width: 'calc(100% - 20px)', // handler of slider is 20px
    },
    rgbWheel: {
        display: 'flex',
        justifyContent: 'center',
    },
    rgbContent: {
        width: '100%',
        height: '100%',
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        overflow: 'hidden',
        alignItems: 'center',
    },
    tooltip: {
        pointerEvents: 'none',
    },
};

export type RGB_NAMES_TYPE =
    | 'switch'
    | 'brightness'
    | 'rgb'
    | 'red'
    | 'green'
    | 'blue'
    | 'white'
    | 'color_temperature'
    | 'hue'
    | 'saturation'
    | 'luminance'
    | 'white_mode';

export const RGB_ROLES: { [role: string]: RGB_NAMES_TYPE } = {
    'switch.light': 'switch',
    switch: 'switch',
    'level.brightness': 'brightness',
    'level.dimmer': 'brightness',
    'level.color.red': 'red',
    'level.color.green': 'green',
    'level.color.blue': 'blue',
    'level.color.white': 'white',
    'level.color.rgb': 'rgb',
    'level.color.hue': 'hue',
    'level.color.saturation': 'saturation',
    'level.color.luminance': 'luminance',
    'level.color.temperature': 'color_temperature',
};

// From http://www.tannerhelland.com/4435/convert-temperature-rgb-algorithm-code/

// Start with a temperature, in Kelvin, somewhere between 1000 and 40000.  (Other values may work,
//  but I can't make any promises about the quality of the algorithm's estimates above 40000 K.)
function limit(x: number, min: number, max: number): number {
    if (x < min) {
        return min;
    }
    if (x > max) {
        return max;
    }

    return x;
}

export const colorTemperatureToRGB = (kelvin: number): { red: number; green: number; blue: number } => {
    const temp = kelvin / 100;

    let red;
    let green;
    let blue;

    if (temp <= 66) {
        red = 255;

        green = temp;
        green = 99.4708025861 * Math.log(green) - 161.1195681661;

        if (temp <= 19) {
            blue = 0;
        } else {
            blue = temp - 10;
            blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
        }
    } else {
        red = temp - 60;
        red = 329.698727446 * red ** -0.1332047592;

        green = temp - 60;
        green = 288.1221695283 * green ** -0.0755148492;

        blue = 255;
    }

    return {
        red: limit(red, 0, 255),
        green: limit(green, 0, 255),
        blue: limit(blue, 0, 255),
    };
};

const loadStates = async (
    field: RxWidgetInfoAttributesField,
    data: WidgetData,
    changeData: (newData: WidgetData) => void,
    socket: Connection,
): Promise<void> => {
    if (data[field.name!]) {
        const object = await socket.getObject(data[field.name!]);
        if (object?.common) {
            const id = data[field.name!].split('.');
            id.pop();
            // get all siblings of the object
            const states = await socket.getObjectViewSystem('state', `${id.join('.')}.`, `${id.join('.')}.\u9999`);
            if (states) {
                Object.values(states).forEach(state => {
                    const role = state.common?.role;
                    if (
                        role &&
                        RGB_ROLES[role] &&
                        (!data[role] || data[role] === 'nothing_selected') //&&
                        //  field.name !== role
                    ) {
                        data[RGB_ROLES[role]] = state._id;
                        if (RGB_ROLES[role] === 'color_temperature') {
                            const common = state.common;
                            if (!data.ct_min && common.min) {
                                data.ct_min = common.min;
                            }
                            if (!data.ct_max && common.max) {
                                data.ct_max = common.max;
                            }
                        }
                    }
                });
                changeData(data);
            }
        }
    }
};

export const RGB_NAMES: RGB_NAMES_TYPE[] = [
    'switch',
    'brightness',
    'rgb',
    'red',
    'green',
    'blue',
    'white',
    'color_temperature',
    'hue',
    'saturation',
    'luminance',
    'white_mode',
];

interface RGBLightRxData {
    noCard: boolean;
    fullSize: boolean;
    widgetTitle: string;
    icon: string;
    switch: string;
    brightness: string;
    rgbType: 'hue/sat/lum' | 'rgb' | 'rgbw' | 'r/g/b' | 'r/g/b/w' | 'ct';
    rgb: string;
    red: string;
    green: string;
    blue: string;
    white: string;
    color_temperature: string;
    ct_min: number;
    ct_max: number;
    hue: string;
    saturation: string;
    luminance: string;
    hideBrightness: boolean;
    white_mode: string;
    noRgbPalette: boolean;
    timeout: number | string;
    toggleOnClick: boolean;
    pressDuration: number | string;
    borderRadius: number | string;
    color: string;
    colorEnabled: string;
    onlyCircle: boolean;
    externalDialog: boolean;
}

interface RGBLightState extends VisRxWidgetState {
    dialog: boolean;
    rgbObjects: Record<string, ioBroker.Object>;
    colorTemperatures: Array<{ red: number; green: number; blue: number }>;
    sketch: boolean;
    controlValue: { id: RGB_NAMES_TYPE | ''; value: number | string | boolean; changed: boolean } | null;
}

export default class RGBLight extends Generic<RGBLightRxData, RGBLightState> {
    private readonly contentRef: React.RefObject<HTMLDivElement | null> = React.createRef();
    private timeouts: Record<string, ReturnType<typeof setTimeout> | null> = {};
    private _pressTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(props: VisRxWidgetProps) {
        super(props);
        this.state = {
            ...this.state,
            dialog: false,
            rgbObjects: {},
            colorTemperatures: [],
            sketch: false,
            controlValue: null,
        };
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplMaterial2RGBLight',
            visSet: 'devices',
            visSetLabel: 'set_label',
            visSetColor: '#00897b',
            visName: 'RGBLight',
            visWidgetLabel: 'rgb_light',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        {
                            name: 'noCard',
                            label: 'without_card',
                            type: 'checkbox',
                            hidden: '!!data.externalDialog',
                        },
                        {
                            name: 'fullSize',
                            label: 'fullSize',
                            type: 'checkbox',
                            hidden: '!!data.externalDialog',
                        },
                        {
                            name: 'widgetTitle',
                            label: 'name',
                            hidden: '!!data.noCard',
                        },
                        {
                            name: 'icon',
                            type: 'icon64',
                            label: 'icon',
                            default:
                                'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iY3VycmVudENvbG9yIj4NCiAgICA8cGF0aCBkPSJNMTIgM2MtNC45NyAwLTkgNC4wMy05IDlzNC4wMyA5IDkgOWMuODMgMCAxLjUtLjY3IDEuNS0xLjUgMC0uMzktLjE1LS43NC0uMzktMS4wMS0uMjMtLjI2LS4zOC0uNjEtLjM4LS45OSAwLS44My42Ny0xLjUgMS41LTEuNUgxNmMyLjc2IDAgNS0yLjI0IDUtNSAwLTQuNDItNC4wMy04LTktOHptLTUuNSA5Yy0uODMgMC0xLjUtLjY3LTEuNS0xLjVTNS42NyA5IDYuNSA5IDggOS42NyA4IDEwLjUgNy4zMyAxMiA2LjUgMTJ6bTMtNEM4LjY3IDggOCA3LjMzIDggNi41UzguNjcgNSA5LjUgNXMxLjUuNjcgMS41IDEuNVMxMC4zMyA4IDkuNSA4em01IDBjLS44MyAwLTEuNS0uNjctMS41LTEuNVMxMy42NyA1IDE0LjUgNXMxLjUuNjcgMS41IDEuNVMxNS4zMyA4IDE0LjUgOHptMyA0Yy0uODMgMC0xLjUtLjY3LTEuNS0xLjVTMTYuNjcgOSAxNy41IDlzMS41LjY3IDEuNSAxLjUtLjY3IDEuNS0xLjUgMS41eiIvPg0KPC9zdmc+DQo=',
                            hidden: '!!data.externalDialog',
                        },
                        {
                            name: 'switch',
                            type: 'id',
                            label: 'switch',
                            onChange: loadStates,
                        },
                        {
                            name: 'brightness',
                            type: 'id',
                            label: 'brightness',
                            onChange: loadStates,
                        },
                        {
                            name: 'rgbType',
                            label: 'type',
                            type: 'select',
                            noTranslation: true,
                            options: ['rgb', 'rgbw', 'r/g/b', 'r/g/b/w', 'hue/sat/lum', 'ct'],
                            onChange: loadStates,
                        },
                        {
                            name: 'rgb',
                            type: 'id',
                            label: 'rgb',
                            hidden: (data: WidgetData) => data.rgbType !== 'rgb' && data.rgbType !== 'rgbw',
                            onChange: loadStates,
                        },
                        {
                            name: 'red',
                            type: 'id',
                            label: 'red',
                            hidden: (data: WidgetData) => data.rgbType !== 'r/g/b' && data.rgbType !== 'r/g/b/w',
                            onChange: loadStates,
                        },
                        {
                            name: 'green',
                            type: 'id',
                            label: 'green',
                            hidden: (data: WidgetData) => data.rgbType !== 'r/g/b' && data.rgbType !== 'r/g/b/w',
                            onChange: loadStates,
                        },
                        {
                            name: 'blue',
                            type: 'id',
                            label: 'blue',
                            hidden: (data: WidgetData) => data.rgbType !== 'r/g/b' && data.rgbType !== 'r/g/b/w',
                            onChange: loadStates,
                        },
                        {
                            name: 'white',
                            type: 'id',
                            label: 'white',
                            hidden: (data: WidgetData) => data.rgbType !== 'r/g/b/w' && data.rgbType !== 'rgbw',
                            onChange: loadStates,
                        },
                        {
                            name: 'color_temperature',
                            type: 'id',
                            label: 'color_temperature',
                            hidden: (data: WidgetData) => data.rgbType !== 'ct',
                            onChange: loadStates,
                        },
                        {
                            name: 'ct_min',
                            type: 'number',
                            min: 500,
                            max: 10000,
                            label: 'color_temperature_min',
                            hidden: (data: WidgetData) => data.rgbType !== 'ct' || !data.color_temperature,
                        },
                        {
                            name: 'ct_max',
                            type: 'number',
                            min: 500,
                            max: 10000,
                            label: 'color_temperature_max',
                            hidden: (data: WidgetData) => data.rgbType !== 'ct' || !data.color_temperature,
                        },
                        {
                            name: 'hue',
                            type: 'id',
                            label: 'hue',
                            hidden: (data: WidgetData) => data.rgbType !== 'hue/sat/lum',
                            onChange: loadStates,
                        },
                        {
                            name: 'saturation',
                            type: 'id',
                            label: 'saturation',
                            hidden: (data: WidgetData) => data.rgbType !== 'hue/sat/lum',
                            onChange: loadStates,
                        },
                        {
                            name: 'luminance',
                            type: 'id',
                            label: 'luminance',
                            hidden: (data: WidgetData) => data.rgbType !== 'hue/sat/lum',
                            onChange: loadStates,
                        },
                        {
                            name: 'hideBrightness',
                            type: 'checkbox',
                            label: 'hideBrightness',
                            hidden: (data: WidgetData) =>
                                data.rgbType !== 'rgb' &&
                                data.rgbType !== 'rgbw' &&
                                data.rgbType !== 'r/g/b' &&
                                data.rgbType !== 'r/g/b/w',
                            onChange: loadStates,
                        },
                        {
                            name: 'white_mode',
                            type: 'id',
                            label: 'whiteMode',
                            tooltip: 'whiteModeTooltip',
                            hidden: (data: WidgetData) => data.rgbType !== 'rgbw' && data.rgbType !== 'r/g/b/w',
                            onChange: loadStates,
                        },
                        {
                            name: 'noRgbPalette',
                            type: 'checkbox',
                            label: 'noRgbPalette',
                            hidden: (data: WidgetData) =>
                                data.rgbType !== 'rgb' &&
                                data.rgbType !== 'rgbw' &&
                                data.rgbType !== 'r/g/b' &&
                                data.rgbType !== 'r/g/b/w',
                            onChange: loadStates,
                        },
                        {
                            name: 'timeout',
                            label: 'controlTimeout',
                            tooltip: 'In milliseconds',
                            type: 'number',
                            min: 0,
                            max: 2000,
                        },
                        {
                            name: 'toggleOnClick',
                            label: 'toggleOnClick',
                            type: 'checkbox',
                            hidden: '!data.switch',
                        },
                        {
                            label: 'pressDuration',
                            name: 'pressDuration',
                            tooltip: 'pressDuration_tooltip',
                            type: 'slider',
                            min: 100,
                            max: 3000,
                            hidden: '!data.toggleOnClick || !data.switch',
                        },
                        {
                            label: 'borderRadius',
                            name: 'borderRadius',
                            type: 'slider',
                            min: 0,
                            max: 100,
                            hidden: '!data.noCard',
                        },
                        {
                            name: 'color',
                            type: 'color',
                            label: 'color',
                        },
                        {
                            name: 'colorEnabled',
                            type: 'color',
                            label: 'color_active',
                        },
                        {
                            name: 'onlyCircle',
                            label: 'onlyCircle',
                            type: 'checkbox',
                        },
                        {
                            name: 'externalDialog',
                            label: 'use_as_dialog',
                            type: 'checkbox',
                            tooltip: 'use_as_dialog_tooltip',
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: '100%',
                height: 120,
                position: 'relative',
            },
            visPrev: 'widgets/devices/img/prev_rgb_light.png',
        };
    }

    async componentDidMount(): Promise<void> {
        super.componentDidMount();
        await this.rgbReadObjects();
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        this.rgbDestroy();
    }

    async onRxDataChanged(): Promise<void> {
        await this.rgbReadObjects();
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return RGBLight.getWidgetInfo();
    }

    rgbGetIdMin = (id: string): number => {
        if (id === 'color_temperature') {
            return this.state.rxData.ct_min || this.state.rgbObjects[id]?.common?.min || 0;
        }
        return this.state.rgbObjects[id]?.common?.min || 0;
    };

    rgbGetIdMax = (id: string): number => {
        if (id === 'color_temperature') {
            return this.state.rxData.ct_max || this.state.rgbObjects[id]?.common?.max || 0;
        }

        return this.state.rgbObjects[id]?.common?.max || 0;
    };

    rgbSetId = (id: RGB_NAMES_TYPE, value: number | string | boolean): void => {
        if (this.state.rgbObjects[id]) {
            if (this.timeouts[id]) {
                clearTimeout(this.timeouts[id]);
                this.timeouts[id] = null;
            }

            // control switch directly without timeout
            if (id === 'switch' || id === 'white_mode') {
                this.props.context.setValue(this.state.rxData[id], value);
            } else {
                this.setState({ controlValue: { id, value, changed: !!this.state.controlValue?.changed } }, () => {
                    this.timeouts[id] = setTimeout(
                        () => {
                            this.timeouts[id] = null;
                            this.props.context.setValue(this.state.rxData[id], value);
                        },
                        parseInt(this.state.rxData.timeout as string, 10) || 200,
                    );
                });
            }
        }
    };

    async rgbReadObjects(): Promise<void> {
        const rgbObjects: Record<string, ioBroker.StateObject> = {};
        const idToRead: string[] = [];
        for (const id of RGB_NAMES) {
            if (this.state.rxData[id] && this.state.rxData[id] !== 'nothing_selected') {
                idToRead.push(this.state.rxData[id]);
            }
        }
        const _objects: Record<string, ioBroker.StateObject> = (await this.props.context.socket.getObjectsById(
            idToRead,
        )) as Record<string, ioBroker.StateObject>;
        const newState: Partial<RGBLightState> = {};

        for (const id of RGB_NAMES) {
            if (this.state.rxData[id]) {
                const object = _objects[this.state.rxData[id]];
                if (object) {
                    rgbObjects[id] = object;
                }
            }
        }
        newState.rgbObjects = rgbObjects;

        // calculate an array of color temperatures to draw slider
        if (rgbObjects.color_temperature) {
            const colors = [];
            let min =
                parseInt(
                    (this.state.rxData.ct_min || rgbObjects.color_temperature?.common?.min) as any as string,
                    10,
                ) || 2700;
            let max =
                parseInt(
                    (this.state.rxData.ct_max || rgbObjects.color_temperature?.common?.max) as any as string,
                    10,
                ) || 6000;
            if (max < min) {
                const tmp = max;
                max = min;
                min = tmp;
            }
            const step = (max - min) / 20;
            if (step) {
                for (let i = min; i <= max; i += step) {
                    colors.push(colorTemperatureToRGB(i));
                }
            }
            newState.colorTemperatures = colors;
        } else {
            newState.colorTemperatures = [];
        }

        this.setState(newState as any);
    }

    rgbDestroy(): void {
        for (const k in this.timeouts) {
            if (this.timeouts[k]) {
                clearTimeout(this.timeouts[k]);
                this.timeouts[k] = null;
            }
        }
    }

    rgbIsOnlyHue = (): boolean =>
        this.state.rxData.rgbType === 'hue/sat/lum' &&
        (!this.state.rgbObjects.saturation || !this.state.rgbObjects.luminance);

    rgbGetWheelColor = (): HsvaColor => {
        let result: HsvaColor = {
            h: 0,
            s: 0,
            v: 0,
            a: 1,
        };

        if (this.state.rxData.rgbType === 'hue/sat/lum') {
            result = hslaToHsva({
                h: this.getPropertyValue('hue'),
                s: this.rgbIsOnlyHue() ? 100 : this.getPropertyValue('saturation'),
                l: this.rgbIsOnlyHue() ? 50 : this.getPropertyValue('luminance'),
                a: 1,
            });
        } else if (this.state.rxData.rgbType === 'r/g/b' || this.state.rxData.rgbType === 'r/g/b/w') {
            result = rgbaToHsva({
                r: this.getPropertyValue('red'),
                g: this.getPropertyValue('green'),
                b: this.getPropertyValue('blue'),
                a: 1,
            });
        } else if (this.state.rxData.rgbType === 'rgb') {
            try {
                const val = this.getPropertyValue('rgb') || '';
                if (val && val.length >= 4) {
                    result = hexToHsva(val);
                } else {
                    result = hexToHsva('#000000');
                }
            } catch (e) {
                console.error(e);
            }
        } else if (this.state.rxData.rgbType === 'rgbw') {
            try {
                const val = this.getPropertyValue('rgb') || '';
                if (val && val.length >= 4) {
                    result = hexToHsva(val);
                } else {
                    result = hexToHsva('#000000');
                }
            } catch (e) {
                console.error(e);
            }
        }

        if (this.state.rxData.hideBrightness) {
            result.v = 100;
        }

        return result;
    };

    rgbSetWheelColor = (color: HsvaColor): void => {
        if (this.state.rxData.rgbType === 'hue/sat/lum') {
            const _color = hsvaToHsla(color);
            this.rgbSetId('hue', color.h);
            if (!this.rgbIsOnlyHue()) {
                this.rgbSetId('saturation', _color.s);
                this.rgbSetId('luminance', _color.l);
            }
        } else if (this.state.rxData.rgbType === 'r/g/b' || this.state.rxData.rgbType === 'r/g/b/w') {
            const _color = hsvaToRgba(color);
            this.rgbSetId('red', _color.r);
            this.rgbSetId('green', _color.g);
            this.rgbSetId('blue', _color.b);
        } else if (this.state.rxData.rgbType === 'rgb') {
            this.rgbSetId('rgb', hsvaToHex(color));
        } else if (this.state.rxData.rgbType === 'rgbw') {
            if (this.state.rgbObjects.white) {
                this.rgbSetId('rgb', hsvaToHex(color));
            } else {
                let val = this.getPropertyValue('rgb') || '#00000000';
                val = hsvaToHex(color) + val.substring(7);
                this.rgbSetId('rgb', val);
            }
        }
    };

    rgbGetWhite = (): number => {
        if (this.state.rxData.rgbType === 'r/g/b/w') {
            return this.getPropertyValue('white');
        }
        if (this.state.rxData.rgbType === 'rgbw') {
            if (this.state.rgbObjects.white) {
                return this.getPropertyValue('white');
            }

            const val = this.getPropertyValue('rgb')?.substring(7);
            return parseInt(val, 16);
        }
        return 0;
    };

    rgbGetWhiteId = (): RGB_NAMES_TYPE | '' => {
        if (this.state.rxData.rgbType === 'r/g/b/w') {
            return 'white';
        }
        if (this.state.rxData.rgbType === 'rgbw') {
            if (this.state.rgbObjects.white) {
                return 'white';
            }

            return 'rgb';
        }
        return '';
    };

    rgbSetWhite = (color: number): void => {
        if (this.state.rxData.rgbType === 'r/g/b/w') {
            this.rgbSetId('white', color);
        } else if (this.state.rxData.rgbType === 'rgbw') {
            if (this.state.rgbObjects.white) {
                this.rgbSetId('white', color);
            } else {
                let val = this.getPropertyValue('rgb') || '#00000000';
                val = val.substring(0, 7) + color.toString(16).padStart(2, '0');
                this.rgbSetId('rgb', val);
            }
        }
    };

    rgbSetWhiteMode = (value: boolean): void => {
        if (this.state.rxData.white_mode) {
            this.rgbSetId('white_mode', value);
        }
    };

    rgbGetWhiteMode = (): boolean | undefined => {
        if (!this.state.rxData.white_mode) {
            return undefined;
        }
        return this.getPropertyValue('white_mode');
    };

    rgbIsRgb = (): boolean => {
        if ((this.state.rxData.rgbType === 'rgb' || this.state.rxData.rgbType === 'rgbw') && this.state.rxData.rgb) {
            return true;
        }

        return !!(
            (this.state.rxData.rgbType === 'r/g/b' || this.state.rxData.rgbType === 'r/g/b/w') &&
            this.state.rgbObjects.red &&
            this.state.rgbObjects.green &&
            this.state.rgbObjects.blue
        );
    };

    rgbIsWhite = (): boolean =>
        !!(
            (this.state.rxData.rgbType === 'rgbw' && this.state.rxData.rgb) ||
            (this.state.rxData.rgbType === 'r/g/b/w' && this.state.rgbObjects.white)
        );

    rgbIsHSL = (): boolean => this.state.rxData.rgbType === 'hue/sat/lum' && !!this.state.rgbObjects.hue;

    rgbRenderSwitch(): React.ReactNode {
        return (
            this.state.rgbObjects.switch && (
                <div
                    style={{
                        ...styles.rgbSliderContainer,
                        justifyContent: 'center',
                    }}
                >
                    {Generic.t('Off')}
                    <Switch
                        checked={this.getPropertyValue('switch') || false}
                        onChange={e => this.rgbSetId('switch', e.target.checked)}
                    />
                    {Generic.t('On')}
                </div>
            )
        );
    }

    onStateUpdated(id: string): void {
        if (this.state.controlValue?.id && this.state.rxData[this.state.controlValue.id] === id) {
            this.setState({
                controlValue: { id: this.state.controlValue.id, value: this.state.controlValue.value, changed: true },
            });
        }
    }

    finishChanging(): void {
        if (this.state.controlValue) {
            const newState: Partial<RGBLightState> = { controlValue: null };
            // If the value was not yet updated, write a new value into "values"
            if (!this.state.controlValue.changed && this.state.controlValue.id) {
                const values: VisRxWidgetStateValues = JSON.parse(JSON.stringify(this.state.values));
                values[`${this.state.rxData[this.state.controlValue.id]}.val`] = this.state.controlValue.value;
                newState.values = values;
            }
            this.setState(newState as any);
        }
    }

    rgbRenderBrightness(): React.ReactNode {
        return (
            this.state.rgbObjects.brightness && (
                <div style={styles.rgbSliderContainer}>
                    <Tooltip
                        title={Generic.t('Brightness')}
                        slotProps={{ popper: { sx: styles.tooltip } }}
                    >
                        <Brightness6 />
                    </Tooltip>
                    <Slider
                        min={this.rgbGetIdMin('brightness') || 0}
                        max={this.rgbGetIdMax('brightness') || 100}
                        valueLabelDisplay="auto"
                        value={
                            this.state.controlValue?.id === 'brightness'
                                ? this.state.controlValue.value
                                : this.getPropertyValue('brightness') || 0
                        }
                        onChange={(e, value) => this.rgbSetId('brightness', value)}
                        onChangeCommitted={() => this.finishChanging()}
                    />
                </div>
            )
        );
    }

    rgbRenderSketch(): React.ReactNode {
        return (
            <div style={styles.rgbWheel}>
                <ColorPicker
                    value={hsvaToHex(this.rgbGetWheelColor())}
                    format="hex"
                    noAlpha
                    onChange={color => this.rgbSetWheelColor(hexToHsva(color))}
                />
            </div>
        );
    }

    rgbRenderWheelTypeSwitch(isWheelVisible: boolean, twoPanels: boolean, whiteMode?: boolean): React.ReactNode {
        if (!isWheelVisible) {
            return null;
        }

        if (whiteMode === null && this.state.rxData.noRgbPalette) {
            return null;
        }

        return (
            !this.rgbIsOnlyHue() && (
                <div style={{ textAlign: twoPanels ? 'right' : undefined }}>
                    {whiteMode !== null ? (
                        <Tooltip
                            title={Generic.t('Switch white mode')}
                            slotProps={{ popper: { sx: styles.tooltip } }}
                        >
                            <IconButton
                                onClick={() => this.rgbSetWhiteMode(!whiteMode)}
                                color={whiteMode ? 'primary' : 'default'}
                            >
                                <WbAuto />
                            </IconButton>
                        </Tooltip>
                    ) : null}
                    {!this.state.rxData.noRgbPalette && whiteMode !== true ? (
                        <Tooltip
                            title={Generic.t('Switch color picker')}
                            slotProps={{ popper: { sx: styles.tooltip } }}
                        >
                            <IconButton onClick={() => this.setState({ sketch: !this.state.sketch })}>
                                <ColorLens />
                            </IconButton>
                        </Tooltip>
                    ) : null}
                </div>
            )
        );
    }

    rgbRenderBrightnessSlider(isWheelVisible: boolean, whiteMode?: boolean): React.ReactNode {
        if (!isWheelVisible || this.state.sketch || this.state.rxData.hideBrightness || whiteMode === true) {
            return null;
        }
        return (
            !this.rgbIsOnlyHue() && (
                <ShadeSlider
                    hsva={this.rgbGetWheelColor()}
                    onChange={value => this.rgbSetWheelColor({ ...this.rgbGetWheelColor(), v: value })}
                />
            )
        );
    }

    rgbRenderWheel(isWheelVisible: boolean, whiteMode?: boolean): React.ReactNode {
        if (!isWheelVisible || whiteMode === true) {
            return null;
        }
        return this.state.sketch ? (
            this.rgbRenderSketch()
        ) : (
            <div style={styles.rgbWheel}>
                <ColorWheel
                    hsva={this.rgbGetWheelColor()}
                    onChange={color => this.rgbSetWheelColor(color)}
                />
            </div>
        );
    }

    rgbRenderWhite(): React.ReactNode {
        if (!this.rgbIsWhite()) {
            return null;
        }
        let min;
        let max;
        if (!this.state.rgbObjects.white) {
            min = 0;
            max = 255;
        } else {
            min = this.rgbGetIdMin('white') || 0;
            max = this.rgbGetIdMax('white') || 100;
        }

        return (
            <div style={styles.rgbSliderContainer}>
                <TbSquareLetterW style={{ width: 24, height: 24 }} />
                <Slider
                    min={min}
                    max={max}
                    valueLabelDisplay="auto"
                    value={
                        this.state.controlValue?.id === this.rgbGetWhiteId()
                            ? (this.state.controlValue.value as number)
                            : this.rgbGetWhite() || 0
                    }
                    onChange={(e, value) => this.rgbSetWhite(value)}
                    onChangeCommitted={() => this.finishChanging()}
                />
            </div>
        );
    }

    rgbRenderColorTemperature(whiteMode?: boolean): React.ReactNode {
        if (this.state.rxData.rgbType !== 'ct' || whiteMode === true) {
            return null;
        }
        return (
            <div style={styles.rgbSliderContainer}>
                <Tooltip
                    title={Generic.t('Color temperature')}
                    slotProps={{ popper: { sx: styles.tooltip } }}
                >
                    <Thermostat />
                </Tooltip>
                <div
                    style={{
                        ...styles.rgbSliderContainer,
                        background: `linear-gradient(to right, ${this.state.colorTemperatures.map(c => `rgb(${c.red}, ${c.green}, ${c.blue})`).join(', ')})`,
                        flex: '1',
                        borderRadius: 4,
                    }}
                >
                    <Slider
                        valueLabelDisplay="auto"
                        min={this.rgbGetIdMin('color_temperature') || 2700}
                        max={this.rgbGetIdMax('color_temperature') || 6000}
                        value={
                            this.state.controlValue?.id === 'color_temperature'
                                ? this.state.controlValue.value
                                : this.getPropertyValue('color_temperature') || 0
                        }
                        onChange={(e, value) => this.rgbSetId('color_temperature', value)}
                        onChangeCommitted={() => this.finishChanging()}
                    />
                </div>
            </div>
        );
    }

    rgbRenderDialog(wheelVisible: boolean, whiteMode?: boolean): React.JSX.Element | null {
        if (!this.state.dialog) {
            return null;
        }
        return (
            <Dialog
                fullWidth
                maxWidth="sm"
                open={!0}
                sx={{ '& .MuiDialog-paper': styles.rgbDialog }}
                onClose={() => this.setState({ dialog: false })}
            >
                <DialogTitle>
                    {this.state.rxData.widgetTitle}
                    <IconButton
                        style={{ float: 'right', zIndex: 2 }}
                        onClick={() => this.setState({ dialog: false })}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent style={{ maxWidth: 400 }}>
                    <div style={styles.rgbDialogContainer}>
                        {this.rgbRenderSwitch()}
                        {this.rgbRenderBrightness()}
                        {this.rgbRenderWhite()}
                        {this.rgbRenderWheelTypeSwitch(wheelVisible, false, whiteMode)}
                        {this.rgbRenderWheel(wheelVisible, whiteMode)}
                        {this.rgbRenderBrightnessSlider(wheelVisible, whiteMode)}
                        {this.rgbRenderColorTemperature(whiteMode)}
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    rgbGetColor = (): string => {
        if (this.state.rxData.rgbType === 'ct') {
            const color = colorTemperatureToRGB(this.getPropertyValue('color_temperature'));
            return rgbaToHex({
                r: color.red,
                g: color.green,
                b: color.blue,
                a: 1,
            });
        }
        return hsvaToHex(this.rgbGetWheelColor());
    };

    rgbGetTextColor = (): string => {
        if (this.state.rxData.rgbType === 'ct') {
            const color = colorTemperatureToRGB(this.getPropertyValue('color_temperature'));
            return color.red + color.green + color.blue > 3 * 128 ? '#000000' : '#ffffff';
        }
        const color = hsvaToRgba(this.rgbGetWheelColor());
        return color.r + color.g + color.b > 3 * 128 ? '#000000' : '#ffffff';
    };

    onCommand(command: VisWidgetCommand): any {
        const result = super.onCommand(command);
        if (result === false) {
            if (command === 'openDialog') {
                this.setState({ dialog: true });
                return true;
            }
            if (command === 'closeDialog') {
                this.setState({ dialog: false });
                return true;
            }
        }

        return result;
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        let size = 0;

        if (this.state.rxData.fullSize) {
            size = this.refService?.current?.clientWidth || 0;
        } else if (this.contentRef.current) {
            size =
                this.contentRef.current.offsetWidth > this.contentRef.current.offsetHeight
                    ? this.contentRef.current.offsetHeight
                    : this.contentRef.current.offsetWidth;
        }

        let switchState = null;
        if (this.state.rgbObjects.switch) {
            switchState = this.getPropertyValue('switch');
        }
        let backgroundColor;
        if (switchState) {
            backgroundColor = this.state.rxData.colorEnabled || '#4DABF5';
        } else {
            backgroundColor = this.state.rxData.color || (this.props.context.themeType === 'dark' ? '#111' : '#eee');
        }

        const wheelVisible = this.rgbIsRgb() || this.rgbIsHSL();

        const whiteMode = this.rgbGetWhiteMode();

        let rgbContent;
        if (this.state.rxData.fullSize && !this.state.rxData.externalDialog) {
            if (wheelVisible && size >= 350) {
                rgbContent = (
                    <div
                        ref={this.contentRef}
                        style={{
                            ...styles.rgbDialogContainer,
                            flexDirection: 'row',
                            width: '100%',
                        }}
                    >
                        <div
                            style={{
                                flexDirection: 'column',
                                gap: 12,
                                flexGrow: 1,
                                display: 'flex',
                            }}
                        >
                            {this.rgbRenderSwitch()}
                            {this.rgbRenderBrightness()}
                            {this.rgbRenderWhite()}
                            {this.rgbRenderColorTemperature(whiteMode)}
                            {this.rgbRenderBrightnessSlider(wheelVisible, whiteMode)}
                            {this.rgbRenderWheelTypeSwitch(wheelVisible, true, whiteMode)}
                        </div>
                        <div
                            style={{
                                flexDirection: 'column',
                                display: 'flex',
                            }}
                        >
                            {this.rgbRenderWheel(wheelVisible, whiteMode)}
                        </div>
                    </div>
                );
            } else {
                rgbContent = (
                    <div
                        ref={this.contentRef}
                        style={styles.rgbDialogContainer}
                    >
                        {this.rgbRenderSwitch()}
                        {this.rgbRenderBrightness()}
                        {this.rgbRenderWhite()}
                        {this.rgbRenderWheelTypeSwitch(wheelVisible, false, whiteMode)}
                        {this.rgbRenderWheel(wheelVisible, whiteMode)}
                        {this.rgbRenderBrightnessSlider(wheelVisible, whiteMode)}
                        {this.rgbRenderColorTemperature(whiteMode)}
                    </div>
                );
            }
        } else if (this.props.editMode || !this.state.rxData.externalDialog) {
            if (switchState) {
                props.className = `${props.className} vis-on`.trim();
            } else {
                props.className = `${props.className} vis-off`.trim();
            }
            let icon: React.JSX.Element | string = this.state.rxData.icon;
            const style: React.CSSProperties = {
                color: this.rgbGetColor(),
                width: '90%',
                height: '90%',
            };
            if (switchState === false) {
                style.opacity = 0.7;
            }

            if (icon !== undefined) {
                if (!icon) {
                    style.borderRadius = '50%';
                    // just circle
                    icon = <div style={style} />;
                } else {
                    icon = (
                        <Icon
                            src={icon}
                            alt={this.props.id}
                            style={style}
                        />
                    );
                }
            } else {
                icon = <ColorLens style={style} />;
            }

            let applyStyle: React.CSSProperties | null = null;
            if (this.state.rxData.noCard || props.widget.usedInWidget) {
                applyStyle = {
                    boxSizing: 'border-box',
                };

                // apply style from the element
                // Object.keys(this.state.rxStyle).forEach(attr => {
                //     const value = this.state.rxStyle[attr];
                //     if (value !== null &&
                //         value !== undefined &&
                //         VisRxWidget.POSSIBLE_MUI_STYLES.includes(attr)
                //     ) {
                //         attr = attr.replace(
                //             /(-\w)/g,
                //             text => text[1].toUpperCase(),
                //         );
                //         applyStyle[attr] = value;
                //     }
                // });

                if (!this.state.rxData.onlyCircle) {
                    applyStyle.backgroundColor = backgroundColor;
                }
            } else if (!this.state.rxData.onlyCircle) {
                applyStyle = {
                    backgroundColor,
                };
            }

            let button;
            if (!this.state.rxData.onlyCircle) {
                button = (
                    <Button
                        onClick={
                            !this.state.rxData.toggleOnClick || !this.state.rgbObjects.switch
                                ? () => this.setState({ dialog: true })
                                : undefined
                        }
                        onMouseDown={
                            this.state.rxData.toggleOnClick && this.state.rgbObjects.switch
                                ? () => {
                                      if (this._pressTimeout) {
                                          clearTimeout(this._pressTimeout);
                                      }
                                      this._pressTimeout = setTimeout(
                                          () => {
                                              this._pressTimeout = null;
                                              this.setState({ dialog: true });
                                          },
                                          parseInt(this.state.rxData.pressDuration as string, 10) || 300,
                                      );
                                  }
                                : undefined
                        }
                        onMouseUp={
                            this.state.rxData.toggleOnClick && this.state.rgbObjects.switch
                                ? () => {
                                      if (this._pressTimeout) {
                                          clearTimeout(this._pressTimeout);
                                          this._pressTimeout = null;
                                          this.rgbSetId('switch', !switchState);
                                      }
                                  }
                                : undefined
                        }
                        onTouchStart={
                            this.state.rxData.toggleOnClick && this.state.rgbObjects.switch
                                ? () => {
                                      this._pressTimeout && clearTimeout(this._pressTimeout);
                                      this._pressTimeout = setTimeout(
                                          () => {
                                              this._pressTimeout = null;
                                              this.setState({ dialog: true });
                                          },
                                          parseInt(this.state.rxData.pressDuration as string, 10) || 300,
                                      );
                                  }
                                : undefined
                        }
                        onTouchEnd={
                            this.state.rxData.toggleOnClick && this.state.rgbObjects.switch
                                ? () => {
                                      if (this._pressTimeout) {
                                          clearTimeout(this._pressTimeout);
                                          this._pressTimeout = null;
                                          this.rgbSetId('switch', !switchState);
                                      }
                                  }
                                : undefined
                        }
                        style={{
                            backgroundColor: this.state.rxData.onlyCircle ? backgroundColor : undefined,
                            width: '100%',
                            height: '100%',
                            borderRadius: parseInt(this.state.rxData.borderRadius as string, 10) || undefined,
                        }}
                    >
                        {icon}
                    </Button>
                );
            } else {
                button = (
                    <IconButton
                        onClick={
                            !this.state.rxData.toggleOnClick || !this.state.rgbObjects.switch
                                ? () => this.setState({ dialog: true })
                                : undefined
                        }
                        onMouseDown={
                            this.state.rxData.toggleOnClick && this.state.rgbObjects.switch
                                ? () => {
                                      this._pressTimeout && clearTimeout(this._pressTimeout);
                                      this._pressTimeout = setTimeout(
                                          () => {
                                              this._pressTimeout = null;
                                              this.setState({ dialog: true });
                                          },
                                          parseInt(this.state.rxData.pressDuration as string, 10) || 300,
                                      );
                                  }
                                : undefined
                        }
                        onMouseUp={
                            this.state.rxData.toggleOnClick && this.state.rgbObjects.switch
                                ? () => {
                                      if (this._pressTimeout) {
                                          clearTimeout(this._pressTimeout);
                                          this._pressTimeout = null;
                                          this.rgbSetId('switch', !switchState);
                                      }
                                  }
                                : undefined
                        }
                        onTouchStart={
                            this.state.rxData.toggleOnClick && this.state.rgbObjects.switch
                                ? () => {
                                      this._pressTimeout && clearTimeout(this._pressTimeout);
                                      this._pressTimeout = setTimeout(
                                          () => {
                                              this._pressTimeout = null;
                                              this.setState({ dialog: true });
                                          },
                                          parseInt(this.state.rxData.pressDuration as string, 10) || 300,
                                      );
                                  }
                                : undefined
                        }
                        onTouchEnd={
                            this.state.rxData.toggleOnClick && this.state.rgbObjects.switch
                                ? () => {
                                      if (this._pressTimeout) {
                                          clearTimeout(this._pressTimeout);
                                          this._pressTimeout = null;
                                          this.rgbSetId('switch', !switchState);
                                      }
                                  }
                                : undefined
                        }
                        style={{
                            backgroundColor: this.state.rxData.onlyCircle ? backgroundColor : undefined,
                            width: size,
                            height: size,
                            borderRadius: parseInt(this.state.rxData.borderRadius as string, 10) || undefined,
                        }}
                    >
                        {icon}
                    </IconButton>
                );
            }

            rgbContent = (
                <>
                    <div
                        ref={this.contentRef}
                        style={{
                            ...styles.rgbContent,
                            ...applyStyle,
                        }}
                    >
                        {button}
                    </div>
                    {this.rgbRenderDialog(wheelVisible, whiteMode)}
                </>
            );
        } else if (this.state.rxData.externalDialog) {
            return this.rgbRenderDialog(wheelVisible)!;
        }

        if (this.state.rxData.noCard || props.widget.usedInWidget) {
            return rgbContent || <div />;
        }

        return this.wrapContent(rgbContent || <div />, null);
    }
}
