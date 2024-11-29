import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';
import VisRxWidget from '@/Vis/visRxWidget';

// eslint-disable-next-line no-use-before-define
type RxData = {
    oid: string;
    type: 'circle' | 'pin';
    html_prepend: string;
    html_append_singular: string;
    html_append_plural: string;
    background: string;
    borderColor: string;
    borderRadius: number;
};

interface SvgProps {
    style?: React.CSSProperties;
}

const PinSvg = (props: SvgProps): React.JSX.Element => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 24"
        style={props.style}
    >
        <path
            fill="currentColor"
            d="m7.97,0.026c-4.324,0 -7.82,3.72 -7.82,8.324c0,6.24 7.82,15.46 7.82,15.46s7.82,-9.21 7.82,-15.46c0,-4.6 -3.49,-8.32 -7.82,-8.32zm0,0"
        />
    </svg>
);

export default class BasicRedNumber extends VisRxWidget<RxData> {
    /**
     * Returns the widget info which is rendered in the edit mode
     */
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplRedNumber',
            visSet: 'basic',
            visName: 'Red Number',
            visPrev: 'widgets/basic/img/Prev_RedNumber.png',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        {
                            name: 'oid',
                            type: 'id',
                        },
                        {
                            name: 'type',
                            type: 'select',
                            options: [
                                { value: 'circle', label: 'basic_circle' },
                                { value: 'pin', label: 'basic_pin' },
                            ],
                        },
                        {
                            name: 'html_prepend',
                            type: 'html',
                        },
                        {
                            name: 'html_append_singular',
                            type: 'html',
                        },
                        {
                            name: 'html_append_plural',
                            type: 'html',
                        },
                        {
                            name: 'background',
                            type: 'color',
                        },
                        {
                            name: 'borderColor',
                            label: 'basic_borderColor',
                            type: 'color',
                            hidden: 'data.type === "pin"',
                        },
                        {
                            name: 'borderRadius',
                            label: 'basic_borderRadius',
                            type: 'slider',
                            min: 0,
                            max: 100,
                            step: 1,
                            default: 16,
                            hidden: 'data.type === "pin"',
                        },
                    ],
                },
            ],
            // visWidgetLabel: 'value_string',  // Label of widget
            visDefaultStyle: {
                width: 52,
                height: 30,
            },
        } as const;
    }

    /**
     * Enables calling widget info on the class instance itself
     */
    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return BasicRedNumber.getWidgetInfo();
    }

    /**
     * Renders the widget
     *
     * @param props props passed to the parent classes render method
     */
    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | null {
        super.renderWidgetBody(props);

        const val: number | null | undefined =
            this.state.rxData.oid && this.state.rxData.oid !== 'nothing_selected'
                ? parseFloat(this.state.values[`${this.state.rxData.oid}.val`])
                : null;

        // hide on false
        if (!this.props.editMode && (!val || this.state.values[`${this.state.rxData.oid}.val`] === 'false')) {
            return null;
        }

        if (this.state.rxData.type === 'pin') {
            return (
                <div className="vis-widget-body">
                    <PinSvg
                        style={{
                            width: '100%',
                            height: '100%',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            zIndex: 0,
                            color:
                                typeof this.state.rxData.background === 'string'
                                    ? this.state.rxData.background || 'red'
                                    : 'red',
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            top: '22%',
                            width: '96%',
                            textAlign: 'center',
                            zIndex: 1,
                        }}
                    >
                        {this.state.rxData.html_prepend ? (
                            // eslint-disable-next-line react/no-danger
                            <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_prepend }} />
                        ) : null}
                        {val === null ? '--' : val}
                        {val === 1 ? (
                            // eslint-disable-next-line react/no-danger
                            <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_append_singular }} />
                        ) : (
                            // eslint-disable-next-line react/no-danger
                            <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_append_plural }} />
                        )}
                    </div>
                </div>
            );
        }

        const style: React.CSSProperties = {
            padding: 3,
            borderRadius:
                this.state.rxData.borderRadius !== undefined && this.state.rxData.borderRadius !== null
                    ? parseFloat(this.state.rxData.borderRadius as unknown as string)
                    : 16,
            borderColor: this.state.rxData.borderColor || 'white',
            borderWidth: 3,
            borderStyle: 'solid',
            backgroundColor: this.state.rxData.background || 'red',
            minWidth: 21,
            textAlign: 'center',
            color: props.style.color || 'white',
            fontSize: props.style.fontSize || 20,
            fontFamily: props.style.fontFamily || 'Helvetica',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxSizing: 'border-box',
        };

        return (
            <div
                className="vis-widget-body"
                style={style}
            >
                {this.state.rxData.html_prepend ? (
                    // eslint-disable-next-line react/no-danger
                    <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_prepend }} />
                ) : null}
                {val === null ? '--' : val}
                {val === 1 ? (
                    // eslint-disable-next-line react/no-danger
                    <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_append_singular }} />
                ) : (
                    // eslint-disable-next-line react/no-danger
                    <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_append_plural }} />
                )}
            </div>
        );
    }
}
