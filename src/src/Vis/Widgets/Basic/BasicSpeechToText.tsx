import React from 'react';
// eslint-disable-next-line import/no-cycle
import VisRxWidget from '@/Vis/visRxWidget';
import type {
    GetRxDataFromWidget, RxRenderWidgetProps,
} from '@/types';
import { I18n } from '@iobroker/adapter-react-v5';
// @ts-expect-error fix import
import type * as SpeechRecognition from 'dom-speech-recognition';

type RxData = GetRxDataFromWidget<typeof BasicSpeechToText>

interface BasicSpeechToTextState {
    /** Current shown module text */
    text: string;
    /** Current shown image */
    image: string;
    /** Current result */
    result: string;
    /** Color of the result */
    resultColor: string;
}

export default class BasicSpeechToText extends VisRxWidget<RxData, BasicSpeechToTextState> {
    /** Speech recognition instance if available */
    private recognition: SpeechRecognition;

    /** If current speech should be ignored due to errors */
    private ignoreOnEnd = false;

    /**
     * Lifecycle hook called when component is mounted
     */
    async componentDidMount(): Promise<void> {
        await super.componentDidMount();
        this.setState({
            text: !window.webkitSpeechRecognition ? I18n.t('basic_speech2text_info_upgrade') : '',
            image: this.state.rxData.imageInactive,
            result: '',
            resultColor: this.state.rxData.keyWordColor,
        });

        if (!window.webkitSpeechRecognition) {
            return;
        }

        if (this.state.rxData.speechMode === 'continuous' && !this.state.editMode) {
            this.startRecognition();
        } else {
            this.setState({ text: I18n.t('basic_speech2text_info_start') });
        }
    }

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
                        default: 'widgets/basic/img/micInactive.svg',
                        type: 'image',
                    },
                    {
                        name: 'imageActive',
                        default: 'widgets/basic/img/micActive.svg',
                        type: 'image',
                    },
                    {
                        name: 'imageStarted',
                        default: 'widgets/basic/img/micStarted.svg',
                        type: 'image',
                    },
                    {
                        name: 'imageDetected',
                        default: 'widgets/basic/img/micDetected.svg',
                        type: 'image',
                    },
                    {
                        name: 'imageSent',
                        default: 'widgets/basic/img/micSent.svg',
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
     * Find the keyword in the given text
     *
     * @param text text to scan for keyword
     */
    findKeyWord(text: string): string | boolean {
        const words = this.state.rxData.keywords ? this.state.rxData.keywords.toLowerCase().split(/[\s,;]+/g) : null;
        let found = false;

        if (words) {
            found = false;
            const wwords = text.toLowerCase().split(' ');
            for (let w = 0; w < words.length; w++) {
                const pos = wwords.indexOf(words[w]);
                if (pos !== -1) {
                    let offset = 0;
                    for (let p = 0; p < pos; p++) {
                        offset += wwords[p].length + 1;
                    }
                    text = `${text.substring(0, offset)}<b>${text.substring(offset, offset + wwords[pos].length)}</b>${text.substring(offset + wwords[pos].length)}`;
                    found = true;
                    break;
                }
            }
        } else {
            return true;
        }

        return found ? text : false;
    }

    /**
     * Start speech recognition
     */
    startRecognition() {
        if (this.recognition) {
            if (this.state.rxData.speechMode === 'startstop') {
                this.recognition.onend = null;
                this.recognition.stop();
                this.recognition = null;
                this.setState({ text: I18n.t('basic_speech2text_info_start'), image: this.state.rxData.imageInactive });
            }
            return;
        }

        // eslint-disable-next-line new-cap
        this.recognition = new window.webkitSpeechRecognition();
        this.recognition.continuous = this.state.rxData.speechMode === 'continuous' || this.state.rxData.speechMode === 'startstop';
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;

        const startTimestamp = Date.now();
        let finalTranscript = '';
        let timer: ReturnType<typeof setTimeout>;
        let lastText = '';
        let originalColor: string;

        this.recognition.onstart = () => {
            this.setState({
                text: I18n.t('basic_speech2text_info_speak_now'),
                image: this.state.rxData.imageActive,
                result: '',
            });
        };

        this.recognition.onerror  = (event: SpeechRecognition.SpeechRecognitionErrorEvent) => {
            this.setState({
                result: '',
                image: this.state.rxData.imageInactive,
            });

            if (event.error === 'no-speech') {
                this.setState({
                    text: I18n.t('basic_speech2text_info_no_speech'),
                });
            }
            if (event.error === 'audio-capture') {
                this.setState({
                    text: I18n.t('basic_speech2text_info_no_microphone'),
                });
                this.ignoreOnEnd = true;
            }
            if (event.error === 'not-allowed') {
                if ((event.timeStamp - startTimestamp) < 100) {
                    this.setState({
                        text: I18n.t('basic_speech2text_info_blocked'),
                    });
                } else {
                    this.setState({
                        text: I18n.t('basic_speech2text_info_denied'),
                    });
                }
                this.ignoreOnEnd = true;
            }
        };

        this.recognition.onend =  () => {
            this.recognition.stop();
            this.recognition = null;
            if (!this.ignoreOnEnd) {
                setTimeout(() => {
                    this.setState({
                        image: this.state.rxData.imageInactive,
                    });
                    if (this.recognition.continuous) {
                        this.setState({
                            result: '',
                            text: I18n.t('basic_speech2text_info_speak_now'),
                        });
                        this.startRecognition();
                    } else {
                        this.setState({
                            result: '',
                            text: I18n.t('basic_speech2text_info_start'),
                        });
                    }
                }, 1_000);
            }
        };

        this.recognition.onresult = (event: SpeechRecognition.SpeechRecognitionResult) => {
            let interimTranscript = '';

            if (typeof event.results === 'undefined') {
                this.recognition.onend = null;
                this.recognition.stop();
                return;
            }

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (this.state.image === this.state.rxData.imageActive) {
                this.setState({ image: this.state.rxData.imageStarted });
            }

            this.setState({ text: '' });
            let text = finalTranscript || interimTranscript;
            const found = this.findKeyWord(text);

            if (!originalColor) {
                originalColor = this.state.resultColor;
            }

            if (found) {
                // @ts-expect-error cleanup getKeyword
                text = found;
                if (this.state.image === this.state.rxData.imageStarted) {
                    this.setState({
                        image: this.state.rxData.imageDetected,
                    });
                }
                // _data.$result.addClass('mic-keyword-found');
                if (this.state.rxData.keyWordColor) {
                    this.setState({
                        resultColor: this.state.rxData.keyWordColor,
                    });
                }
            }

            this.setState({ text });

            if (finalTranscript) {
                if (timer) clearTimeout(timer);

                if (found) {
                    this.setState({
                        image: this.state.rxData.imageSent,
                    });
                    if (this.state.rxData.textSentColor) {
                        this.setState({ resultColor: this.state.rxData.textSentColor });
                    }
                    // _data.$result.addClass('mic-text-sent');
                    this.props.context.setValue(this.state.rxData.oid, finalTranscript);
                }

                finalTranscript = '';
                lastText = '';

                setTimeout(() => {
                    this.setState({
                        image: this.state.rxData.imageActive,
                        text: I18n.t('basic_speech2text_info_speak_now'),
                        resultColor: originalColor,
                        result: '',
                    });
                }, 1_000);
            } else {
                lastText = interimTranscript;

                if (timer) clearTimeout(timer);
                timer = setTimeout(() => {
                    this.recognition.onend = null;
                    this.recognition.stop();
                    this.recognition = null;

                    const found = this.findKeyWord(lastText);
                    if (found) {
                        this.setState({
                            image: this.state.rxData.imageSent,
                        });
                        if (this.state.rxData.textSentColor) {
                            this.setState({ resultColor: this.state.rxData.textSentColor });
                        }
                        // _data.$result.addClass('mic-text-sent');
                        this.props.context.setValue(this.state.rxData.oid, finalTranscript);
                    }

                    finalTranscript = '';
                    lastText = '';

                    setTimeout(() => {
                        this.setState({
                            image: this.state.rxData.imageActive,
                            text: I18n.t('basic_speech2text_info_speak_now'),
                            resultColor: originalColor,
                            result: '',
                        });
                        // _data.$result.hide().removeClass('mic-keyword-found mic-text-sent');
                        this.startRecognition();
                    }, 1_000);
                }, 3_000);
            }
        };

        this.recognition.lang = this.state.rxData.language;

        this.recognition.start();
    }

    /**
     * Renders the widget
     *
     * @param props props passed to the parent classes render method
     */
    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        return <div className="vis-widget-body">
            <table
                style={{ height: '100%', width: '100%' }}
                onClick={() => {
                    if (this.state.rxData.speechMode !== 'continuous' && !this.state.editMode && window.webkitSpeechRecognition) {
                        this.startRecognition();
                    }
                }}
            >
                <tr>
                    <td style={{ display: this.state.rxData.noImage ? 'none' : undefined }}>
                        <img
                            className="mic-image"
                            style={{ height: `${this.state.rxData.imageHeightPx}px`, width: `${this.state.rxData.imageWidthPx}px` }}
                            src={this.state.image}
                        />
                    </td>
                    <td className="mic-text" style={{ width: 100 }}>
                        <div
                            className="mic-info-text"
                            style={{ display: this.state.rxData.noText ? 'none' : undefined }}
                        >
                            {this.state.text}
                        </div>
                        <div
                            className="mic-results"
                            style={{ display: this.state.rxData.noResults ? 'none' : undefined, color: this.state.resultColor }}
                        >
                            {this.state.result}
                        </div>
                    </td>
                </tr>
            </table>
        </div>;
    }
}
