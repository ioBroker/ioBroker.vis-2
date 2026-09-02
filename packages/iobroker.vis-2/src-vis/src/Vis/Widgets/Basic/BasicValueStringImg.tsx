/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 *
 * Short content:
 * Licensees may copy, distribute, display and perform the work and make derivative works based on it only if they give the author or licensor the credits in the manner specified by these.
 * Licensees may copy, distribute, display, and perform the work and make derivative works based on it only for noncommercial purposes.
 * (Free for non-commercial use).
 */

import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';
import VisRxWidget from '../../visRxWidget';

type RxData = {
    oid: string;
    html_prepend: string;
    html_append: string;
    /** how often the picture is fetched again, in ms; 0 leaves it alone */
    refreshInterval: number;
};

/**
 * `Basic - String img src`: a state that holds a URL, shown as the picture behind it.
 *
 * It replaces the can.js template `tplValueStringImg` together with `vis.binds.basic.imgRefresh`.
 */
class BasicValueStringImg extends VisRxWidget<RxData> {
    interval: ReturnType<typeof setInterval> | null = null;

    /**
     * Appended to the URL to fetch the picture again, as `imgRefresh` did it. Only a changed URL makes the
     * browser reload a picture, so the timestamp of the last refresh is what actually refreshes it.
     */
    private refreshStamp = 0;

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplValueStringImg',
            visSet: 'basic',
            visName: 'String img src',
            visPrev: 'widgets/basic/img/Prev_ValueStringImg.svg',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'oid', type: 'id' },
                        { name: 'html_prepend', type: 'html' },
                        { name: 'html_append', type: 'html' },
                        {
                            name: 'refreshInterval',
                            type: 'slider',
                            min: 0,
                            max: 180000,
                            step: 100,
                        },
                    ],
                },
            ],
            visWidgetLabel: 'value_string_img', // Label of widget
            visHelp: 'help_value_string_img', // Description in the palette
            visDefaultStyle: {
                width: 60,
                height: 40,
            },
        } as const;
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return BasicValueStringImg.getWidgetInfo();
    }

    /** Start again with the interval the settings ask for, or stop if there is none */
    private restartInterval(): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        // The editor shows the picture as it is: refreshing it there would fetch it over and over while the
        // project is edited, and the can.js widget did not do it either.
        if (this.props.editMode) {
            return;
        }
        const refreshInterval = parseInt(this.state.rxData.refreshInterval as unknown as string, 10);
        if (refreshInterval) {
            this.interval = setInterval(() => {
                this.refreshStamp = Date.now();
                this.forceUpdate();
            }, refreshInterval);
        }
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.restartInterval();
    }

    componentWillUnmount(): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        super.componentWillUnmount();
    }

    onRxDataChanged(prevRxData: typeof this.state.rxData): void {
        super.onRxDataChanged(prevRxData);
        this.restartInterval();
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        // set default width and height
        props.style.width ??= 60;
        props.style.height ??= 40;

        const value = this.state.values[`${this.state.rxData.oid}.val`];
        let src = value === undefined || value === null ? '' : `${value as string}`;
        if (src && this.refreshStamp) {
            src += `${src.includes('?') ? '&' : '?'}_refts=${this.refreshStamp}`;
        }

        return (
            <div className="vis-widget-body">
                <div data-oid={this.state.rxData.oid}>
                    <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_prepend ?? '' }} />
                    <img
                        src={src}
                        alt=""
                        width="100%"
                    />
                    <span dangerouslySetInnerHTML={{ __html: this.state.rxData.html_append ?? '' }} />
                </div>
            </div>
        );
    }
}

export default BasicValueStringImg;
