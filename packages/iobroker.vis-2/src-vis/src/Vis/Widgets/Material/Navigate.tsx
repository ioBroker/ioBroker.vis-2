import React from 'react';

import { Button, LinearProgress, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';

import { Icon } from '@iobroker/gui-components';
import type {
    RxRenderWidgetProps,
    RxWidgetInfo,
    VisRxWidgetProps,
    VisRxWidgetState,
    WidgetData,
} from '@iobroker/types-vis-2';

import Generic from './Generic';
import PinCodeDialog from './Components/PinCodeDialog';
import type { EditNavigationDialogProps } from './Components/EditNavigationDialog';

/**
 * The dialog that re-orders the entries. It belongs to the attributes of the widget, so it is only ever shown in
 * the editor and is loaded when it is opened - the runtime does not carry it.
 */
const EditNavigationDialog = React.lazy(async () => {
    const { default: Dialog } = await import('./Components/EditNavigationDialog');
    // the dialog reads its props in `getDerivedStateFromProps`, which React.lazy does not describe
    return { default: Dialog as unknown as React.FC<EditNavigationDialogProps> };
});

type NavigateRxData = {
    noCard: boolean;
    variant: 'text' | 'outlined' | 'contained';
    widgetTitle: string;
    title: string;
    icon: string;
    iconSmall: string;
    showCurrentView: boolean | 'true';
    pinCodeReturnButton: 'submit' | 'backspace';
    count: number;
    [key: `view${number}`]: string;
    [key: `link${number}`]: string;
    [key: `linkSelf${number}`]: boolean | 'true';
    [key: `linkHidden${number}`]: boolean | 'true';
    [key: `icon${number}`]: string;
    [key: `iconSmall${number}`]: string;
    [key: `iconEnabled${number}`]: string;
    [key: `iconEnabledSmall${number}`]: string;
    [key: `color${number}`]: string;
    [key: `colorEnabled${number}`]: string;
    [key: `title${number}`]: string;
    [key: `titleEnabled${number}`]: string;
    [key: `pinCode${number}`]: string;
    [key: `oid-pinCode${number}`]: string;
    [key: `disabled${number}`]: boolean | 'true';
    [key: `hide${number}`]: boolean | 'true';
};

interface NavigateState extends VisRxWidgetState {
    dialogPin: number | null;
    menuTarget: HTMLButtonElement | null;
    invalidPin: boolean;
    lockPinInput: string;
}

export default class Navigate extends Generic<NavigateRxData, NavigateState> {
    constructor(props: VisRxWidgetProps) {
        super(props);
        this.state = {
            ...this.state,
            dialogPin: null,
            menuTarget: null,
            invalidPin: false,
            lockPinInput: '',
        };
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplMaterial2Navigate',
            visSet: 'vis-2-widgets-material',
            visSetLabel: 'set_label',
            visSetColor: '#0f8cc9',
            visName: 'Navigate',
            visWidgetLabel: 'navigate', // Label of widget
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
                            name: 'variant',
                            label: 'variant',
                            type: 'select',
                            options: ['text', 'outlined', 'contained'],
                        },
                        {
                            name: 'widgetTitle',
                            label: 'name',
                            hidden: '!!data.noCard',
                        },
                        {
                            name: 'title',
                            label: 'title',
                            type: 'text',
                        },
                        {
                            name: 'icon',
                            type: 'image',
                            label: 'icon',
                            hidden: '!!data["iconSmall" + index]',
                        },
                        {
                            name: 'iconSmall',
                            type: 'icon64',
                            label: 'small_icon',
                            hidden: '!!data["icon" + index]',
                        },
                        {
                            name: 'showCurrentView',
                            type: 'checkbox',
                            label: 'show_current_view',
                            noBinding: false,
                            hidden: (_data: WidgetData): boolean => {
                                const data = _data as NavigateRxData;
                                for (let i = 1; i <= data.count; i++) {
                                    if (data[`view${i}`]) {
                                        return false;
                                    }
                                }
                                return true;
                            },
                        },
                        {
                            name: 'pinCodeReturnButton',
                            type: 'select',
                            options: ['submit', 'backspace'],
                            default: 'submit',
                            label: 'pincode_return_button',
                            hidden: (_data: WidgetData): boolean => {
                                const data = _data as NavigateRxData;
                                for (let i = 1; i <= data.count; i++) {
                                    if (data[`oid-pinCode${i}`] || data[`pinCode${i}`]) {
                                        return false;
                                    }
                                }
                                return true;
                            },
                        },
                        {
                            name: 'count',
                            type: 'number',
                            default: 1,
                            label: 'count',
                        },
                        {
                            label: '',
                            name: '_settings',
                            type: 'custom',
                            component: (field, data, setData, props): React.JSX.Element => (
                                <React.Suspense fallback={<LinearProgress />}>
                                    <EditNavigationDialog
                                        data={data as NavigateRxData}
                                        setData={(data: WidgetData): void => setData(data)}
                                        Editor={(props as any).Editor}
                                        views={props.context.views}
                                        selectedWidgets={props.selectedWidgets}
                                    />
                                </React.Suspense>
                            ),
                        },
                    ],
                },
                {
                    name: 'item',
                    label: 'group_item',
                    indexFrom: 1,
                    indexTo: 'count',
                    fields: [
                        {
                            name: 'view',
                            type: 'views',
                            label: 'view',
                            hidden: '!!data["link" + index]',
                        },
                        {
                            name: 'link',
                            type: 'text',
                            label: 'URL',
                            hidden: '!!data["view" + index]',
                        },
                        {
                            name: 'title',
                            type: 'text',
                            label: 'title',
                            noButton: true,
                        },
                        {
                            name: 'titleEnabled',
                            type: 'text',
                            label: 'titleEnabled',
                            noButton: true,
                            hidden: '!data["view" + index]',
                        },
                        {
                            name: 'icon',
                            type: 'image',
                            label: 'icon',
                            hidden: '!!data["iconSmall" + index] || (!data["view" + index] && !data["link" + index])',
                        },
                        {
                            name: 'iconSmall',
                            type: 'icon64',
                            label: 'small_icon',
                            hidden: '!!data["icon" + index] || (!data["view" + index] && !data["link" + index])',
                        },
                        {
                            name: 'iconEnabled',
                            type: 'image',
                            label: 'icon_active',
                            hidden: '!!data["iconEnabledSmall" + index] || !data["view" + index]',
                        },
                        {
                            name: 'iconEnabledSmall',
                            type: 'icon64',
                            label: 'small_icon_active',
                            hidden: '!!data["iconEnabled" + index] || !data["view" + index]',
                        },
                        {
                            name: 'color',
                            type: 'color',
                            label: 'color',
                            hidden: '!data["view" + index] && !data["link" + index]',
                        },
                        {
                            name: 'colorEnabled',
                            type: 'color',
                            label: 'color_active',
                            hidden: '!data["view" + index]',
                        },
                        {
                            name: 'hide',
                            type: 'checkbox',
                            label: 'hide',
                            tooltip: 'hide_tooltip',
                            noBinding: false,
                            hidden: '!data["view" + index] && !data["link" + index]',
                        },
                        {
                            name: 'disabled',
                            type: 'checkbox',
                            label: 'disabled',
                            noBinding: false,
                            hidden: '!data["view" + index] && !data["link" + index]',
                        },
                        {
                            name: 'pinCode',
                            label: 'pincode',
                            onChange: (field, _data, changeData, socket, index): Promise<void> => {
                                const data = _data as NavigateRxData;
                                if (data[`pinCode${index!}`]?.match(/[^0-9]/g)) {
                                    data[`pinCode${index!}`] = data[`pinCode${index!}`].replace(/[^0-9]/g, '');
                                    changeData(data);
                                }
                                return Promise.resolve();
                            },
                            hidden: '!!data["oid-pinCode" + index] || (!data["view" + index] && !data["link" + index])',
                        },
                        {
                            name: 'oid-pinCode',
                            type: 'id',
                            label: 'pincode_oid',
                            hidden: '!!data["pinCode" + index] || (!data["view" + index] && !data["link" + index])',
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: '100%',
                height: 72,
                position: 'relative',
            },
            visPrev: 'widgets/material/img/prev_navigate.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return Navigate.getWidgetInfo();
    }

    isSelected(index: number): boolean {
        return this.state.rxData[`view${index}`] === this.props.view;
    }

    getStateIcon(index: number): React.JSX.Element | null {
        let iconStr: string | undefined = '';
        let icon: React.JSX.Element | null = null;
        if (this.isSelected(index)) {
            iconStr = this.state.rxData[`iconEnabled${index}`] || this.state.rxData[`iconEnabledSmall${index}`];
        }
        iconStr ||= this.state.rxData[`icon${index}`] || this.state.rxData[`iconSmall${index}`];
        iconStr ||= this.state.rxData[`view${index}`]
            ? this.props.context.views[this.state.rxData[`view${index}`]]?.settings?.navigationIcon ||
              this.props.context.views[this.state.rxData[`view${index}`]]?.settings?.navigationImage ||
              this.props.context.views[this.state.rxData[`view${index}`]]?.settings?.navigationBarIcon ||
              this.props.context.views[this.state.rxData[`view${index}`]]?.settings?.navigationBarImage
            : '';

        if (iconStr) {
            icon = (
                <Icon
                    src={iconStr}
                    style={{
                        width: 24,
                        height: 24,
                    }}
                />
            );
        }

        return icon;
    }

    getColor(index: number): string | undefined {
        let color: string | undefined = this.isSelected(index)
            ? this.state.rxData[`colorEnabled${index}`] ||
              this.state.rxData[`color${index}`] ||
              this.props.context.views[this.state.rxData[`view${index}`]]?.settings?.navigationSelectedColor
            : undefined;
        color ||=
            this.state.rxData[`color${index}`] ||
            this.props.context.views[this.state.rxData[`view${index}`]]?.settings?.navigationColor ||
            this.props.context.views[this.state.rxData[`view${index}`]]?.settings?.navigationBarColor;

        return color;
    }

    renderUnlockDialog(): React.ReactNode {
        if (!this.state.dialogPin) {
            return null;
        }

        return (
            <PinCodeDialog
                pinCode={this.getPinCode(this.state.dialogPin)}
                pinCodeReturnButton={this.state.rxData.pinCodeReturnButton === 'backspace' ? 'backspace' : 'submit'}
                onClose={(result?: boolean) => {
                    if (result) {
                        this.onItemClick(this.state.dialogPin!, true);
                    }
                    this.setState({ dialogPin: null });
                }}
            />
        );
    }

    getTitle(index: number): string {
        let title = this.isSelected(index) ? this.state.rxData[`titleEnabled${index}`] : '';
        title ||=
            this.state.rxData[`title${index}`] ||
            this.props.context.views[this.state.rxData[`view${index}`]]?.settings?.navigationTitle ||
            this.props.context.views[this.state.rxData[`view${index}`]]?.settings?.navigationBarText ||
            '';
        title ||= this.state.rxData[`view${index}`] || '';
        return title;
    }

    renderMenu(): React.JSX.Element | null {
        if (!this.state.menuTarget) {
            return null;
        }
        const icons: (React.JSX.Element | null)[] = [];
        for (let i = 1; i <= this.state.rxData.count; i++) {
            icons[i] = this.getStateIcon(i);
        }
        const anyIcon = !!icons.find(icon => icon);
        const items: React.JSX.Element[] = [];
        for (let i = 1; i <= this.state.rxData.count; i++) {
            if (
                (this.state.rxData[`link${i}`] || this.state.rxData[`view${i}`]) &&
                this.state.rxData[`hide${i}`] !== true &&
                this.state.rxData[`hide${i}`] !== 'true'
            ) {
                let title = this.isSelected(i) ? this.state.rxData[`titleEnabled${i}`] : '';
                title ||=
                    this.state.rxData[`title${i}`] ||
                    this.props.context.views[this.state.rxData[`view${i}`]]?.settings?.navigationTitle ||
                    this.props.context.views[this.state.rxData[`view${i}`]]?.settings?.navigationBarText ||
                    '';
                title ||= this.state.rxData[`view${i}`] || '';

                items.push(
                    <MenuItem
                        key={i}
                        style={{ color: this.getColor(i) }}
                        selected={this.isSelected(i)}
                        onClick={() => this.setState({ menuTarget: null }, () => this.onItemClick(i))}
                        disabled={
                            this.state.rxData[`disabled${i}`] === true || this.state.rxData[`disabled${i}`] === 'true'
                        }
                    >
                        {anyIcon ? (
                            <ListItemIcon>
                                <Icon
                                    src={icons[i]}
                                    style={{ height: 24, width: 'auto' }}
                                />
                            </ListItemIcon>
                        ) : null}
                        <ListItemText>{title}</ListItemText>
                    </MenuItem>,
                );
            }
        }

        return (
            <Menu
                open={!0}
                anchorEl={this.state.menuTarget}
                onClose={() => this.setState({ menuTarget: null })}
            >
                {items}
            </Menu>
        );
    }

    getPinCode(index: number): string {
        return this.state.rxData[`oid-pinCode${index}`]
            ? this.getPropertyValue(`oid-pinCode${index}`)
            : this.state.rxData[`pinCode${index}`];
    }

    onItemClick(index: number, bypassPinCode?: boolean): void {
        if (this.state.rxData[`disabled${index}`] === true || this.state.rxData[`disabled${index}`] === 'true') {
            return;
        }

        if (!bypassPinCode && this.getPinCode(index)) {
            this.setState({ dialogPin: index });
            return;
        }

        const link = this.state.rxData[`link${index}`];
        const linkSelf =
            this.state.rxData[`linkSelf${index}`] === true || this.state.rxData[`linkSelf${index}`] === 'true';
        const linkHidden =
            this.state.rxData[`linkHidden${index}`] === true || this.state.rxData[`linkHidden${index}`] === 'true';
        const view = this.state.rxData[`view${index}`];

        if (link) {
            if (linkSelf) {
                window.location.href = link;
            } else if (linkHidden) {
                try {
                    fetch(link).catch(e => console.warn(`Cannot call "${link}": ${e}`));
                } catch (e) {
                    console.warn(`Cannot call "${link}": ${(e as Error).toString()}`);
                }
            } else {
                window.open(link, '_blank');
            }
        } else if (view) {
            this.props.context.changeView(view, view);
        }
    }

    onClick(e: React.MouseEvent<HTMLButtonElement>): void {
        e.stopPropagation();
        let count = 0;
        let index: number | null = null;
        for (let i = 1; i <= this.state.rxData.count; i++) {
            if (
                (this.state.rxData[`link${i}`] || this.state.rxData[`view${i}`]) &&
                this.state.rxData[`hide${i}`] !== true &&
                this.state.rxData[`hide${i}`] !== 'true'
            ) {
                count++;
                index = i;
            }
        }
        if (count > 1) {
            this.setState({ menuTarget: e.target as HTMLButtonElement });
        } else if (index !== null) {
            this.onItemClick(index);
        }
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element[] | React.JSX.Element | null {
        super.renderWidgetBody(props);

        let title = '';
        let icon: React.JSX.Element | null = null;
        let color: string | undefined = '';
        if (this.state.rxData.showCurrentView) {
            // find button for current view
            for (let i = 1; i <= this.state.rxData.count; i++) {
                if (this.props.view === this.state.rxData[`view${i}`]) {
                    title = this.getTitle(i) || '';
                    color = this.getColor(i) || '';
                    icon = this.getStateIcon(i);
                    break;
                }
            }
        }

        title ||= this.state.rxData.title || this.state.rxData.widgetTitle || '';
        color ||= this.state.rxStyle?.color || undefined;
        icon ||=
            this.state.rxData.icon || this.state.rxData.iconSmall ? (
                <Icon
                    src={this.state.rxData.icon || this.state.rxData.iconSmall}
                    style={{ height: 24, width: 'auto' }}
                />
            ) : null;

        const content = (
            <>
                {this.renderUnlockDialog()}
                {this.renderMenu()}
                <Button
                    variant={this.state.rxData.variant}
                    onClick={e => this.onClick(e)}
                    startIcon={icon}
                    style={{
                        color,
                    }}
                >
                    {title}
                </Button>
            </>
        );

        return this.wrapContent(content);
    }
}
