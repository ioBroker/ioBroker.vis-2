import React, { type CSSProperties } from 'react';

import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from '@mui/material';

import {
    MeetingRoom as DoorOpenedIcon,
    LockOpen as LockOpenedIcon,
    Lock as LockClosedIcon,
    Cancel,
    Close,
} from '@mui/icons-material';

import type {
    RxRenderWidgetProps,
    RxWidgetInfo,
    VisWidgetCommand,
    WidgetData,
    VisRxWidgetState,
    VisRxWidgetProps,
} from '@iobroker/types-vis-2';

import Generic from './Generic';
import DoorAnimation from './Components/DoorAnimation';
import PinCodeDialog from './Components/PinCodeDialog';
import LockIcon from './Components/LockIcon';

const styles: Record<string, CSSProperties> = {
    content: {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
    },
    lockWorkingIcon: {
        position: 'absolute',
        top: 10,
        left: 10,
    },
    lockSvgIcon: {
        // width: '100%',
        // height: '100%',
    },
};

interface LockRxData {
    noCard: boolean | 'true';
    widgetTitle: string;
    'lock-oid': string;
    'doorOpen-oid': string;
    'lockWorking-oid': string;
    'doorSensor-oid': string;
    pincode: string;
    'pincode-oid': string;
    doNotConfirm: boolean | 'true';
    pincodeReturnButton: 'submit' | 'backspace';
    doorSize: number;
    lockSize: number;
    noLockAnimation: boolean | 'true';
    lockColor: string;
    externalDialog: boolean | 'true';
}

interface LockState extends VisRxWidgetState {
    confirmDialog: string | boolean;
    lockPinInput: string;
    dialogPin: string | boolean;
    invalidPin: boolean;
    dialog: boolean | null;
}

export default class Lock extends Generic<LockRxData, LockState> {
    constructor(props: VisRxWidgetProps) {
        super(props);
        this.state = {
            ...this.state,
            dialogPin: false,
            lockPinInput: '',
            invalidPin: false,
            confirmDialog: false,
        };
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplMaterial2Lock',
            visSet: 'devices',
            visSetLabel: 'set_label',
            visSetColor: '#00897b',
            visName: 'Lock',
            visWidgetLabel: 'lock',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        {
                            name: 'noCard',
                            label: 'without_card',
                            type: 'checkbox',
                            hidden: 'data.externalDialog === true',
                            noBinding: false,
                        },
                        {
                            name: 'widgetTitle',
                            label: 'name',
                            hidden: 'data.noCard === true || data.externalDialog === true',
                        },
                        {
                            name: 'lock-oid',
                            type: 'id',
                            label: 'lock-oid',
                            onChange: async (field, data, changeData, socket) => {
                                if (data['lock-oid']) {
                                    const object = await socket.getObject(data['lock-oid']);
                                    if (object && object.common && object.common.role === 'switch.lock') {
                                        const id = data[field.name!].split('.');
                                        id.pop();
                                        const states = await socket.getObjectViewSystem(
                                            'state',
                                            `${id.join('.')}.`,
                                            `${id.join('.')}.\u9999`,
                                        );
                                        if (states) {
                                            Object.values(states).forEach(state => {
                                                const role = state.common?.role;
                                                if (role?.startsWith('button')) {
                                                    data['doorOpen-oid'] = state._id;
                                                } else if (role?.includes('direction') || role?.includes('working')) {
                                                    data['lockWorking-oid'] = state._id;
                                                }
                                            });
                                            changeData(data);
                                        }
                                    }
                                }
                            },
                        },
                        {
                            name: 'doorOpen-oid',
                            type: 'id',
                            label: 'doorOpen-oid',
                        },
                        {
                            name: 'lockWorking-oid',
                            type: 'id',
                            label: 'lockWorking-oid',
                            hidden: (data: WidgetData) => !data['lock-oid'],
                        },
                        {
                            name: 'doorSensor-oid',
                            type: 'id',
                            label: 'doorSensor-oid',
                        },
                        {
                            name: 'pincode',
                            label: 'pincode',
                            onChange: (field, data, changeData /* , socket */): Promise<void> => {
                                if (data.pincode?.match(/[^0-9]/g)) {
                                    data.pincode = data.pincode.replace(/[^0-9]/g, '');
                                    changeData(data);
                                }
                                return Promise.resolve();
                            },
                            hidden: (data: WidgetData) => !!data['pincode-oid'],
                        },
                        {
                            name: 'pincode-oid',
                            type: 'id',
                            label: 'pincode_oid',
                            hidden: (data: WidgetData) => !!data.pincode,
                        },
                        {
                            name: 'doNotConfirm',
                            type: 'checkbox',
                            label: 'doNotConfirm',
                            hidden: (data: WidgetData) => !!data.pincode || !!data['pincode-oid'],
                            noBinding: false,
                        },
                        {
                            name: 'pincodeReturnButton',
                            type: 'select',
                            options: ['submit', 'backspace'],
                            default: 'submit',
                            label: 'pincode_return_button',
                            hidden: (data: WidgetData) => !!data['pincode-oid'] && !!data.pincode,
                        },
                        {
                            name: 'doorSize',
                            label: 'doorSize',
                            type: 'slider',
                            min: 20,
                            max: 500,
                            default: 100,
                            hidden: (data: WidgetData) => !data['doorOpen-oid'] && !data['doorSensor-oid'],
                        },
                        {
                            name: 'lockSize',
                            label: 'lockSize',
                            type: 'slider',
                            min: 15,
                            max: 500,
                            default: 40,
                            hidden: (data: WidgetData) => !data['lock-oid'],
                        },
                        {
                            name: 'noLockAnimation',
                            label: 'noLockAnimation',
                            type: 'checkbox',
                            hidden: (data: WidgetData) => !data['lock-oid'],
                            noBinding: false,
                        },
                        {
                            name: 'lockColor',
                            label: 'Lock color',
                            type: 'color',
                            hidden: (data: WidgetData) =>
                                !data['lock-oid'] || data.noLockAnimation === true || data.noLockAnimation === 'true',
                        },
                        {
                            name: 'externalDialog',
                            label: 'use_as_dialog',
                            type: 'checkbox',
                            tooltip: 'use_as_dialog_tooltip',
                            noBinding: false,
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: '100%',
                height: 240,
                position: 'relative',
            },
            visPrev: 'widgets/devices/img/prev_lock.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return Lock.getWidgetInfo();
    }

    lockRenderUnlockDialog(): React.ReactNode {
        if (!this.state.dialogPin) {
            return null;
        }

        return (
            <PinCodeDialog
                pinCode={this.lockGetPinCode()}
                pinCodeReturnButton={this.state.rxData.pincodeReturnButton === 'backspace' ? 'backspace' : 'submit'}
                onClose={(result?: boolean) => {
                    if (result) {
                        if (this.state.dialogPin === 'doorOpen-oid') {
                            this.props.context.setValue(this.state.rxData['doorOpen-oid'], true);
                        } else {
                            this.props.context.setValue(this.state.rxData['lock-oid'], true);
                        }
                    }
                    this.setState({ dialogPin: false });
                }}
            />
        );
    }

    lockGetPinCode(): string {
        return this.state.rxData['pincode-oid'] ? this.getPropertyValue('pincode-oid') : this.state.rxData.pincode;
    }

    lockRenderConfirmDialog(): React.ReactNode {
        if (!this.state.confirmDialog) {
            return null;
        }
        return (
            <Dialog
                open={!0}
                onClose={() => this.setState({ confirmDialog: false })}
            >
                <DialogContent>{Generic.t('please_confirm')}</DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                            this.setState({ confirmDialog: false });
                            if (this.state.confirmDialog === 'doorOpen-oid') {
                                this.props.context.setValue(this.state.rxData['doorOpen-oid'], true);
                            } else {
                                this.props.context.setValue(this.state.rxData['lock-oid'], true);
                            }
                        }}
                        startIcon={
                            this.state.confirmDialog === 'doorOpen-oid' ? <DoorOpenedIcon /> : <LockOpenedIcon />
                        }
                    >
                        {Generic.t('Open')}
                    </Button>
                    <Button
                        variant="contained"
                        color="grey"
                        autoFocus
                        onClick={() => this.setState({ confirmDialog: false })}
                        startIcon={<Cancel />}
                    >
                        {Generic.t('Cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

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

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element[] | React.JSX.Element | null {
        super.renderWidgetBody(props);
        const doorOpened = this.state.rxData['doorSensor-oid'] && this.getPropertyValue('doorSensor-oid');
        const lockOpened = this.getPropertyValue('lock-oid');
        const working = this.state.rxData['lockWorking-oid'] && this.getPropertyValue('lockWorking-oid');

        const content = (
            <div>
                {this.lockRenderUnlockDialog()}
                {this.lockRenderConfirmDialog()}
                {this.state.rxData['doorSensor-oid'] || this.state.rxData['doorOpen-oid'] ? (
                    <IconButton
                        disabled={!this.state.rxData['doorOpen-oid']}
                        title={this.state.rxData['doorOpen-oid'] ? Generic.t('open_door') : undefined}
                        onClick={() => {
                            if (this.lockGetPinCode()) {
                                this.setState({ dialogPin: 'doorOpen-oid', lockPinInput: '' });
                            } else if (
                                this.state.rxData.doNotConfirm === true ||
                                this.state.rxData.doNotConfirm === 'true'
                            ) {
                                this.props.context.setValue(this.state.rxData['doorOpen-oid'], true);
                            } else {
                                this.setState({ confirmDialog: 'doorOpen-oid' });
                            }
                        }}
                    >
                        <DoorAnimation
                            open={doorOpened}
                            size={this.state.rxData.doorSize}
                        />
                    </IconButton>
                ) : null}
                {this.state.rxData['lock-oid'] ? (
                    <IconButton
                        title={lockOpened ? Generic.t('close_lock') : Generic.t('open_lock')}
                        onClick={() => {
                            if (!lockOpened && this.lockGetPinCode()) {
                                this.setState({ dialogPin: 'lock-oid', lockPinInput: '' });
                            } else if (
                                lockOpened ||
                                this.state.rxData.doNotConfirm === true ||
                                this.state.rxData.doNotConfirm === 'true'
                            ) {
                                this.props.context.setValue(
                                    this.state.rxData['lock-oid'],
                                    !this.getPropertyValue('lock-oid'),
                                );
                            } else {
                                this.setState({ confirmDialog: 'lock-oid' });
                            }
                        }}
                    >
                        <style>
                            {`
.iob-lock {
    transition: transform 0.5s ease;
    transform-origin: 15px 60px;
}
.iob-lock-opened {
    transform: rotate(-30deg);
}
.iob-lock-closed {
    transform: rotate(0deg);
}
`}
                        </style>
                        {working && working !== 3 /* 3 = UNDEFINED */ ? (
                            <CircularProgress
                                style={styles.lockWorkingIcon}
                                size={this.state.rxData.lockSize || 40}
                            />
                        ) : null}
                        {this.state.rxData.noLockAnimation === true || this.state.rxData.noLockAnimation === 'true' ? (
                            lockOpened ? (
                                <LockOpenedIcon
                                    style={{
                                        ...styles.lockSvgIcon,
                                        width: this.state.rxData.lockSize,
                                        height: this.state.rxData.lockSize,
                                    }}
                                    sx={theme => ({ color: theme.palette.primary.main })}
                                />
                            ) : (
                                <LockClosedIcon
                                    style={{
                                        ...styles.lockSvgIcon,
                                        width: this.state.rxData.lockSize,
                                        height: this.state.rxData.lockSize,
                                    }}
                                />
                            )
                        ) : (
                            <LockIcon
                                className={lockOpened ? 'iob-lock iob-lock-opened' : 'iob-lock iob-lock-closed'}
                                opened={lockOpened}
                                style={{
                                    color: this.state.rxData.lockColor,
                                    height: this.state.rxData.lockSize,
                                    width: 'auto',
                                }}
                            />
                        )}
                    </IconButton>
                ) : null}
            </div>
        );

        if (
            (this.state.rxData.externalDialog === true || this.state.rxData.externalDialog === 'true') &&
            !this.props.editMode
        ) {
            return this.state.dialog ? (
                <Dialog
                    open={!0}
                    onClose={() => this.setState({ dialog: null })}
                >
                    <DialogTitle>
                        {this.state.rxData.widgetTitle}
                        <IconButton
                            style={{ float: 'right', zIndex: 2 }}
                            onClick={() => this.setState({ dialog: null })}
                        >
                            <Close />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>{content}</DialogContent>
                </Dialog>
            ) : null;
        }

        if (this.state.rxData.noCard === true || this.state.rxData.noCard === 'true' || props.widget.usedInWidget) {
            return content;
        }

        return this.wrapContent(content, null, {
            boxSizing: 'border-box',
            paddingBottom: 10,
            height: '100%',
        });
    }
}
