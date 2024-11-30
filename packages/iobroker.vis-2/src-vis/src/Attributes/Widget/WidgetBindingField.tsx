import React, { Component } from 'react';
import moment from 'moment';
import 'moment/locale/de';
import 'moment/locale/ru';
import 'moment/locale/en-gb';
import 'moment/locale/fr';
import 'moment/locale/it';
import 'moment/locale/es';
import 'moment/locale/pl';
import 'moment/locale/nl';
import 'moment/locale/pt';
import 'moment/locale/uk';
import 'moment/locale/zh-cn';

import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    InputAdornment,
    Switch,
    TextField,
} from '@mui/material';

import { Cancel, Check, Clear, Link as LinkIcon } from '@mui/icons-material';

import { I18n, SelectID, type LegacyConnection, type Connection } from '@iobroker/adapter-react-v5';

import type { AnyWidgetId, Project, VisBindingOperationArgument, VisTheme } from '@iobroker/types-vis-2';

import { store, recalculateFields } from '@/Store';

import VisFormatUtils from '../../Vis/visFormatUtils';

const styles: Record<string, any> = {
    dialog: {
        height: 'calc(100% - 64px)',
    },
    content: {
        width: 'calc(100% - 50px)',
        height: 'calc(100% - 50px)',
        overflow: 'hidden',
    },
    edit: {
        display: 'inline-block',
        width: '100%',
        overflow: 'hidden',
        verticalAlign: 'top',
    },
    help: {
        marginLeft: 10,
        display: 'inline-block',
        width: '100%',
        overflow: 'hidden',
        verticalAlign: 'top',
    },
    space: {
        marginLeft: 4,
    },
    code: {
        fontFamily: 'monospace',
    },
    indent: {
        paddingLeft: 40,
    },
    fieldContent: {
        fontSize: '80%',
        '&&&&&&': {
            fontSize: '80%',
        },
    },
    clearPadding: {
        '&&&&': {
            p: 0,
            m: 0,
            minHeight: 'initial',
        },
    },
    clickable: {
        cursor: 'pointer',
        textDecoration: 'underline',
    },
    valueTitle: {
        fontFamily: 'monospace',
        fontWeight: 'bold',
    },
    valueContent: {
        fontFamily: 'monospace',
    },
};

interface WidgetBindingFieldProps {
    field: any;
    widget: any;
    isStyle: boolean;
    changeProject: (project: Project) => void;
    socket: LegacyConnection;
    selectedView: string;
    selectedWidgets: AnyWidgetId[];
    isDifferent?: boolean;
    label?: string;
    disabled?: boolean;
    theme: VisTheme;
}

interface ModifyOptions {
    modify?: boolean;
    selectionStart?: number;
    selectionEnd?: number;
    oldStyle?: boolean;
    arg1?: any;
    arg2?: any;
    desc?: string;
    args?: {
        type: 'string' | 'number' | 'boolean';
        label: string;
    }[];
    link?: string;
    text?: string;
}

interface WidgetBindingFieldState {
    value: string;
    editValue: string;
    showSelectIdDialog: boolean;
    showEditBindingDialog: boolean;
    newStyle: boolean;
    error: string;
    values: Record<string, any>;
    selectionValue?: string;
    selectionStart?: number;
    selectionEnd?: number;
    calculatedEditValue?: string;
    askToModify?: ModifyOptions | null;
    askForArguments?: ModifyOptions | null;
}

class WidgetBindingField extends Component<WidgetBindingFieldProps, WidgetBindingFieldState> {
    private readonly inputRef: React.RefObject<HTMLInputElement>;

    private visFormatUtils: VisFormatUtils | undefined;

    private calculateTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(props: WidgetBindingFieldProps) {
        super(props);
        let value = this.props.widget[this.props.isStyle ? 'style' : 'data'][this.props.field.name] || '';
        if (value === undefined || value === null) {
            value = '';
        } else {
            value = value.toString();
        }

        this.state = {
            value,
            editValue: value,
            showSelectIdDialog: false,
            showEditBindingDialog: false,
            newStyle: true,
            error: '',
            values: {},
        };

        this.inputRef = React.createRef();
    }

    static getDerivedStateFromProps(
        props: WidgetBindingFieldProps,
        state: WidgetBindingFieldState,
    ): Partial<WidgetBindingFieldState> | null {
        let value = props.widget[props.isStyle ? 'style' : 'data']?.[props.field.name] || '';
        if (value === undefined || value === null) {
            value = '';
        } else {
            value = value.toString();
        }

        if (value !== state.value) {
            return { value };
        }

        return null;
    }

    detectOldBindingStyle(value: any): boolean {
        this.visFormatUtils = this.visFormatUtils || new VisFormatUtils({ vis: window.vis });
        const oids = this.visFormatUtils.extractBinding(value as string);
        if (!oids) {
            return false;
        }

        return !oids.find(it => it.token?.includes(':'));
    }

    async calculateValue(value: any): Promise<{ calculatedEditValue: string; values: Record<string, any> }> {
        this.visFormatUtils = this.visFormatUtils || new VisFormatUtils({ vis: window.vis });
        if (value === undefined || value === null) {
            return { calculatedEditValue: '', values: {} };
        }
        value = value.toString();

        const oids = this.visFormatUtils.extractBinding(value as string);
        if (!oids) {
            return value;
        }

        // read all states
        const stateOids: string[] = [];
        oids.forEach(oid => {
            if (oid.systemOid === 'widgetOid') {
                const newOid: string = this.props.widget.data.oid;
                oid.visOid = oid.visOid.replace(/^widgetOid\./g, `${newOid}.`);
                oid.systemOid = newOid;
                oid.token = oid.token.replace(/:widgetOid;/g, `:${newOid};`);
                oid.format = oid.format.replace(/:widgetOid;/g, `:${newOid};`);
                for (const operation of oid.operations) {
                    if (Array.isArray(operation.arg)) {
                        for (const arg of operation.arg) {
                            if (typeof operation.arg === 'object') {
                                (arg as VisBindingOperationArgument).visOid = (
                                    arg as VisBindingOperationArgument
                                ).visOid.replace(/^widgetOid\./g, `${newOid}.`);
                                (arg as VisBindingOperationArgument).systemOid = newOid;
                            }
                        }
                    }
                }
            }

            const parts = oid.visOid.split('.');
            if (
                parts[parts.length - 1] === 'val' ||
                parts[parts.length - 1] === 'ts' ||
                parts[parts.length - 1] === 'lc' ||
                parts[parts.length - 1] === 'ack'
            ) {
                parts.pop();
            }
            const id = parts.join('.');
            if (!stateOids.includes(id)) {
                stateOids.push(id);
            }
            if (oid.operations) {
                for (let op = 0; op < oid.operations.length; op++) {
                    const args = oid.operations[op].arg;
                    if (Array.isArray(args) && args?.length) {
                        for (let a = 0; a < args.length; a++) {
                            if (typeof args[a] === 'object') {
                                const sOid = (args[a] as VisBindingOperationArgument).systemOid;
                                if (sOid && !stateOids.includes(sOid)) {
                                    stateOids.push(sOid);
                                }
                            }
                        }
                    }
                }
            }
        });

        const values: Record<string, any> = {};
        for (let i = 0; i < stateOids.length; i++) {
            if (stateOids[i].includes('.')) {
                const state = await this.props.socket.getState(stateOids[i]);
                state &&
                    Object.keys(state).forEach(attr => {
                        const name = `${stateOids[i]}.${attr}`;
                        if (
                            oids.find(
                                it =>
                                    it.visOid === name ||
                                    it.operations?.find(
                                        op =>
                                            Array.isArray(op?.arg) &&
                                            op?.arg.find((arg: VisBindingOperationArgument) => arg.visOid === name),
                                    ),
                            )
                        ) {
                            values[name] = (state as Record<string, any>)[attr];
                        }
                    });
            }
        }

        return {
            calculatedEditValue: this.visFormatUtils.formatBinding({
                format: value,
                view: this.props.selectedView,
                wid: this.props.selectedWidgets[0],
                widget: store.getState().visProject[this.props.selectedView].widgets[this.props.selectedWidgets[0]],
                widgetData:
                    store.getState().visProject[this.props.selectedView].widgets[this.props.selectedWidgets[0]].data,
                values,
                moment,
            }),
            values,
        };
    }

    onChange(value: string): void {
        const project = JSON.parse(JSON.stringify(store.getState().visProject));
        const field = this.props.field;

        this.props.selectedWidgets.forEach(wid => {
            const data = this.props.isStyle
                ? project[this.props.selectedView].widgets[wid].style
                : project[this.props.selectedView].widgets[wid].data;

            data[field.name] = value;
        });

        this.props.changeProject(project);

        // try to calculate binding
        this.setState({ value });
    }

    renderSpecialNames(): React.JSX.Element {
        return (
            <div>
                <h4>Special bindings</h4>
                <p>There are a number of different internal bindings to provide additional information in views:</p>
                <ul>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() => this.insertInText('username')}
                        >
                            username
                        </b>
                        <span style={styles.space}>- shows logged-in user</span>
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() => this.insertInText('view')}
                        >
                            view
                        </b>
                        <span style={styles.space}>- name of actual view</span>
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() => this.insertInText('wname')}
                        >
                            wname
                        </b>
                        <span style={styles.space}>- widget name</span>
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() => this.insertInText('widget')}
                        >
                            widget
                        </b>
                        <span style={styles.space}>
                            - is an object with all data of widget. Can be used only in JS part, like
                            <span style={{ ...styles.code, ...styles.space }}>&#123;a:a;widget.data.name&#125;</span>
                        </span>
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() => this.insertInText('wid')}
                        >
                            wid
                        </b>
                        <span style={styles.space}>- name of actual widget</span>
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() => this.insertInText('language')}
                        >
                            language
                        </b>
                        <span style={styles.space}>- can be</span>
                        <b style={styles.space}>de</b>,<b style={styles.space}>en</b>
                        <span style={styles.space}>or</span>
                        <b style={styles.space}>ru</b>.
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() => this.insertInText('instance')}
                        >
                            instance
                        </b>
                        <span style={styles.space}>- browser instance</span>
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() => this.insertInText('login')}
                        >
                            login
                        </b>
                        <span style={styles.space}>- if login required or not (e.g., to show/hide logout button)</span>
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() => this.insertInText('local_')}
                        >
                            local_*
                        </b>
                        <span style={styles.space}>
                            - if state name is started from
                            <b style={styles.space}>local_</b>
                            <span style={styles.space}>
                                it will not be reported to ioBroker but will update all widgets, that depends on this
                                state. (Local variable for current browser session)
                            </span>
                        </span>
                    </li>
                </ul>
            </div>
        );
    }

    static renderHelpForNewStyle(): React.JSX.Element {
        return (
            <div>
                <h4>Bindings of objects</h4>
                <p>
                    Normally, most of the widgets have ObjectID attribute and this attribute can be bound with some
                    value of object ID.
                </p>
                <p>But there is another option for how to bind *any* attribute of widget to some ObjectID.</p>

                <p>
                    Just write into attribute
                    <i style={styles.space}>&#123;object.id&#125;</i>
                    <span style={styles.space}>and it will be bound to this object&apos;s value.</span>
                </p>
                <p>
                    If you use the special format, you can even make some simple operations with it, e.g., multiplying
                    or formatting.
                </p>

                <p>E.g., to calculate the hypotenuse of a triangle:</p>

                <p style={styles.code}>
                    &#123;h:javascript.0.myCustom.height;w:javascript.0.myCustom.width;Math.max(20, Math.sqrt(h*h +
                    w*w))&#125;
                </p>
                <p style={styles.space}>will be interpreted as function:</p>

                <p style={styles.code}>
                    value = await (async function () &#123;
                    <br />
                    <span style={styles.indent}>
                        var h = (await getState(&apos;javascript.0.myCustom.height&apos;)).val;
                    </span>
                    <br />
                    <span style={styles.indent}>
                        var w = (await getState(&apos;javascript.0.myCustom.width&apos;)).val;
                    </span>
                    <br />
                    <span style={styles.indent}>return Math.max(20, Math.sqrt(h * h + w * w));</span>
                    <br />
                    &#125;)();
                </p>

                <p>or</p>

                <p>
                    <span style={styles.code}>
                        &#123;h:javascript.0.myCustom.height;w:javascript.0.myCustom.width;h*w&#125;
                    </span>
                    <span style={styles.space}>will just multiply height with width.</span>
                </p>

                <p>
                    You can use *any* javascript (browser) functions. Arguments must be defined with &apos;:&apos;, if
                    not, it will be interpreted as formula.
                </p>

                <p>
                    Take care about types. All of them are defined as strings. To be sure, that value will be treated as
                    number use parseFloat function.
                </p>

                <p>So our Hypotenuse calculation will be:</p>
                <p style={styles.code}>
                    &#123;h:javascript.0.myCustom.height;w:javascript.0.myCustom.width;Math.max(20,
                    Math.sqrt(Math.pow(parseFloat(h), 2) + Math.pow(parseFloat(w), 2)))&#125;
                </p>
            </div>
        );
    }

    renderHelpForOldStyle(): React.JSX.Element {
        return (
            <div>
                <h4>Deprecated format</h4>
                <p>Patten has the following format:</p>

                <p>
                    <span style={styles.code}>&#123;objectID;operation1;operation2;...&#125;</span>
                </p>

                <p>The following operations are supported:</p>
                <ul>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('*', {
                                    oldStyle: true,
                                    desc: 'Multiply with N',
                                    args: [{ type: 'number', label: 'N' }],
                                })
                            }
                        >
                            *(N)
                        </b>
                        - multiplying. Argument must be in brackets, like
                        <i style={styles.space}>&quot;*(4)&quot;</i>.
                        <span style={styles.space}>this sample, we multiply the value with 4.</span>
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('+', {
                                    oldStyle: true,
                                    desc: 'Add to N',
                                    args: [{ type: 'number', label: 'N' }],
                                })
                            }
                        >
                            +(N)
                        </b>
                        - add. Argument must be in brackets, like
                        <i style={styles.space}>&quot;+(4.5)&quot;</i>.
                        <span style={styles.space}>In this sample we add to value 4.5.</span>
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('-', {
                                    oldStyle: true,
                                    desc: 'Subtract N from value',
                                    args: [{ type: 'number', label: 'N' }],
                                })
                            }
                        >
                            -(N)
                        </b>
                        - subtract. Argument must be in brackets, like
                        <i style={styles.space}>&quot;-(-674.5)&quot;</i>.
                        <span style={styles.space}>In this sample we subtract from value -674.5.</span>
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('/', {
                                    oldStyle: true,
                                    desc: 'Divide by D',
                                    args: [{ type: 'number', label: 'D' }],
                                })
                            }
                        >
                            /(D)
                        </b>
                        - dividing. Argument must be in brackets, like
                        <i style={styles.space}>&quot;/(0.5)&quot;</i>.
                        <span style={styles.space}>In this sample, we divide the value by 0.5.</span>
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('%', {
                                    oldStyle: true,
                                    desc: 'Modulo with M',
                                    args: [{ type: 'number', label: 'M' }],
                                })
                            }
                        >
                            %(M)
                        </b>
                        - modulo. Argument must be in brackets, like
                        <i style={styles.space}>&quot;%(5)&quot;</i>.
                        <span style={styles.space}>In this sample, we take modulo of 5.</span>
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('round', {
                                    oldStyle: true,
                                    desc: 'Round to integer',
                                })
                            }
                        >
                            round
                        </b>
                        - round the value.
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('round', {
                                    oldStyle: true,
                                    desc: 'Round with R places after comma',
                                    args: [{ type: 'number', label: 'R' }],
                                })
                            }
                        >
                            round(R)
                        </b>
                        - round the value with N places after point, e.g.,
                        <i>&quot;34.678;round(1) =&gt; 34.7&quot;</i>
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('hex', {
                                    oldStyle: true,
                                    desc: 'convert value to hexadecimal value',
                                })
                            }
                        >
                            hex
                        </b>
                        <b>hex</b>- convert value to hexadecimal value. All letters are lower cased.
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('hex2', {
                                    oldStyle: true,
                                    desc: 'Convert value to hexadecimal value. If value less 16, so the leading zero will be added',
                                })
                            }
                        >
                            hex2
                        </b>
                        <b>hex2</b>- convert value to hexadecimal value. All letters are lower cased. If value less 16,
                        so the leading zero will be added.
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('HEX', {
                                    oldStyle: true,
                                    desc: 'Convert value to hexadecimal value. All letters are upper cased',
                                })
                            }
                        >
                            HEX
                        </b>
                        <b>HEX</b>- same as hex, but upper-cased.
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('HEX2', {
                                    oldStyle: true,
                                    desc: 'Convert value to hexadecimal value. All letters are upper cased. If value less 16, so the leading zero will be added',
                                })
                            }
                        >
                            HEX
                        </b>
                        <b>HEX2</b>- same as hex2, but upper-cased.
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('min', {
                                    oldStyle: true,
                                    desc: 'if value is less than N, take the N, else take the value',
                                    args: [{ type: 'number', label: 'N' }],
                                })
                            }
                        >
                            min(N)
                        </b>
                        - if value is less than N, take the N, else value
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('max', {
                                    oldStyle: true,
                                    desc: 'if value is greater than M, take the M, else take the value',
                                    args: [{ type: 'number', label: 'M' }],
                                })
                            }
                        >
                            max(N)
                        </b>
                        - if value is greater than M, take the M, else value
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('sqrt', {
                                    oldStyle: true,
                                    desc: 'square root',
                                })
                            }
                        >
                            sqrt
                        </b>
                        - square root
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('pow', {
                                    oldStyle: true,
                                    desc: 'power of N',
                                    args: [{ type: 'number', label: 'n' }],
                                })
                            }
                        >
                            pow(n)
                        </b>
                        - power of N.
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('pow', {
                                    oldStyle: true,
                                    desc: 'power of 2',
                                })
                            }
                        >
                            pow
                        </b>
                        - power of 2.
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('floor', {
                                    oldStyle: true,
                                    desc: 'Math.floor',
                                })
                            }
                        >
                            floor
                        </b>
                        - Math.floor
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('ceil', {
                                    oldStyle: true,
                                    desc: 'Math.ceil',
                                })
                            }
                        >
                            ceil
                        </b>
                        - Math.ceil
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('random', {
                                    oldStyle: true,
                                    desc: 'Math.random',
                                })
                            }
                        >
                            random
                        </b>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('random', {
                                    oldStyle: true,
                                    desc: 'Math.random',
                                    args: [{ type: 'number', label: 'R' }],
                                })
                            }
                        >
                            random(R)
                        </b>
                        - Math.random() * R, or just Math.random() if no argument
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('formatValue', {
                                    oldStyle: true,
                                    desc: 'format value according to system settings and use decimals',
                                    args: [{ type: 'number', label: 'decimals' }],
                                })
                            }
                        >
                            formatValue(decimals)
                        </b>
                        - format value according to system settings and use decimals
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('date', {
                                    oldStyle: true,
                                    desc: 'format value as date. The format is like "YYYY-MM-DD hh:mm:ss.sss"',
                                    args: [{ type: 'string', label: 'format' }],
                                })
                            }
                        >
                            date(format)
                        </b>
                        - format value as date. The format is like:
                        <i style={styles.space}>&quot;YYYY-MM-DD hh:mm:ss.sss&quot;</i>. Format is the same as in
                        <a
                            style={styles.space}
                            href="https://github.com/iobroker/iobroker.javascript/blob/master/README.md#formatdate"
                            target="_blank"
                            rel="noreferrer"
                        >
                            iobroker.javascript
                        </a>
                        .<span style={styles.space}>If no format given, so the system date format will be used.</span>
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('momentDate', {
                                    oldStyle: true,
                                    desc: 'format value as date using Moment.js',
                                    link: 'https://momentjs.com/docs/#/displaying/format/',
                                    args: [
                                        { type: 'string', label: 'format' },
                                        { type: 'boolean', label: 'Use today or yesterday' },
                                    ],
                                })
                            }
                        >
                            momentDate(format, useTodayOrYesterday)
                        </b>
                        - format value as date using Moment.js.
                        <a
                            style={styles.space}
                            href="https://momentjs.com/docs/#/displaying/format/"
                            target="_blank"
                            rel="noreferrer"
                        >
                            formats must be entered according to the moment.js library
                        </a>
                        .
                        <span style={styles.space}>
                            With &apos;useTodayOrYesterday=true&apos; the &apos;moment.js&apos; format
                            &apos;ddd&apos;/&apos;dddd&apos; are overwritten with today / yesterday
                        </span>
                    </li>
                    <li>
                        <b
                            style={styles.clickable}
                            onClick={() =>
                                this.insertInText('array', {
                                    oldStyle: true,
                                    desc: 'returns the element in given array according to index (converted from value)',
                                    args: [{ type: 'string', label: 'array elements divided by comma' }],
                                })
                            }
                        >
                            array(element1,element2[,element3,element4])
                        </b>
                        - returns the element of index. e.g.:
                        <span style={{ ...styles.code, ...styles.space }}>
                            &#123;id.ack;array(ack is false,ack is true)&#125;
                        </span>
                    </li>
                </ul>

                <p>You can use this pattern in any text, like</p>
                <p style={styles.code}>
                    My calculations with &#123;objectID1;operation1;operation2;...&#125; are
                    &#123;objectID2;operation3;operation4;...&#125;
                </p>
                <p>or color calculations:</p>
                <p style={styles.code}>
                    #&#123;objectRed;/(100);*(255);HEX2&#125;&#123;objectGreen;HEX2&#125;&#123;objectBlue;HEX2&#125;
                </p>
                <p>
                    To show timestamp of object write
                    <b style={styles.space}>.ts</b>
                    <span style={styles.space}>or</span>
                    <b style={styles.space}>.lc</b>
                    <span style={styles.space}>(for last change) at the end of object id, e.g.:</span>
                </p>
                <p style={styles.code}>Last change: &#123;objectRed.lc;date(hh:mm)&#125;</p>
            </div>
        );
    }

    getSelectedText(): string {
        return this.state.editValue.substring(this.inputRef.current.selectionStart, this.inputRef.current.selectionEnd);
    }

    renderEditBindDialog(): React.JSX.Element | null {
        if (!this.state.showEditBindingDialog) {
            return null;
        }
        const varValuesKeys = this.state.values ? Object.keys(this.state.values) : [];

        return (
            <Dialog
                sx={{ '& .MuiDialog-paper': styles.dialog }}
                open={!0}
                maxWidth="lg"
                fullWidth
                key="editDialog"
            >
                <DialogTitle>{I18n.t('Edit binding')}</DialogTitle>
                <DialogContent style={styles.content}>
                    <div style={styles.edit}>
                        <TextField
                            variant="standard"
                            label={this.props.label}
                            value={this.state.editValue}
                            inputRef={this.inputRef}
                            autoFocus
                            onKeyUp={e => {
                                if (e.key === 'Enter') {
                                    this.setState({ showEditBindingDialog: false }, () =>
                                        this.onChange(this.state.editValue),
                                    );
                                }
                            }}
                            slotProps={{
                                input: {
                                    endAdornment: this.state.editValue ? (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => this.setState({ editValue: '' })}
                                                edge="end"
                                            >
                                                <Clear />
                                            </IconButton>
                                        </InputAdornment>
                                    ) : null,
                                },
                            }}
                            style={{ width: 'calc(100% - 72px)' }}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                                this.setState({ editValue: e.target.value }, () => {
                                    this.calculateTimeout && clearTimeout(this.calculateTimeout);
                                    this.calculateTimeout = setTimeout(async () => {
                                        this.calculateTimeout = null;
                                        const { calculatedEditValue, values } = await this.calculateValue(
                                            e.target.value,
                                        );
                                        this.setState({ calculatedEditValue, values });
                                    }, 200);
                                })
                            }
                            helperText={
                                <span>
                                    <span style={{ opacity: 0.6, marginRight: 4 }}>{I18n.t('Calculate values')}:</span>
                                    {this.state.calculatedEditValue}
                                </span>
                            }
                        />
                        <Button
                            variant="contained"
                            color="primary"
                            style={{ marginLeft: 8 }}
                            title={I18n.t('Insert object ID')}
                            onClick={() => {
                                this.setState({
                                    showSelectIdDialog: true,
                                    selectionValue: this.getSelectedText(),
                                    selectionStart: this.inputRef.current.selectionStart,
                                    selectionEnd: this.inputRef.current.selectionEnd,
                                });
                            }}
                        >
                            ...
                        </Button>
                    </div>
                    {varValuesKeys.length ? (
                        <div style={styles.values}>
                            {varValuesKeys.map(id => (
                                <div key={id}>
                                    <span style={styles.valueTitle}>{id}</span>
                                    <span>:</span>
                                    <span style={{ ...styles.space, ...styles.valueContent }}>
                                        {`${this.state.values[id] === null || this.state.values[id] === undefined ? 'null' : this.state.values[id].toString()} [${typeof this.state.values[id]}]`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : null}
                    <div style={{ ...styles.help, height: `calc(100% - ${71 + 22 * varValuesKeys.length}px)` }}>
                        <div>
                            {I18n.t('Old style')}
                            <Switch
                                checked={this.state.newStyle}
                                onChange={e => this.setState({ newStyle: e.target.checked })}
                            />
                            {I18n.t('New style')}
                        </div>
                        <div style={{ height: 'calc(100% - 38px)', overflow: 'auto' }}>
                            {this.renderSpecialNames()}
                            {this.state.newStyle
                                ? WidgetBindingField.renderHelpForNewStyle()
                                : this.renderHelpForOldStyle()}
                        </div>
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        disabled={this.state.editValue === this.state.value}
                        color="primary"
                        startIcon={<Check />}
                        onClick={() => {
                            this.setState({ showEditBindingDialog: false }, () => this.onChange(this.state.editValue));
                            store.dispatch(recalculateFields(true));
                        }}
                    >
                        {I18n.t('Apply')}
                    </Button>
                    <Button
                        variant="contained"
                        color="grey"
                        startIcon={<Cancel />}
                        onClick={() => this.setState({ showEditBindingDialog: false })}
                    >
                        {I18n.t('Cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    static isInBrackets(text: string, pos: number): boolean {
        let counter = 0;
        for (let i = 0; i < pos; i++) {
            if (text[i] === '{') {
                counter++;
            } else if (text[i] === '}') {
                counter--;
            }
        }
        return counter > 0;
    }

    renderDialogAskToModify(): React.JSX.Element | null {
        if (!this.state.askToModify) {
            return null;
        }
        return (
            <Dialog
                open={!0}
                key="modifyDialog"
                onClose={() => this.setState({ askToModify: null })}
            >
                <DialogTitle>{I18n.t('Edit binding')}</DialogTitle>
                <DialogContent>
                    <div>{I18n.t('Do you want to modify the value or just use it as it is?')}</div>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        color="grey"
                        onClick={() => {
                            const options = this.state.askToModify;
                            options.modify = true;
                            this.setState({ askToModify: null }, () => this.insertInText(options.text, options));
                        }}
                    >
                        {I18n.t('Modify')}
                    </Button>
                    <Button
                        variant="contained"
                        color="grey"
                        onClick={() => {
                            const options = this.state.askToModify;
                            options.modify = false;
                            this.setState({ askToModify: null }, () => this.insertInText(options.text, options));
                        }}
                    >
                        {I18n.t('Just use without modification')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    renderDialogArguments(): React.JSX.Element | null {
        if (!this.state.askForArguments) {
            return null;
        }
        return (
            <Dialog
                open={!0}
                maxWidth="md"
                fullWidth
                onClose={() => this.setState({ askForArguments: null })}
                key="argsDialog"
            >
                <DialogTitle>{I18n.t('Arguments')}</DialogTitle>
                <DialogContent>
                    <div>{this.state.askForArguments.desc}</div>
                    {this.state.askForArguments.args[0] ? (
                        <div>
                            <TextField
                                variant="standard"
                                label={this.state.askForArguments.args[0].label}
                                value={
                                    this.state.askForArguments.arg1 === undefined ? '' : this.state.askForArguments.arg1
                                }
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        const options = this.state.askForArguments;
                                        options.args = null;
                                        this.setState({ askForArguments: null }, () =>
                                            this.insertInText(options.text, options),
                                        );
                                    }
                                }}
                                slotProps={{
                                    input: {
                                        endAdornment: this.state.askForArguments.arg1 ? (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    onClick={() =>
                                                        this.setState({
                                                            askForArguments: {
                                                                ...this.state.askForArguments,
                                                                arg1: '',
                                                            },
                                                        })
                                                    }
                                                    edge="end"
                                                >
                                                    <Clear />
                                                </IconButton>
                                            </InputAdornment>
                                        ) : null,
                                    },
                                }}
                                autoFocus
                                onChange={e =>
                                    this.setState({
                                        askForArguments: { ...this.state.askForArguments, arg1: e.target.value },
                                    })
                                }
                            />
                        </div>
                    ) : null}
                    {this.state.askForArguments.args[1] ? (
                        <div>
                            <FormControlLabel
                                label={this.state.askForArguments.args[1].label}
                                control={
                                    <Checkbox
                                        checked={!!this.state.askForArguments.arg2}
                                        onChange={e =>
                                            this.setState({
                                                askForArguments: {
                                                    ...this.state.askForArguments,
                                                    arg2: e.target.checked,
                                                },
                                            })
                                        }
                                    />
                                }
                            />
                        </div>
                    ) : null}
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        color="grey"
                        onClick={() => {
                            const options = this.state.askForArguments;
                            options.args = null;
                            this.setState({ askForArguments: null }, () => this.insertInText(options.text, options));
                        }}
                    >
                        {I18n.t('Apply')}
                    </Button>
                    <Button
                        variant="contained"
                        color="grey"
                        onClick={() => this.setState({ askForArguments: null })}
                    >
                        {I18n.t('Cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    async insertInText(text: string, options?: ModifyOptions): Promise<void> {
        options = options || {};
        const selectionStart =
            options.selectionStart === undefined ? this.inputRef.current.selectionStart : options.selectionStart;
        const selectionEnd =
            options.selectionEnd === undefined ? this.inputRef.current.selectionEnd : options.selectionEnd;

        const isInBrackets = WidgetBindingField.isInBrackets(this.state.editValue, selectionStart);
        if (!options.oldStyle && options.modify === undefined && !isInBrackets) {
            // ask about do you want to modify value or not
            this.setState({ askToModify: { ...options, text } });
            return;
        }
        if (options.oldStyle && options.args) {
            // show the argument dialog
            this.setState({ askForArguments: { ...options, text } });
            return;
        }

        let editValue = this.state.editValue;
        if (editValue) {
            if (!isInBrackets && !options.oldStyle) {
                if (options.modify) {
                    editValue = `${editValue.substring(0, selectionStart)}{v:${text};v * 1}${editValue.substring(selectionEnd)}`;
                } else {
                    editValue = `${editValue.substring(0, selectionStart)}{${text}}${editValue.substring(selectionEnd)}`;
                }
            } else if (options.oldStyle) {
                if (options.arg1 !== undefined && options.arg2 !== undefined) {
                    editValue = `${editValue.substring(0, selectionStart)};${text}(${options.arg1}, ${options.arg2})${editValue.substring(selectionEnd)}`;
                } else if (options.arg1 !== undefined) {
                    editValue = `${editValue.substring(0, selectionStart)};${text}(${options.arg1})${editValue.substring(selectionEnd)}`;
                } else {
                    editValue = `${editValue.substring(0, selectionStart)};${text}${editValue.substring(selectionEnd)}`;
                }
            } else {
                editValue = editValue.substring(0, selectionStart) + text + editValue.substring(selectionEnd);
            }
        } else if (options.oldStyle) {
            if (options.arg1 !== undefined && options.arg2 !== undefined) {
                editValue = `{YOUR_OBJECT_ID;${text}(${options.arg1}, ${options.arg2})`;
            } else if (options.arg1 !== undefined) {
                editValue = `{YOUR_OBJECT_ID;${text}(${options.arg1})`;
            } else {
                editValue = `{YOUR_OBJECT_ID;${text}`;
            }
        } else if (options.modify) {
            editValue = `{v:${text};v * 1}`;
        } else {
            editValue = `{${text}}`;
        }
        const { calculatedEditValue, values } = await this.calculateValue(editValue);

        this.setState({ editValue, calculatedEditValue, values }, () => {
            // set cursor on the same position
            this.inputRef.current.focus();
            if (this.inputRef.current.setSelectionRange) {
                this.inputRef.current.setSelectionRange(selectionStart, selectionStart);
                // @ts-expect-error deprecated, but here because of IE
            } else if (this.inputRef.current?.createTextRange) {
                // @ts-expect-error deprecated, but here because of IE
                const t = this.inputRef.current.createTextRange();
                t.collapse(true);
                t.moveEnd('character', selectionStart);
                t.moveStart('character', selectionStart);
                t.select();
            }
        });
    }

    renderSelectIdDialog(): React.JSX.Element | null {
        if (!this.state.showSelectIdDialog) {
            return null;
        }
        return (
            <SelectID
                key="selectDialog"
                imagePrefix="../"
                selected={this.state.selectionValue}
                theme={this.props.theme}
                onOk={async _selected => {
                    let selected;
                    if (Array.isArray(_selected)) {
                        selected = _selected[0];
                    } else {
                        selected = _selected;
                    }
                    // insert on cursor and replace selected text
                    selected &&
                        (await this.insertInText(selected, {
                            selectionStart: this.state.selectionStart,
                            selectionEnd: this.state.selectionEnd,
                        }));
                }}
                onClose={() => this.setState({ showSelectIdDialog: false })}
                socket={this.props.socket as any as Connection}
            />
        );
    }

    render(): React.JSX.Element[] {
        return [
            <TextField
                key="text"
                variant="standard"
                sx={styles.fieldContent}
                fullWidth
                placeholder={this.props.isDifferent ? I18n.t('different') : null}
                slotProps={{
                    input: {
                        sx: { ...styles.clearPadding, ...styles.fieldContent },
                        endAdornment: (
                            <Button
                                title={I18n.t('Edit binding')}
                                disabled={this.props.disabled}
                                size="small"
                                variant="contained"
                                onClick={async () => {
                                    const { calculatedEditValue, values } = await this.calculateValue(this.state.value);
                                    this.setState({
                                        showEditBindingDialog: true,
                                        editValue: this.state.value,
                                        calculatedEditValue,
                                        values,
                                        newStyle: !this.detectOldBindingStyle(this.state.value),
                                    });
                                }}
                            >
                                <LinkIcon />
                            </Button>
                        ),
                    },
                }}
                error={!!this.state.error}
                helperText={typeof this.state.error === 'string' ? I18n.t(this.state.error) : null}
                disabled={this.props.disabled}
                value={this.state.value}
                onChange={e => this.onChange(e.target.value)}
            />,
            this.renderEditBindDialog(),
            this.renderSelectIdDialog(),
            this.renderDialogAskToModify(),
            this.renderDialogArguments(),
        ];
    }
}

export default WidgetBindingField;
