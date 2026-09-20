import React, { type CSSProperties } from 'react';

import { Button, Chip, Dialog, DialogContent, DialogTitle } from '@mui/material';
import { RemoveModerator as RemoveModeratorIcon, Security as SecurityIcon } from '@mui/icons-material';

import { Icon, Message as DialogMessage } from '@iobroker/gui-components';
import type { RxRenderWidgetProps, RxWidgetInfo, VisRxWidgetProps, VisRxWidgetState } from '@iobroker/types-vis-2';

import Generic from './Generic';
import PinCodeDialog from './Components/PinCodeDialog';

const styles: Record<string, CSSProperties> = {
    timerDialog: {
        textAlign: 'center',
    },
    timerSeconds: {
        fontSize: '200%',
        padding: 40,
    },
    lockedButton: {
        display: 'flex',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        gap: 8,
    },
    unlockedButtons: {
        display: 'flex',
        width: '100%',
        justifyContent: 'space-around',
        alignItems: 'center',
        flex: 1,
        gap: 8,
    },
    lockButton: {
        display: 'flex',
        gap: 8,
        alignItems: 'center',
    },
    icon: {
        height: 20,
    },
    status: {
        display: 'flex',
        alignItems: 'center',
    },
    noCardContainer: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    noCardLocked: {
        width: '100%',
        textAlign: 'right',
    },
};

interface SecurityRxData {
    noCard: boolean;
    widgetTitle: string;
    disarmText: string;
    securityOffText: string;
    buttonsCount: number;
    [key: `oid${number}`]: string;
    [key: `name${number}`]: string;
    [key: `color${number}`]: string;
    [key: `icon${number}`]: string;
    [key: `iconSmall${number}`]: string;
    [key: `pincode${number}`]: string;
    [key: `pincode-oid${number}`]: string;
    [key: `pincodeReturnButton${number}`]: 'submit' | 'backspace';
    [key: `timerSeconds${number}`]: number;
    [key: `timerSeconds-oid${number}`]: string;
}

interface SecurityState extends VisRxWidgetState {
    message: string | null;
    dialog: boolean;
    pinInput: string;
    timerDialog: null | number;
    invalidPin: boolean;
    timerSeconds: number;
    objects: { common: ioBroker.StateCommon; _id: string }[];
}

class Security extends Generic<SecurityRxData, SecurityState> {
    private timerInterval?: ReturnType<typeof setInterval>;
    private lastRxData = '';

    constructor(props: VisRxWidgetProps) {
        super(props);
        this.state = {
            ...this.state,
            dialog: false,
            objects: [],
            timerDialog: null,
            pinInput: '',
            invalidPin: false,
            timerSeconds: 0,
        };
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplMaterial2Security',
            visSet: 'vis-2-widgets-material',
            visSetLabel: 'set_label',
            visSetColor: '#0f8cc9',
            visName: 'Security',
            visWidgetLabel: 'security',
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
                            name: 'widgetTitle',
                            label: 'name',
                            hidden: '!!data.noCard',
                        },
                        {
                            name: 'disarmText',
                            label: 'disarm_text',
                        },
                        {
                            name: 'securityOffText',
                            label: 'security_off_text',
                        },
                        {
                            name: 'buttonsCount',
                            label: 'buttons_count',
                            type: 'number',
                            default: 1,
                        },
                    ],
                },
                {
                    name: 'buttons',
                    indexFrom: 1,
                    indexTo: 'buttonsCount',
                    fields: [
                        {
                            name: 'oid',
                            type: 'id',
                            label: 'oid',
                            onChange: async (field, data, changeData, socket) => {
                                if (data[field.name!]) {
                                    const object = await socket.getObject(data[field.name!]);
                                    let changed = false;
                                    if (object?.common) {
                                        if (
                                            object.common.color &&
                                            data[`color${field.index}`] !== object.common.color
                                        ) {
                                            data[`color${field.index}`] = object.common.color;
                                            changed = true;
                                        }
                                        if (object.common.name) {
                                            const name = object.common.name ? Generic.getText(object.common.name) : '';
                                            if (data[`name${field.index}`] !== name) {
                                                data[`name${field.index}`] = name;
                                                changed = true;
                                            }
                                        }
                                        changed && changeData(data);
                                    }
                                }
                            },
                        },
                        {
                            name: 'name',
                            label: 'name',
                            default: Generic.t('default_button_name'),
                        },
                        {
                            name: 'color',
                            type: 'color',
                            label: 'color',
                        },
                        {
                            name: 'icon',
                            type: 'image',
                            label: 'icon',
                        },
                        {
                            name: 'iconSmall',
                            type: 'icon64',
                            label: 'small_icon',
                            hidden: '!!data.icon',
                        },
                        {
                            name: 'pincode',
                            label: 'pincode',
                            onChange: (field, data, changeData /* , socket */): Promise<void> => {
                                data[`pincode${field.index}`] = (data[`pincode${field.index}`] || '').replace(
                                    /[^0-9]/g,
                                    '',
                                );
                                changeData(data);
                                return Promise.resolve();
                            },
                            hidden: (data, index) => !!data[`pincode-oid${index}`],
                        },
                        {
                            name: 'pincode-oid',
                            type: 'id',
                            label: 'pincode_oid',
                            hidden: (data, index) => !!data[`pincode${index}`],
                        },
                        {
                            name: 'pincodeReturnButton',
                            type: 'select',
                            options: ['submit', 'backspace'],
                            default: 'submit',
                            label: 'pincode_return_button',
                            hidden: (data, index) => !!data[`pincode-oid${index}`] && !!data[`pincode${index}`],
                        },
                        {
                            name: 'timerSeconds',
                            type: 'number',
                            label: 'timer_seconds',
                        },
                        {
                            name: 'timerSeconds-oid',
                            type: 'id',
                            label: 'timer_seconds_oid',
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: '100%',
                height: 240,
                position: 'relative',
            },
            visPrev: 'widgets/material/img/prev_security.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return Security.getWidgetInfo();
    }

    async propertiesUpdate(): Promise<void> {
        const actualRxData = JSON.stringify(this.state.rxData);
        if (this.lastRxData === actualRxData) {
            return;
        }

        this.lastRxData = actualRxData;

        const objects: { common: ioBroker.StateCommon; _id: string; isChart: boolean }[] = [];
        const ids = [];
        for (let index = 1; index <= this.state.rxData.buttonsCount; index++) {
            if (this.state.rxData[`oid${index}`] && this.state.rxData[`oid${index}`] !== 'nothing_selected') {
                ids.push(this.state.rxData[`oid${index}`]);
            }
        }
        const _objects = ids.length ? ((await this.props.context.socket.getObjectsById(ids)) ?? {}) : {};

        // try to find icons for all OIDs
        for (let index = 1; index <= this.state.rxData.buttonsCount; index++) {
            const object = _objects[this.state.rxData[`oid${index}`]];
            // read object itself
            if (!object) {
                objects[index] = {
                    common: {} as ioBroker.StateCommon,
                    _id: this.state.rxData[`oid${index}`],
                    isChart: false,
                };
                continue;
            }
            object.common ||= {} as ioBroker.StateCommon;
            const isChart = !!(
                object.common.custom && object.common.custom[this.props.context.systemConfig?.common?.defaultHistory]
            );
            if (
                !this.state.rxData[`icon${index}`] &&
                !object.common.icon &&
                (object.type === 'state' || object.type === 'channel')
            ) {
                const idArray = this.state.rxData[`oid${index}`].split('.');

                // read channel
                const parentObject = await this.props.context.socket.getObject(idArray.slice(0, -1).join('.'));
                if (!parentObject?.common?.icon) {
                    const grandParentObject = await this.props.context.socket.getObject(idArray.slice(0, -2).join('.'));
                    if (grandParentObject?.common?.icon) {
                        object.common.icon = grandParentObject.common.icon;
                        if (grandParentObject.type === 'instance' || grandParentObject.type === 'adapter') {
                            object.common.icon = `../${grandParentObject.common.name}.admin/${object.common.icon}`;
                        }
                    }
                } else {
                    object.common.icon = parentObject.common.icon;
                    if (parentObject.type === 'instance' || parentObject.type === 'adapter') {
                        object.common.icon = `../${parentObject.common.name}.admin/${object.common.icon}`;
                    }
                }
            }
            objects[index] = { common: object.common as ioBroker.StateCommon, _id: object._id, isChart };
        }

        if (JSON.stringify(objects) !== JSON.stringify(this.state.objects)) {
            this.setState({ objects });
        }
    }

    async onRxDataChanged(/* prevRxData */): Promise<void> {
        await this.propertiesUpdate();
    }

    async componentDidMount(): Promise<void> {
        super.componentDidMount();
        await this.propertiesUpdate();
    }

    componentWillUnmount(): void {
        this.timerInterval && clearInterval(this.timerInterval);
        this.timerInterval = undefined;
        super.componentWillUnmount();
    }

    renderUnlockDialog(): React.JSX.Element | null {
        let lockedId: string | null = null;
        let pinCode = '';
        let pinCodeReturnButton: 'backspace' | 'submit' = 'submit';
        for (let i = 1; i <= this.state.rxData.buttonsCount; i++) {
            if (this.getPropertyValue(`oid${i}`)) {
                lockedId = this.state.rxData[`oid${i}`];
                pinCode = this.getPinCode(i);
                pinCodeReturnButton =
                    this.state.rxData[`pincodeReturnButton${i}`] === 'backspace' ? 'backspace' : 'submit';
                break;
            }
        }
        if (!this.state.dialog) {
            return null;
        }

        return (
            <PinCodeDialog
                pinCode={pinCode}
                pinCodeReturnButton={pinCodeReturnButton}
                onClose={(result?: boolean) => {
                    if (result && lockedId) {
                        this.props.context.setValue(lockedId, false);
                    }
                    this.setState({ dialog: false });
                }}
            />
        );
    }

    renderTimerDialog(): React.JSX.Element | null {
        if (this.state.timerDialog === null) {
            return null;
        }

        const onClose = (): void => {
            const index = this.state.timerDialog!;
            this.setState({ timerDialog: null });
            if (this.state.rxData[`timerSeconds-oid${index}`]) {
                this.props.context.setValue(this.state.rxData[`timerSeconds-oid${index}`], -1);
            }
            clearInterval(this.timerInterval);
        };
        const index = this.state.timerDialog;

        return (
            <Dialog
                open={!0}
                onClose={onClose}
                style={styles.timerDialog}
            >
                <DialogTitle>
                    {Generic.t('lock_after', (this.state.rxData[`timerSeconds${index}`] || 0).toString())}
                </DialogTitle>
                <DialogContent>
                    <div style={styles.timerSeconds}>{this.state.timerSeconds}</div>
                    <div>
                        <Button
                            onClick={onClose}
                            variant="contained"
                        >
                            {Generic.t('lock_cancel')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    startTimer(index: number): void {
        const timerSeconds = this.state.rxData[`timerSeconds${index}`];
        this.setState({ timerSeconds, timerDialog: index });
        if (this.state.rxData[`timerSeconds-oid${index}`]) {
            this.props.context.setValue(this.state.rxData[`timerSeconds-oid${index}`], timerSeconds);
        }
        this.timerInterval = setInterval(() => {
            const _timerSeconds = this.state.timerSeconds - 1;
            this.setState({ timerSeconds: _timerSeconds });
            if (!_timerSeconds) {
                if (!this.state.rxData[`oid${index}`]) {
                    this.setState({ message: Generic.t('no_oid') });
                } else {
                    this.props.context.setValue(this.state.rxData[`oid${index}`], true);
                }
                if (this.state.rxData[`timerSeconds-oid${index}`]) {
                    this.props.context.setValue(this.state.rxData[`timerSeconds-oid${index}`], 0);
                }
                this.timerInterval && clearInterval(this.timerInterval);
                this.setState({ timerDialog: null });
            }
        }, 1000);
    }

    getPinCode(i: number): string {
        return this.state.rxData[`pincode-oid${i}`]
            ? this.getPropertyValue(`pincode-oid${i}`)
            : this.state.rxData[`pincode${i}`];
    }

    renderMessageDialog(): React.ReactNode {
        return this.state.message ? (
            <DialogMessage
                text={this.state.message}
                onClose={() => this.setState({ message: null })}
            />
        ) : null;
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element[] | React.JSX.Element | null {
        super.renderWidgetBody(props);

        const buttons: {
            i: number;
            oid: string;
            name: string;
            color: string;
            icon: string | undefined;
        }[] = [];

        let lockedButton: {
            i: number;
            oid: string;
            name: string;
            color: string;
            icon: string | undefined;
        } | null = null;

        for (let i = 1; i <= this.state.rxData.buttonsCount; i++) {
            buttons.push({
                i,
                oid: this.state.rxData[`oid${i}`],
                name: this.state.rxData[`name${i}`],
                color: this.state.rxData[`color${i}`],
                icon:
                    this.state.rxData[`icon${i}`] ||
                    this.state.rxData[`iconSmall${i}`] ||
                    this.state.objects[i]?.common?.icon,
            });
            if (this.getPropertyValue(`oid${i}`)) {
                lockedButton = buttons[buttons.length - 1];
            }
        }

        const content = (
            <>
                {this.renderUnlockDialog()}
                {this.renderTimerDialog()}
                {this.renderMessageDialog()}
                {lockedButton ? (
                    <div style={styles.lockedButton}>
                        <Button
                            variant="contained"
                            onClick={() => {
                                if (this.getPinCode(lockedButton.i)) {
                                    this.setState({ dialog: true, pinInput: '' });
                                } else {
                                    this.props.context.setValue(lockedButton.oid, false);
                                }
                            }}
                        >
                            {this.state.rxData.disarmText || Generic.t('unlock')}
                        </Button>
                    </div>
                ) : (
                    <div style={styles.unlockedButtons}>
                        {buttons.map((button, index) => (
                            <Button
                                variant="contained"
                                key={index}
                                style={{ backgroundColor: button.color }}
                                onClick={() => {
                                    if (this.state.rxData[`timerSeconds${button.i}`]) {
                                        this.startTimer(button.i);
                                    } else if (!button.oid) {
                                        this.setState({ message: Generic.t('no_oid') });
                                    } else {
                                        this.props.context.setValue(button.oid, true);
                                    }
                                }}
                            >
                                <span style={styles.lockButton}>
                                    {button.icon ? (
                                        <Icon
                                            style={styles.icon}
                                            src={button.icon}
                                            alt=""
                                        />
                                    ) : null}
                                    {button.name}
                                </span>
                            </Button>
                        ))}
                    </div>
                )}
            </>
        );

        const lockedChip = (
            <Chip
                label={
                    <span style={styles.status}>
                        {lockedButton ? (
                            <>
                                <SecurityIcon />
                                {lockedButton.name}
                            </>
                        ) : (
                            <>
                                <RemoveModeratorIcon />
                                {this.state.rxData.securityOffText || Generic.t('security_off')}
                            </>
                        )}
                    </span>
                }
                style={{
                    backgroundColor: lockedButton ? 'orange' : 'green',
                    color: lockedButton ? 'black' : 'white',
                }}
            />
        );

        if (this.state.rxData.noCard || props.widget.usedInWidget) {
            return (
                <div style={styles.noCardContainer}>
                    <div style={styles.noCardLocked}>{lockedChip}</div>
                    {content}
                </div>
            );
        }

        return this.wrapContent(content, lockedChip, {
            boxSizing: 'border-box',
            paddingBottom: 10,
            height: '100%',
        });
    }
}

export default Security;
