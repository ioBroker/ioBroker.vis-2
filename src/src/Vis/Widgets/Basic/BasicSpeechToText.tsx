import React from 'react';
// eslint-disable-next-line import/no-cycle
import VisRxWidget from '@/Vis/visRxWidget';
import {
    GetRxDataFromWidget, RxRenderWidgetProps,
} from '@/types';

type RxData = GetRxDataFromWidget<typeof BasicSpeechToText>

export default class BasicSpeechToText extends VisRxWidget<RxData> {
    /**
     * Enables calling widget info on the class instance itself
     */
    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo() {
        return BasicSpeechToText.getWidgetInfo();
    }

    /**
     * Returns the widget info which is rendered in the edit mode
     */
    static getWidgetInfo() {
        return {
            id: 'tplSpeech2Text',
            visSet: 'basic',
            visName: 'Speech to Text',
            visPrev: 'widgets/basic/img/Prev_Speech2Text.png',
            visAttrs: [{
                name: 'common',
                fields: [
                    {
                        name: 'oid',
                        type: 'id',
                    },
                    {
                        name: 'speechMode',
                        type: 'select',
                        default: 'single',
                        options: [
                            { value: 'single', label: 'single' },
                            { value: 'startstop', label: 'startstop' },
                            { value: 'continuous', label: 'continuous' },
                        ],
                    },
                    {
                        name: 'language',
                        type: 'select',
                        default: 'single',
                        options: [
                            { value: '', label: '' },
                            { value: 'en-US', label: 'en-US' },
                            { value: 'de', label: 'de' },
                            { value: 'ru-RU', label: 'ru-RU' },
                        ],
                    },
                    {
                        name: 'keywords',
                    },
                ],
            },
            {
                name: 'group.image',
                fields: [
                    {
                        name: 'noImage',
                        type: 'checkbox',
                    },
                    {
                        name: 'imageInactive',
                        default: 'img/micInactive.svg',
                        type: 'image',
                    },
                    {
                        name: 'imageActive',
                        default: 'img/micActive.svg',
                        type: 'image',
                    },
                    {
                        name: 'imageStarted',
                        default: 'img/micStarted.svg',
                        type: 'image',
                    },
                    {
                        name: 'imageDetected',
                        default: 'img/micDetected.svg',
                        type: 'image',
                    },
                    {
                        name: 'imageSent',
                        default: 'img/micSent.svg',
                        type: 'image',
                    },
                    {
                        name: 'imageHeightPx',
                        default: '70',
                        type: 'slider',
                        min: 0,
                        max: 200,
                        step: 1,
                    },
                    {
                        name: 'imageWidthPx',
                        default: '70',
                        type: 'slider',
                        min: 0,
                        max: 200,
                        step: 1,
                    },
                ],
            },
            {
                name: 'group.text',
                fields: [
                    {
                        name: 'noText',
                        type: 'checkbox',
                    },
                    {
                        name: 'noResults',
                        type: 'checkbox',
                    },
                    {
                        name: 'keyWordColor',
                        type: 'color',
                        default: '#FFB051',
                    },
                    {
                        name: 'textSentColor',
                        type: 'color',
                        default: '#7E88D3',
                    }],
            }],
            visDefaultStyle: {
                width: 500,
                height: 77,
            },
        } as const;
    }

    /**
     * Renders the widget
     *
     * @param props props passed to the parent classes render method
     */
    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        return <div className="vis-widget-body">
            <table style={{ height: '100%', width: '100%' }}>
                <tr>
                </tr>
            </table>
        </div>;
    }
}
