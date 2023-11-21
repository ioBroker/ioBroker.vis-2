/**
 * <script id="tplValueFloatBar"
 *         type="text/ejs"
 *         class="vis-tpl"
 *         data-vis-set="basic"
 *         data-vis-type="val,bar"
 *         data-vis-name="Bar"
 *         data-vis-prev='<img src="widgets/basic/img/Prev_ValueFloatBar.png"></img>'
 *         data-vis-attrs="oid;min[0];max[100];orientation[horizontal]/select,horizontal,vertical/onOrientation;color[blue]/color;border;shadow;reverse/checkbox">
 *     <div class="vis-widget <%== this.data.attr('class') %>" style="width: 240px; height: 20px; border: 1px solid #888" id="<%= this.data.attr('wid') %>">
 *         <div data-oid="<%= this.data.attr('oid') %>" class="vis-widget-body"
 *         style="<%= (this.data.attr('orientation') === 'vertical') ? ('height: ' + vis.binds.basic.getCalc(this.data) + ';' + ((this.data.border) ? ' width:  calc(100% - ' + vis.binds.basic.extractWidth(this.data.border, 2) + ');' : '') + (this.data.reverse === 'true' || this.data.reverse === true ? 'left: 0; position: absolute; bottom: 0%;' : '')) : (((this.data.border) ? " height: calc(100% - " + vis.binds.basic.extractWidth(this.data.border, 2) + ');' : '') + 'width: ' + vis.binds.basic.getCalc(this.data) + ';' + (this.data.reverse === 'true' || this.data.reverse === true ? 'float: right; ' : '')) %>background-color:<%= this.data.color %>; border: <%= this.data.border %>; box-shadow: <%= this.data.shadow %>"></div>
 *     </div>
 * </script>
 */

/**
 *  ioBroker.vis
 *  https://github.com/ioBroker/ioBroker.vis
 *
 *  Copyright (c) 2023 Denis Haev https://github.com/GermanBluefox,
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

// eslint-disable-next-line import/no-cycle
import VisRxWidget from '../../visRxWidget';

interface BasicBarProps {
    id: string;
    context: Record<string, unknown>;
    view: string;
    editMode: boolean;
}

export default class BasicBar extends VisRxWidget {
    static getWidgetInfo() {
        return {
            id: 'tplValueFloatBar',
            visSet: 'basic',
            visName: 'Bar',
            visPrev: 'widgets/basic/img/Prev_ValueFloatBar.png',
            visAttrs: [{
                name: 'common',
                fields: [
                    {
                        name: 'oid',
                        type: 'id',
                    },
                    {
                        name: 'min',
                        type: 'number',
                        default: 0,
                    },
                    {
                        name: 'max',
                        type: 'number',
                        default: 100,
                    },
                    {
                        name: 'orientation',
                        type: 'select',
                        default: 'horizontal',
                        options: [
                            { value: 'horizontal', label: 'horizontal' },
                            { value: 'vertical', label: 'vertical' },
                        ],
                    },
                    {
                        name: 'color',
                        type: 'color',
                        default: 'blue',
                    },
                    {
                        name: 'border',
                        type: 'text',
                    },
                    {
                        name: 'shadow',
                        type: 'text',
                    },
                    {
                        name: 'reverse',
                        type: 'checkbox',
                    },
                ],
            }],
            // visWidgetLabel: 'value_string',  // Label of widget
            visDefaultStyle: {
                width: 200,
                height: 130,
            },
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo() {
        return BasicBar.getWidgetInfo();
    }

    extractWidth(css: string, multiplier: number): number | string | undefined {
        // extract from "2px solid #aabbcc" => 2px
        const m = css.match(/([0-9])+(px|em)?/);
        if (m) {
            if (m[1] && m[2]) {
                return parseInt(m[1], 10) * (multiplier || 1) + m[2];
            } else {
                return parseInt(m[1], 10) * (multiplier || 1);
            }
        }

        return undefined
    }

    getCalc(data, val: number): string {
        const min = (data.min || data.min === 0) ? parseFloat(data.min) : 0;
        const max = (data.max || data.max === 0) ? parseFloat(data.max) : 100;
        val = parseFloat(vis.states.attr(data.oid + '.val')) || 0;
        val = (val - min) / (max - min);
        return (data.border) ? ('calc(' + Math.round(val * 100) + '% - ' + this.extractWidth(data.border, 2) + ')') : (Math.round(val * 100) + '%');
    }

    renderWidgetBody(props: BasicBarProps): React.JSX.Element {
        super.renderWidgetBody(props);

        let style: React.CSSProperties = {};

        if (this.state.rxData.orientation === 'vertical') {
            style = { height: '500px' };
        }

        if (this.state.rxData.reverse) {
            style = {
                ...style, left: 0, position: 'absolute', bottom: '0',
            };
        }

        if (this.state.rxData.border) {
            style = { ...style, border: this.state.rxData.border };
        }

        if (this.state.rxData.shadow) {
            style = { ...style, boxShadow: this.state.rxData.shadow };
        }

        if (this.state.rxData.color) {
            style = { ...style, backgroundColor: this.state.rxData.color };
        }

        return <div>
            <div data-oid="<%= this.data.attr('oid') %>" className="vis-widget-body" style={style}>
Test
            </div>
        </div>;
    }
}
