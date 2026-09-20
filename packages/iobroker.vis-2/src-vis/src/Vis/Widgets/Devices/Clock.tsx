import React, { type CSSProperties } from 'react';

import AnalogClock from './AnalogClock/AnalogClock';
import Generic from './Generic';
import type { RxRenderWidgetProps, RxWidgetInfo, VisRxWidgetState, VisRxWidgetProps } from '@iobroker/types-vis-2';

const styles: Record<string, CSSProperties> = {
    uClock: {
        verticalAlign: 'middle',
        animation: 'vis-2-widgets-material-uClockFadeIn 500ms ease-in-out',
        animationFillMode: 'both',
        backgroundColor: '#fff',
        borderRadius: '50%',
    },
    uClockHand: {
        transition: 'transform 200ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
    hourLabelSpan: {
        // fontWeight: 500,
    },
};

interface ClockRxData {
    noCard: boolean;
    type: 'analog' | 'analog2' | 'digital' | 'digital2';
    backgroundColor: string;
    ticksColor: string;
    handsColor: string;
    secondHandColor: string;
    withSeconds: boolean;
    showNumbers: boolean;
    blinkDelimiter: boolean;
    hoursFormat: '24' | '12';
}

interface ClockState extends VisRxWidgetState {
    time: Date;
    width: number;
    height: number;
    fontSizeSvg: number;
    textWidthSvg: number;
    timeFormat?: string;
}

export default class Clock extends Generic<ClockRxData, ClockState> {
    private readonly refContainer: React.RefObject<HTMLDivElement | null> = React.createRef();
    private rotations?: [number, number, number];
    private timeInterval?: ReturnType<typeof setTimeout>;

    constructor(props: VisRxWidgetProps) {
        super(props);
        this.state = {
            ...this.state,
            time: new Date(),
            width: 0,
            fontSizeSvg: 0,
            textWidthSvg: 0,
        };
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplMaterial2Clock',
            visSet: 'devices',
            visSetLabel: 'set_label',
            visSetColor: '#00897b',
            visWidgetLabel: 'clock', // Label of widget
            visName: 'Clock',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        {
                            name: 'noCard',
                            label: 'without_card',
                            type: 'checkbox',
                        },
                        {
                            name: 'type',
                            label: 'type',
                            type: 'select',
                            options: [
                                {
                                    value: 'analog',
                                    label: 'analog',
                                },
                                {
                                    value: 'analog2',
                                    label: 'analog2',
                                },
                                {
                                    value: 'digital',
                                    label: 'digital',
                                },
                                {
                                    value: 'digital2',
                                    label: 'digital2',
                                },
                            ],
                            default: 'analog',
                        },
                        {
                            name: 'backgroundColor',
                            hidden: 'data.type === "digital" || data.type === "digital2"',
                            label: 'background',
                            type: 'color',
                        },
                        {
                            name: 'ticksColor',
                            hidden: 'data.type === "digital" || data.type === "digital2"',
                            label: 'color',
                            type: 'color',
                        },
                        {
                            name: 'handsColor',
                            hidden: 'data.type === "digital" || data.type === "digital2"',
                            label: 'hands_color',
                            type: 'color',
                        },
                        {
                            name: 'secondHandColor',
                            hidden: 'data.type === "digital" || data.type === "digital2"',
                            label: 'seconds_hand_color',
                            type: 'color',
                        },
                        {
                            name: 'withSeconds',
                            label: 'with_seconds',
                            type: 'checkbox',
                            default: true,
                        },
                        {
                            name: 'showNumbers',
                            hidden: 'data.type === "digital" || data.type === "digital2"',
                            label: 'show_numbers',
                            type: 'checkbox',
                            default: true,
                        },
                        {
                            name: 'blinkDelimiter',
                            label: 'blink',
                            hidden: '(data.type !== "digital" && data.type !== "digital2") || data.withSeconds',
                            type: 'checkbox',
                            default: true,
                        },
                        {
                            name: 'hoursFormat',
                            label: 'am_pm',
                            hidden: 'data.type !== "digital" && data.type !== "digital2"',
                            type: 'select',
                            options: ['24', '12'],
                            noTranslation: true,
                            default: '24',
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: '100%',
                height: 120,
                position: 'relative',
            },
            visPrev: 'widgets/devices/img/prev_clock.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return Clock.getWidgetInfo();
    }

    nextTick = (): void => {
        const data = this.state.rxData || {};
        const time = new Date();
        let timeout;
        if (data.withSeconds || (data.type === 'digital2' && data.blinkDelimiter)) {
            timeout = 1000 - time.getMilliseconds();
        } else {
            timeout = 1000 - time.getMilliseconds() + 1000 * (60 - time.getSeconds());
        }
        this.timeInterval = setTimeout(this.nextTick, timeout);
        this.setState({ time });
    };

    onRxDataChanged(): void {
        this.timeInterval && clearTimeout(this.timeInterval);
        this.timeInterval = setTimeout(() => {
            this.timeInterval = undefined;
            this.nextTick();
        }, 1000 - new Date().getMilliseconds());
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.timeInterval =
            this.timeInterval ||
            setTimeout(() => {
                this.timeInterval = undefined;
                this.nextTick();
            }, 1000 - new Date().getMilliseconds());

        this.recalculateWidth();
    }

    recalculateWidth(): void {
        if (this.refContainer.current) {
            let size = this.refContainer.current.clientWidth;
            if (this.state.rxData.type !== 'digital' && this.state.rxData.type !== 'digital2') {
                if (size > this.refContainer.current.clientHeight) {
                    size = this.refContainer.current.clientHeight;
                }
            }

            const time = this.getDigitalClockText(true);
            let timeFormat = time.digits.join(':');
            if (time.ampm) {
                timeFormat += ` ${time.ampm}`;
            }
            if (
                size !== this.state.width ||
                this.state.height !== this.refContainer.current.clientHeight ||
                this.state.timeFormat !== timeFormat
            ) {
                let textWidthSvg = 0;
                let fontSizeSvg = 0;

                if (this.state.rxData.type === 'digital' || this.state.rxData.type === 'digital2') {
                    const time = this.getDigitalClockText(true);

                    let text = `${time.digits[0]}${time.hideDelimiter ? ' ' : ':'}${time.digits[1]}${time.digits[2] ? `:${time.digits[2]}` : ''}`;
                    if (this.state.rxData.type === 'digital' && this.state.rxData.hoursFormat === '12') {
                        text += ' mm';
                    }
                    fontSizeSvg = Clock.calculateFontSize(
                        text,
                        this.refContainer.current.clientWidth,
                        this.refContainer.current.clientHeight,
                    );

                    textWidthSvg = Clock.getTextWidth(text, `normal ${fontSizeSvg}px Arial`);
                }

                this.setState({
                    width: size,
                    height: this.refContainer.current.clientHeight,
                    timeFormat,
                    fontSizeSvg,
                    textWidthSvg,
                });
            }
        }
    }

    componentWillUnmount(): void {
        if (this.timeInterval) {
            clearTimeout(this.timeInterval);
            this.timeInterval = undefined;
        }
        super.componentWillUnmount();
    }

    componentDidUpdate(prevProps: VisRxWidgetProps, prevState: typeof this.state): void {
        super.componentDidUpdate(prevProps, prevState);
        this.recalculateWidth();
    }

    // Code was taken from here and modified as it didn't work: https://github.com/uiwjs/react-clock/blob/master/src/index.tsx
    /*
        MIT License

        Copyright (c) 2020 uiw

        Permission is hereby granted, free of charge, to any person obtaining a copy
        of this software and associated documentation files (the "Software"), to deal
        in the Software without restriction, including without limitation the rights
        to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
        copies of the Software, and to permit persons to whom the Software is
        furnished to do so, subject to the following conditions:

        The above copyright notice and this permission notice shall be included in all
        copies or substantial portions of the Software.

        THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
        IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
        FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
        AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
        LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
        OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
        SOFTWARE.
     */
    renderSimpleClock(): React.JSX.Element {
        const data = this.state.rxData || {};
        const now = new Date();
        const seconds = now.getSeconds();
        const minutes = now.getMinutes();
        const hours = now.getHours() % 12;
        this.rotations = this.rotations || [0, 0, 0]; // [seconds, minutes, hours]

        if (seconds === 0) {
            this.rotations[0] += 1;
        }

        if (minutes === 0 && seconds === 0) {
            this.rotations[1] += 1;
        }

        if (hours === 0 && minutes === 0 && seconds === 0) {
            this.rotations[2] += 1;
        }

        const secondsDeg = (seconds / 60) * 360 + this.rotations[0] * 360;
        const minutesDeg = (minutes / 60) * 360 + this.rotations[1] * 360;
        const hoursDeg = (hours / 12) * 360 + (minutes / 60) * 30 + this.rotations[2] * 360;

        return (
            <svg
                viewBox="0 0 100 100"
                color={data.ticksColor || (this.props.context.themeType === 'dark' ? '#dedede' : '#212121')}
                fill="currentColor"
                width={this.state.width}
                height={this.state.width}
                style={{
                    ...styles.uClock,
                    backgroundColor:
                        data.backgroundColor || (this.props.context.themeType === 'dark' ? '#111' : '#EEE'),
                }}
            >
                {[...Array(12)].map((_, idx) => (
                    <line
                        style={{ transformOrigin: 'center' }}
                        key={idx}
                        stroke="currentColor"
                        opacity={0.7}
                        strokeWidth={1}
                        transform={`rotate(${30 * idx})`}
                        strokeLinecap="round"
                        x1="50"
                        y1="5"
                        x2="50"
                        y2="10"
                    />
                ))}
                <line
                    stroke={data.handsColor || (this.props.context.themeType === 'dark' ? '#dedede' : '#212121')}
                    style={{ ...styles.uClockHand, transform: `rotate(${hoursDeg}deg)`, transformOrigin: 'center' }}
                    strokeLinecap="round"
                    strokeWidth="1.5"
                    x1="50"
                    y1="25"
                    x2="50"
                    y2="50"
                />
                <line
                    stroke={data.handsColor || (this.props.context.themeType === 'dark' ? '#dedede' : '#212121')}
                    style={{ ...styles.uClockHand, transform: `rotate(${minutesDeg}deg)`, transformOrigin: 'center' }}
                    strokeLinecap="round"
                    strokeWidth="1.5"
                    x1="50"
                    y1="10"
                    x2="50"
                    y2="50"
                />
                <circle
                    stroke="currentColor"
                    cx="50"
                    cy="50"
                    r="3"
                />
                {data.withSeconds ? (
                    <g
                        style={{
                            ...styles.uClockHand,
                            transform: `rotate(${secondsDeg}deg)`,
                            transformOrigin: 'center',
                        }}
                        stroke="currentColor"
                        color={data.secondHandColor || '#F44336'}
                        strokeWidth="1"
                    >
                        <line
                            x1="50"
                            y1="10"
                            x2="50"
                            y2="60"
                            strokeLinecap="round"
                        />
                        <circle
                            cx="50"
                            cy="50"
                            r="1.5"
                        />
                    </g>
                ) : null}
                {data.showNumbers
                    ? [...Array(12)].map((_, idx) => (
                          <g
                              key={idx.toString()}
                              style={{
                                  transformOrigin: 'center center',
                                  transform: `rotate(${30 * (idx + 1)}deg)`,
                              }}
                          >
                              <text
                                  x={idx + 1 > 9 ? 46 : 48}
                                  y="18"
                                  stroke="currentColor"
                                  fontSize={6}
                                  // the group turns the number to its place on the dial, and here it turns back
                                  // around itself, so that 4 to 8 do not stand on their heads
                                  transform={`rotate(${-30 * (idx + 1)} 50 16)`}
                              >
                                  {idx + 1}
                              </text>
                          </g>
                      ))
                    : null}
            </svg>
        );
    }

    renderAnalogClock(): React.JSX.Element {
        const data = this.state.rxData || {};
        return (
            <AnalogClock
                style={{
                    marginTop:
                        this.refContainer.current!.clientHeight > this.refContainer.current!.clientWidth
                            ? (this.refContainer.current!.clientHeight - this.refContainer.current!.clientWidth) / 2
                            : undefined,
                    marginLeft:
                        this.refContainer.current!.clientHeight < this.refContainer.current!.clientWidth
                            ? (this.refContainer.current!.clientWidth - this.refContainer.current!.clientHeight) / 2
                            : undefined,
                }}
                size={this.state.width}
                ticksColor={data.ticksColor}
                backgroundColor={data.backgroundColor}
                showNumbers={data.showNumbers}
                withSeconds={data.withSeconds}
                handsColor={data.handsColor}
                secondHandColor={data.secondHandColor}
                themeType={this.props.context.themeType}
            />
        );
    }

    getDigitalClockText(replaceWithZero?: boolean): {
        ampm?: string;
        digits: string[];
        hideDelimiter?: boolean;
    } {
        const data = this.state.rxData || {};
        const digits: string[] = [];
        if (replaceWithZero) {
            digits.push('00');
            digits.push('00');
            if (data.withSeconds) {
                digits.push('00');
            }
            return { ampm: data.hoursFormat === '12' ? 'pm' : undefined, digits };
        }

        const time = new Date();
        if (data.hoursFormat === '12') {
            digits.push((time.getHours() % 12).toString().padStart(2, '0'));
        } else {
            digits.push(time.getHours().toString().padStart(2, '0'));
        }

        digits.push(time.getMinutes().toString().padStart(2, '0'));

        if (data.withSeconds) {
            digits.push(time.getSeconds().toString().padStart(2, '0'));
        }
        return {
            ampm: data.hoursFormat === '12' ? (time.getHours() > 11 ? 'pm' : 'am') : undefined,
            digits,
            hideDelimiter: !data.withSeconds && data.blinkDelimiter && time.getSeconds() % 2 === 0,
        };
    }

    renderDigitalClock(): React.JSX.Element {
        const time = this.getDigitalClockText();
        const timeDiv = [
            <span key="hours">{time.digits[0]}</span>,
            <span
                key="delimiter1"
                style={{ opacity: time.hideDelimiter ? 0 : 1 }}
            >
                :
            </span>,
            <span key="minutes">{time.digits[1]}</span>,
            time.digits.length > 2 ? (
                <span
                    key="delimiter2"
                    style={{ opacity: time.hideDelimiter ? 0 : 1 }}
                >
                    :
                </span>
            ) : null,
            time.digits.length > 2 ? <span key="seconds">{time.digits[2]}</span> : null,
            time.ampm ? (
                <span
                    key="ampm"
                    style={{ fontSize: '50%' }}
                >
                    &nbsp;
                    {time.ampm}
                </span>
            ) : null,
        ];
        return (
            <div
                style={{
                    display: 'inline-block',
                    margin: '0 auto',
                    fontSize: this.state.rxStyle!['font-size'] || this.state.fontSizeSvg,
                }}
            >
                {timeDiv}
            </div>
        );
    }

    static getTextWidth(text: string, font: string): number {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        context.font = font;
        return context.measureText(text).width;
    }

    static calculateFontSize(
        text: string,
        maxWidth: number,
        maxHeight: number,
        fontFamily = 'Arial',
        fontWeight = 'normal',
    ): number {
        let fontSize = maxHeight;
        let width = Clock.getTextWidth(text, `${fontWeight} ${fontSize}px ${fontFamily}`);
        while ((width > maxWidth || fontSize > maxHeight) && fontSize > 6) {
            fontSize -= 1;
            width = Clock.getTextWidth(text, `${fontWeight} ${fontSize}px ${fontFamily}`);
        }
        return fontSize;
    }

    renderDigitalClock2(): React.JSX.Element {
        const data = this.state.rxData || {};
        const time = this.getDigitalClockText();
        const text = `${time.digits[0]}${time.hideDelimiter ? ' ' : ':'}${time.digits[1]}${time.digits[2] ? `:${time.digits[2]}` : ''}`;
        const amFontSize = data.withSeconds
            ? this.state.fontSizeSvg / 3
            : data.blinkDelimiter
              ? this.state.fontSizeSvg / 4
              : this.state.fontSizeSvg / 3;
        const amWidth = Clock.getTextWidth('mm', `normal ${amFontSize}px Arial`);
        return (
            <svg
                viewBox={`0 0 ${this.state.width} ${this.state.height}`}
                color={this.state.rxStyle?.color || (this.props.context.themeType === 'dark' ? '#dedede' : '#212121')}
                fill="currentColor"
                width={this.state.width}
                height={this.state.height}
            >
                <text
                    x="50%"
                    y="50%"
                    fontSize={this.state.fontSizeSvg}
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fontFamily={data.withSeconds || !data.blinkDelimiter ? undefined : 'monospace'}
                >
                    {text}
                </text>
                {time.ampm ? (
                    <text
                        x="50%"
                        y="50%"
                        transform={`translate(${this.state.textWidthSvg / 2 - amWidth}, ${this.state.fontSizeSvg * 0.55})`}
                        fontSize={amFontSize}
                    >
                        {time.ampm === 'pm' ? 'PM' : 'AM'}
                    </text>
                ) : null}
            </svg>
        );
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        let clock = null;
        if (this.state.width) {
            switch (this.state.rxData.type) {
                case 'analog2':
                    clock = this.renderAnalogClock();
                    this.resizeLocked = !this.props.isRelative;
                    break;
                case 'digital':
                    this.resizeLocked = false;
                    clock = this.renderDigitalClock();
                    break;
                case 'digital2':
                    this.resizeLocked = false;
                    clock = this.renderDigitalClock2();
                    break;
                case 'analog':
                default:
                    clock = this.renderSimpleClock();
                    this.resizeLocked = !this.props.isRelative;
                    break;
            }

            this.timeInterval =
                this.timeInterval ||
                setTimeout(() => {
                    this.timeInterval = undefined;
                    this.nextTick();
                }, 1000 - new Date().getMilliseconds());
        }

        const style: CSSProperties = {
            textAlign: 'center',
            lineHeight: this.state.height ? `${this.state.height}px` : undefined,
            fontFamily: this.state.rxStyle!['font-family'] as CSSProperties['fontFamily'],
            textShadow: this.state.rxStyle!['text-shadow'] as CSSProperties['textShadow'],
            fontStyle: this.state.rxStyle!['font-style'] as CSSProperties['fontStyle'],
            fontWeight: this.state.rxStyle!['font-weight'],
            fontVariant: this.state.rxStyle!['font-variant'] as CSSProperties['fontVariant'],
        };

        style.width = 'calc(100% - 4px)';
        style.height = 'calc(100% - 8px)';
        style.margin = 'auto';

        const content = (
            <div
                style={style}
                ref={this.refContainer}
            >
                <style>
                    {`
@keyframes vis-2-widgets-material-uClockFadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}               
                `}
                </style>
                {clock}
            </div>
        );

        if (this.state.rxData.noCard || props.widget.usedInWidget) {
            return content;
        }

        return this.wrapContent(content, null);
    }
}
