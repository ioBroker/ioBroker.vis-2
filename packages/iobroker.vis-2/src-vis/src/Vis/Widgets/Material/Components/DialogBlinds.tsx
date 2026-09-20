/*
 * Copyright 2018-2025 Denis Haev <dogafox@gmail.com>
 *
 * Licensed under the Creative Commons Attribution-NonCommercial License, Version 4.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://creativecommons.org/licenses/by-nc/4.0/legalcode.txt
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import React, { Component, type CSSProperties, type MouseEventHandler, type TouchEventHandler } from 'react';

import { Dialog, DialogContent, DialogTitle, IconButton, Button, Fab } from '@mui/material';

import { darken } from '@mui/system';

import {
    Stop as IconStop,
    KeyboardDoubleArrowUp as IconUp,
    KeyboardDoubleArrowDown as IconDown,
    Lightbulb as IconLamp,
    Close as CloseIcon,
} from '@mui/icons-material';

import { I18n } from '@iobroker/gui-components';

const styles: Record<string, CSSProperties> = {
    dialogTitle: {
        textAlign: 'center',
    },
    wrapperSliderBlock: {
        display: 'flex',
        flexDirection: 'column',
    },
    buttonStopStyle: {
        float: 'left',
    },
    sliderText: {
        display: 'inline-block',
    },
    sliderStyle: {
        marginTop: '1em',
        marginBottom: '1em',
        position: 'relative',
        zIndex: 11,
        width: '10em',
        // border: '1px solid #b5b5b5',
        borderRadius: '2em',
        overflow: 'hidden',
        background: 'white',
        cursor: 'pointer',
        boxShadow:
            '0px 3px 5px -1px rgba(0, 0, 0, 0.2), 0px 6px 10px 0px rgba(0, 0, 0, 0.14), 0px 1px 18px 0px rgba(0, 0, 0, 0.12)',
        height: '20em',
        boxSizing: 'border-box',
    },
};

const LAMP_ON_COLOR = '#c7c70e';

interface DialogBlindsProps {
    onClose: () => void;
    onStop?: () => void;
    onToggle?: () => void;
    onValueChange: (value: number, isCommitment?: boolean) => void;
    startValue: number;
    startToggleValue?: boolean;
    type: number;
    unit?: string;
    background?: string;
    controlTimeout?: number;
}

interface DialogBlindsState {
    value: number;
    toggleValue: boolean;
    lastControl: number;
}

export default class DialogBlinds extends Component<DialogBlindsProps, DialogBlindsState> {
    static types = {
        value: 0,
        dimmer: 1,
        blinds: 2,
    };
    static mouseDown = false;
    private button: {
        name: string;
        time: number;
        timer: ReturnType<typeof setTimeout> | null;
        timeUp: number;
    } = {
        time: 0,
        name: '',
        timer: null,
        timeUp: 0,
    };
    private readonly refSlider: React.RefObject<HTMLDivElement | null> = React.createRef();
    private readonly type: number;
    private top: number | undefined = undefined;
    private height: number | undefined = undefined;
    private controlTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(props: DialogBlindsProps) {
        super(props);
        this.state = {
            value: this.props.startValue || 0,
            toggleValue: this.props.startToggleValue || false,
            lastControl: 0,
        };
        this.type = this.props.type || DialogBlinds.types.dimmer;
    }

    static getDerivedStateFromProps(
        nextProps: DialogBlindsProps,
        state: DialogBlindsState,
    ): Partial<DialogBlindsState> | null {
        let newState: Partial<DialogBlindsState> | null = null;
        if (nextProps.startValue !== state.value && !DialogBlinds.mouseDown && Date.now() - state.lastControl > 1000) {
            newState = {};
            newState.value = nextProps.startValue;
        }
        if (nextProps.startToggleValue !== undefined && nextProps.startToggleValue !== state.toggleValue) {
            newState ||= {};
            newState.toggleValue = nextProps.startToggleValue;
        }
        return newState || null;
    }

    eventToValue(e: MouseEvent & TouchEvent): void {
        const pageY = e.touches ? e.touches[e.touches.length - 1].clientY : e.clientY;

        let value = 100 - Math.round(((pageY - this.top!) / this.height!) * 100);

        if (value > 100) {
            value = 100;
        } else if (value < 0) {
            value = 0;
        }
        this.setState({ value });

        if (Date.now() - this.state.lastControl > 200 && this.type !== DialogBlinds.types.blinds) {
            this.setState({ lastControl: Date.now() }, () => this.onValueChanged(value));
        }
    }

    onMouseMove = (e: MouseEvent & TouchEvent): void => {
        if (DialogBlinds.mouseDown) {
            e.preventDefault();
            e.stopPropagation();
            this.eventToValue(e);
        }
    };

    onMouseDown = (e: MouseEvent & TouchEvent): void => {
        e.preventDefault();
        e.stopPropagation();

        if (!this.height) {
            if (this.refSlider.current) {
                this.height = this.refSlider.current.offsetHeight;
                this.top = this.refSlider.current.getBoundingClientRect().top;
            } else {
                return;
            }
        }

        DialogBlinds.mouseDown = true;
        this.eventToValue(e);

        window.document.addEventListener('mousemove', this.onMouseMove as EventListener, {
            passive: false,
            capture: true,
        });
        window.document.addEventListener('mouseup', this.onMouseUp as EventListener, { passive: false, capture: true });
        window.document.addEventListener('touchmove', this.onMouseMove as EventListener, {
            passive: false,
            capture: true,
        });
        window.document.addEventListener('touchend', this.onMouseUp as EventListener, {
            passive: false,
            capture: true,
        });
    };

    onValueChanged(value: number): void {
        if (this.props.controlTimeout) {
            if (this.controlTimer) {
                clearTimeout(this.controlTimer);
                this.controlTimer = null;
            }
            this.controlTimer = setTimeout(() => {
                this.props.onValueChange?.(value);
            }, this.props.controlTimeout);
        } else {
            this.props.onValueChange?.(value);
        }
    }

    onMouseUp = (e: MouseEvent & TouchEvent): void => {
        e.preventDefault();
        e.stopPropagation();
        if (DialogBlinds.mouseDown) {
            DialogBlinds.mouseDown = false;
            window.document.removeEventListener(
                'mousemove',
                this.onMouseMove as EventListener,
                { passive: false, capture: true } as EventListenerOptions,
            );
            window.document.removeEventListener(
                'mouseup',
                this.onMouseUp as EventListener,
                { passive: false, capture: true } as EventListenerOptions,
            );
            window.document.removeEventListener(
                'touchmove',
                this.onMouseMove as EventListener,
                { passive: false, capture: true } as EventListenerOptions,
            );
            window.document.removeEventListener(
                'touchend',
                this.onMouseUp as EventListener,
                { passive: false, capture: true } as EventListenerOptions,
            );
        }

        this.setState({ lastControl: Date.now() }, () => {
            this.props.onValueChange?.(this.state.value, true);
        });
    };

    componentWillUnmount(): void {
        // document.getElementById('root').className = ``;
        if (DialogBlinds.mouseDown) {
            DialogBlinds.mouseDown = false;
            window.document.removeEventListener(
                'mousemove',
                this.onMouseMove as EventListener,
                { passive: false, capture: true } as EventListenerOptions,
            );
            window.document.removeEventListener(
                'mouseup',
                this.onMouseUp as EventListener,
                { passive: false, capture: true } as EventListenerOptions,
            );
            window.document.removeEventListener(
                'touchmove',
                this.onMouseMove as EventListener,
                { passive: false, capture: true } as EventListenerOptions,
            );
            window.document.removeEventListener(
                'touchend',
                this.onMouseUp as EventListener,
                { passive: false, capture: true } as EventListenerOptions,
            );
        }
    }

    getTopButtonName(): React.ReactNode {
        switch (this.props.type) {
            case DialogBlinds.types.blinds:
                return <IconUp style={{ width: 20, height: 20 }} />;

            case DialogBlinds.types.dimmer:
                return <IconLamp style={{ color: LAMP_ON_COLOR, width: 20, height: 20 }} />;

            default:
                return I18n.t('ON');
        }
    }

    getBottomButtonName(): React.ReactNode {
        switch (this.props.type) {
            case DialogBlinds.types.blinds:
                return <IconDown style={{ width: 20, height: 20 }} />;

            case DialogBlinds.types.dimmer:
                return <IconLamp style={{ width: 20, height: 20 }} />;

            default:
                return I18n.t('OFF');
        }
    }

    onButtonDown(e: React.MouseEvent, buttonName: string): void {
        e?.stopPropagation();
        if (Date.now() - this.button.time < 50) {
            return;
        }
        if (this.button.timer) {
            clearTimeout(this.button.timer);
        }
        this.button.name = buttonName;
        this.button.time = Date.now();
        this.button.timer = setTimeout(() => {
            this.button.timer = null;
            let value: number | undefined = undefined;
            switch (this.button.name) {
                case 'top':
                    value = 100;
                    break;

                case 'bottom':
                    value = 0;
                    break;

                default:
                    break;
            }
            if (value !== undefined) {
                this.setState({ value }, () => this.props.onValueChange?.(value, true));
            }
        }, 400);
    }

    getSliderColor(): string | undefined {
        if (this.props.type === DialogBlinds.types.blinds) {
            return undefined;
        }

        if (this.props.type === DialogBlinds.types.dimmer) {
            const val = this.state.value;
            return darken(LAMP_ON_COLOR, 1 - (val / 70 + 0.3));
        }

        return '#888';
    }

    getValueText(): string {
        let unit = '%';
        if (this.props.type !== DialogBlinds.types.blinds && this.props.type !== DialogBlinds.types.dimmer) {
            unit = this.props.unit || '';
        }

        return this.state.value + unit;
    }

    getToggleButton(): React.ReactNode {
        if (!this.props.onToggle) {
            return null;
        }
        return (
            <Fab
                onClick={this.props.onToggle}
                className="dimmer-button"
                style={styles.buttonToggleStyle}
            >
                <IconLamp />
            </Fab>
        );
    }

    getStopButton(): React.ReactNode {
        if (!this.props.onStop) {
            return null;
        }

        return (
            <Fab
                style={styles.buttonStopStyle}
                size="small"
                onClick={this.props.onStop}
                color="secondary"
            >
                <IconStop />
            </Fab>
        );
    }

    generateContent(): React.ReactNode {
        const sliderStyle: CSSProperties = {
            position: 'absolute',
            width: '100%',
            left: 0,
            height: `${this.props.type === DialogBlinds.types.blinds ? 100 - this.state.value : this.state.value}%`,
            background: this.props.background || this.getSliderColor(),
            transitionProperty: 'height',
            transitionDuration: '0.1s',
        };

        const handlerStyle: CSSProperties = {
            position: 'absolute',
            width: '2em',
            height: '0.3em',
            left: 'calc(50% - 1em)',
            background: 'white',
            borderRadius: '0.4em',
        };

        if (this.props.type === DialogBlinds.types.blinds) {
            sliderStyle.top = 0;
            handlerStyle.bottom = '0.4em';
            sliderStyle.backgroundImage =
                'linear-gradient(0deg, #949494 4.55%, #c9c9c9 4.55%, #c9c9c9 50%, #949494 50%, #949494 54.55%, #c9c9c9 54.55%, #c9c9c9 100%)';
            sliderStyle.backgroundSize = '100% 2.5em';
            sliderStyle.backgroundPosition = 'center bottom';
        } else {
            sliderStyle.bottom = 0;
            handlerStyle.top = '0.4em';
        }

        return (
            <div
                style={styles.wrapperSlider}
                className="vis-2-slider-wrapper"
            >
                <div
                    style={styles.wrapperSliderBlock}
                    className="vis-2-slider-wrapper-block"
                >
                    <Button
                        variant="outlined"
                        onClick={e => this.onButtonDown(e, 'top')}
                    >
                        {this.getTopButtonName()}
                    </Button>
                    <div
                        className="vis-2-slider-blind"
                        ref={this.refSlider}
                        onMouseDown={this.onMouseDown as unknown as MouseEventHandler}
                        onTouchStart={this.onMouseDown as unknown as TouchEventHandler}
                        onClick={e => e.stopPropagation()}
                        style={styles.sliderStyle}
                    >
                        <div
                            style={sliderStyle}
                            className="vis-2-slider-inside"
                        >
                            <div
                                style={handlerStyle}
                                className="vis-2-slider-handler"
                            />
                        </div>
                    </div>
                    <Button
                        variant="outlined"
                        onClick={e => this.onButtonDown(e, 'bottom')}
                    >
                        {this.getBottomButtonName()}
                    </Button>
                </div>
                {this.getToggleButton()}
            </div>
        );
    }

    render(): React.ReactNode {
        return (
            <Dialog
                open={!0}
                onClose={() => this.props.onClose()}
            >
                <DialogTitle style={styles.dialogTitle}>
                    {this.getStopButton()}
                    <div style={styles.sliderText}>{this.getValueText()}</div>
                    <IconButton
                        onClick={() => this.props.onClose()}
                        style={{ float: 'right' }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>{this.generateContent()}</DialogContent>
            </Dialog>
        );
    }
}
