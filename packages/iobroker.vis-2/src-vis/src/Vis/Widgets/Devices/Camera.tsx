import React, { type CSSProperties } from 'react';
import moment from 'moment';

import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

import type {
    RxRenderWidgetProps,
    RxWidgetInfo,
    WidgetData,
    VisRxWidgetState,
    VisRxWidgetProps,
} from '@iobroker/types-vis-2';

import Generic from './Generic';

const styles: Record<string, CSSProperties> = {
    dialogTitle: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    fullCamera: { width: '100%', height: '100%', objectFit: 'contain' },
    dialogTime: {
        position: 'absolute',
        bottom: 3,
        right: 3,
        opacity: 0.8,
        fontStyle: 'italic',
        fontSize: 14,
    },
    camera: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        cursor: 'pointer',
    },
    time: {
        textAlign: 'right',
        width: '100%',
        paddingTop: 20,
        fontSize: 12,
        opacity: 0.8,
        fontStyle: 'italic',
        position: 'absolute',
        bottom: 3,
        right: 3,
    },
    dialogContent: { display: 'flex', flexDirection: 'column' },
    dialogImageContainer: {
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        position: 'relative',
    },
    imageContainer: {
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
        height: '100%',
    },
};

const noImageSvg =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIuMDAxIDUxMi4wMDEiPg0KCTxwYXRoIGZpbGw9ImN1cnJlbnRDb2xvciIgZD0iTTQzNy4wMTksNzQuOTgyQzM4OC42NjcsMjYuNjMsMzI0LjM3OSwwLjAwMSwyNTUuOTk5LDAuMDAxUzEyMy4zMzIsMjYuNjMsNzQuOTgxLDc0Ljk4Mg0KCQlDMjYuNjI4LDEyMy4zMzMsMCwxODcuNjIxLDAsMjU2LjAwMXMyNi42MjgsMTMyLjY2Nyw3NC45ODEsMTgxLjAxOEMxMjMuMzMyLDQ4NS4zNzIsMTg3LjYxOSw1MTIsMjU2LjAwMSw1MTINCgkJYzY4LjM3OSwwLDEzMi42NjYtMjYuNjI4LDE4MS4wMi03NC45ODFjNDguMzUxLTQ4LjM1MSw3NC45ODEtMTEyLjYzOSw3NC45ODEtMTgxLjAxOFM0ODUuMzcsMTIzLjMzMyw0MzcuMDE5LDc0Ljk4MnoNCgkJIE0yNTYuMDAxLDQ5My42OTFjLTYzLjQ5LDAuMDAxLTEyMy4xODEtMjQuNzI0LTE2OC4wNzMtNjkuNjE4QzQzLjAzMywzNzkuMTgsMTguMzA5LDMxOS40OTEsMTguMzA5LDI1Ni4wMDENCgkJYzAtNjAuNDI4LDIyLjQxMS0xMTcuNDAzLDYzLjI3OS0xNjEuNDY1bDU3LjcxOSw1Ny43MTloLTI1LjE2MWMtMTguNjkzLDAtMzMuOTAyLDE1LjIwOS0zMy45MDIsMzMuOTAydjE2NC43MDgNCgkJYzAsMTguNjkzLDE1LjIwOSwzMy45MDIsMzMuOTAyLDMzLjkwMkgzNzEuODJsNDUuNjQ1LDQ1LjY0NUMzNzMuNDAyLDQ3MS4yNzksMzE2LjQyNyw0OTMuNjkxLDI1Ni4wMDEsNDkzLjY5MXogTTI5Mi42MTMsMTcwLjU2NA0KCQloMzEuMTI0djMyLjk1M2MwLDUuMDU2LDQuMDk4LDkuMTU0LDkuMTU0LDkuMTU0aDgwLjU1NHYxMzguMTkzYzAsOC41OTgtNi45OTUsMTUuNTkzLTE1LjU5MywxNS41OTNoLTE4LjQ1bC01NS4wMjgtNTUuMDI4DQoJCWM3LjgzOS0xMi40NDQsMTIuMzk1LTI3LjE1NiwxMi4zOTUtNDIuOTE4YzAtNDQuNTM3LTM2LjIzMy04MC43Ny04MC43Ny04MC43N2MtMTUuNzYzLDAtMzAuNDczLDQuNTU1LTQyLjkxOCwxMi4zOTUNCgkJbC0yOS41NzItMjkuNTcyaDM1Ljg3M0gyOTIuNjEzeiBNMjI4LjUzNywxNTIuMjU1di0yMC4xMzdoNTQuOTIzdjIwLjEzN0gyMjguNTM3eiBNMzQyLjA0OSwxOTQuMzYzdi0yMy43OTloNTUuODA3DQoJCWM4LjU5OCwwLDE1LjU5Myw2Ljk5NSwxNS41OTMsMTUuNTkzdjguMjA2SDM0Mi4wNDl6IE0yNTUuOTk5LDMxMi4yMzljMTEuOTQ1LDAsMjIuNzgyLTQuODE5LDMwLjY4Mi0xMi42MWwxMy4yNDEsMTMuMjQxDQoJCWMtMTEuMjkzLDExLjE4Mi0yNi44MTMsMTguMTAzLTQzLjkyMywxOC4xMDNjLTM0LjQ0MSwwLTYyLjQ2MS0yOC4wMi02Mi40NjEtNjIuNDYxYzAtMTcuMTEsNi45Mi0zMi42MywxOC4xMDMtNDMuOTIzDQoJCWwxMy4yNCwxMy4yNGMtNy43OTEsNy45LTEyLjYxLDE4LjczNy0xMi42MSwzMC42ODNDMjEyLjI3MSwyOTIuNjIzLDIzMS44ODcsMzEyLjIzOSwyNTUuOTk5LDMxMi4yMzl6IE0yNzMuNzM3LDI4Ni42ODUNCgkJYy00LjU4NSw0LjQ3NS0xMC44NCw3LjI0NS0xNy43MzYsNy4yNDVjLTE0LjAxNiwwLTI1LjQyLTExLjQwMy0yNS40Mi0yNS40MTljLTAuMDAxLTYuODk4LDIuNzctMTMuMTUzLDcuMjQ1LTE3LjczOA0KCQlMMjczLjczNywyODYuNjg1eiBNMjU2LjA0LDI0My4wOTRjMTMuOTg0LDAuMDIyLDI1LjM1NSwxMS4zOTMsMjUuMzc3LDI1LjM3N0wyNTYuMDQsMjQzLjA5NHogTTI5Ni45MDEsMjgzLjk1Nw0KCQljMS44MjEtNC44MDUsMi44MjYtMTAuMDA5LDIuODI2LTE1LjQ0NWMwLTI0LjExMi0xOS42MTYtNDMuNzI5LTQzLjcyOC00My43MjljLTUuNDM3LDAtMTAuNjQsMS4wMDUtMTUuNDQ1LDIuODI2bC0xNC4xMDgtMTQuMTA4DQoJCWM4LjgwNC00Ljc0OSwxOC44NjgtNy40NTEsMjkuNTU0LTcuNDUxYzM0LjQ0MSwwLDYyLjQ2MSwyOC4wMiw2Mi40NjEsNjIuNDYxYy0wLjAwMSwxMC42ODUtMi43MDIsMjAuNzUtNy40NTIsMjkuNTU0DQoJCUwyOTYuOTAxLDI4My45NTd6IE0xOTguNzAxLDIxMS42NDhjLTE0LjQ5OCwxNC42MDgtMjMuNDcxLDM0LjcwNi0yMy40NzEsNTYuODY0YzAsNDQuNTM3LDM2LjIzMyw4MC43Nyw4MC43Nyw4MC43Nw0KCQljMjIuMTU3LDAsNDIuMjU2LTguOTc0LDU2Ljg2Mi0yMy40NzFsNDAuNjQ4LDQwLjY0OEgxMTQuMTQ2Yy04LjU5OCwwLTE1LjU5My02Ljk5NS0xNS41OTMtMTUuNTkzVjE4Ni4xNTcNCgkJYzAtOC41OTgsNi45OTUtMTUuNTkzLDE1LjU5My0xNS41OTNoNDMuNDcxTDE5OC43MDEsMjExLjY0OHogTTQzMC40MTIsNDE3LjQ2NmwtMzIuNjk4LTMyLjY5OGgwLjE0Mg0KCQljMTguNjkzLDAsMzMuOTAyLTE1LjIwOSwzMy45MDItMzMuOTAyVjE4Ni4xNTdjMC0xOC42OTMtMTUuMjA5LTMzLjkwMi0zMy45MDItMzMuOTAySDMwMS43N3YtMjkuMjkyDQoJCWMwLTUuMDU2LTQuMDk4LTkuMTU0LTkuMTU0LTkuMTU0aC03My4yMzJjLTUuMDU3LDAtOS4xNTQsNC4wOTktOS4xNTQsOS4xNTR2MjkuMjkzaC00NS4wMjhMOTQuNTM1LDgxLjU4OQ0KCQlDMTM4LjU5Nyw0MC43MjMsMTk1LjU3MiwxOC4zMSwyNTUuOTk5LDE4LjMxYzYzLjQ4OSwwLDEyMy4xNzgsMjQuNzI0LDE2OC4wNzMsNjkuNjE5DQoJCWM0NC44OTUsNDQuODkzLDY5LjYxOSwxMDQuNTgzLDY5LjYxOSwxNjguMDczQzQ5My42OTEsMzE2LjQzLDQ3MS4yOCwzNzMuNDA0LDQzMC40MTIsNDE3LjQ2NnoiLz4NCgk8Y2lyY2xlIGZpbGw9ImN1cnJlbnRDb2xvciIgY3g9IjE2OC4xMjQiIGN5PSIzMjkuODQxIiByPSI5LjE1NCIvPg0KPC9zdmc+DQo=';

interface CameraRxData {
    noCard: boolean | 'true';
    widgetTitle: string;
    url: string;
    'url-oid': string;
    refreshInterval: number;
    rotateVideo: number;
    fullUrl: string;
    fullRefreshInterval: number;
    showRefreshTime: boolean | 'true';
    doNotAddTimestamp: boolean | 'true';
}

interface CameraState extends VisRxWidgetState {
    dialog: boolean;
    refreshTime: number;
    fullRefreshTime: number;
}

export default class Camera extends Generic<CameraRxData, CameraState> {
    private readonly imageRef: React.RefObject<HTMLImageElement | null> = React.createRef();
    private readonly fullImageRef: React.RefObject<HTMLImageElement | null> = React.createRef();
    private imageInterval: ReturnType<typeof setInterval> | null = null;
    private fullImageInterval: ReturnType<typeof setInterval> | null = null;

    constructor(props: VisRxWidgetProps) {
        super(props);
        this.state = {
            ...this.state,
            dialog: false,
            refreshTime: 0,
            fullRefreshTime: 0,
        };
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplMaterial2Camera',
            visSet: 'devices',
            visSetLabel: 'set_label',
            visSetColor: '#00897b',
            visName: 'Camera',
            visWidgetLabel: 'camera',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        {
                            name: 'noCard',
                            label: 'without_card',
                            type: 'checkbox',
                            noBinding: false,
                        },
                        {
                            name: 'widgetTitle',
                            label: 'name',
                            hidden: '!!data.noCard',
                        },
                        {
                            name: 'url',
                            label: 'url',
                            hidden: (data: WidgetData) => !!data['url-oid'],
                            default: 'https://loremflickr.com/320/240/germany',
                            tooltip: 'delete_to_use_oid',
                        },
                        {
                            name: 'url-oid',
                            label: 'url_oid',
                            hidden: (data: WidgetData) => !!data.url,
                            default: '',
                            noInit: true,
                            tooltip: 'delete_to_use_constant_url',
                        },
                        {
                            name: 'refreshInterval',
                            type: 'number',
                            default: 2000,
                            label: 'refresh_interval',
                            tooltip: 'refresh_interval_tooltip',
                        },
                        {
                            name: 'fullUrl',
                            label: 'full_url',
                            hidden: (data: WidgetData) => !!data['url-oid'],
                        },
                        {
                            name: 'fullRefreshInterval',
                            type: 'number',
                            label: 'full_refresh',
                            tooltip: 'full_refresh_interval_tooltip',
                        },
                        {
                            name: 'showRefreshTime',
                            type: 'checkbox',
                            label: 'show_refresh_time',
                            default: true,
                            noBinding: false,
                        },
                        {
                            name: 'rotateVideo',
                            type: 'slider',
                            label: 'rotate_video',
                            min: 0,
                            max: 359,
                            default: 0,
                        },
                        {
                            name: 'doNotAddTimestamp',
                            type: 'checkbox',
                            label: 'do_not_add_timestamp',
                            default: true,
                            noBinding: false,
                            tooltip: 'do_not_add_timestamp_tooltip',
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: '100%',
                height: 240,
                position: 'relative',
            },
            visPrev: 'widgets/devices/img/prev_camera.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return Camera.getWidgetInfo();
    }

    takeUrl(isFull: boolean = false): string {
        let url = isFull ? this.state.rxData.fullUrl || this.state.rxData.url : this.state.rxData.url;

        if (this.state.rxData['url-oid']) {
            url = this.getPropertyValue('url-oid');
            // state could be string => URL in state
            // or binary state => take binary state
        }
        if (url) {
            if (this.state.rxData.doNotAddTimestamp === true || this.state.rxData.doNotAddTimestamp === 'true') {
                return url;
            }
            return url + (url.includes('?') ? '&_ts=' : '?_ts=') + Date.now();
        }
        return noImageSvg;
    }

    propertiesUpdate(): void {
        if (this.imageInterval) {
            clearInterval(this.imageInterval);
            this.imageInterval = null;
        }
        this.imageInterval = setInterval(
            async () => {
                const url = this.takeUrl();
                await fetch(url, { cache: 'reload', mode: 'no-cors' });
                if (this.imageRef.current) {
                    this.imageRef.current.src = url;
                }
                this.setState({ refreshTime: Date.now() });
            },
            this.state.rxData.refreshInterval >= 1000 ? this.state.rxData.refreshInterval : 1000,
        );

        if (this.fullImageInterval) {
            clearInterval(this.fullImageInterval);
            this.fullImageInterval = null;
        }

        if (this.state.dialog) {
            this.fullImageInterval = setInterval(
                async () => {
                    const url = this.takeUrl(true);
                    await fetch(url, { cache: 'reload', mode: 'no-cors' });
                    if (this.fullImageRef.current) {
                        this.fullImageRef.current.src = url;
                    }
                    this.setState({ fullRefreshTime: Date.now() });
                },
                (this.state.rxData.fullRefreshInterval || this.state.rxData.refreshInterval) >= 500
                    ? this.state.rxData.fullRefreshInterval || this.state.rxData.refreshInterval
                    : 500,
            );
        }
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.propertiesUpdate();
    }

    onRxDataChanged(/* prevRxData */): void {
        this.propertiesUpdate();
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.imageInterval) {
            clearInterval(this.imageInterval);
        }
        if (this.fullImageInterval) {
            clearInterval(this.fullImageInterval);
        }
    }

    closeDialog = (): void => {
        this.setState({ dialog: false });
        if (this.fullImageInterval) {
            clearInterval(this.fullImageInterval);
            this.fullImageInterval = null;
        }
    };

    renderDialog(): React.JSX.Element | null {
        return this.state.dialog ? (
            <Dialog
                open={!0}
                onClose={this.closeDialog}
            >
                <DialogTitle style={styles.dialogTitle}>
                    {this.state.rxData.widgetTitle}
                    <div style={{ flex: 1 }} />
                    <IconButton onClick={this.closeDialog}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <div style={styles.dialogContent}>
                        <div style={styles.dialogImageContainer}>
                            <img
                                ref={this.fullImageRef}
                                src={this.state.rxData.fullUrl || this.state.rxData.url || noImageSvg}
                                alt="Camera"
                                style={{
                                    ...styles.fullCamera,
                                    transform: `rotate(${this.state.rxData.rotateVideo}deg)`,
                                }}
                            />
                            {(this.state.rxData.showRefreshTime === true ||
                                this.state.rxData.showRefreshTime === 'true') &&
                            this.state.fullRefreshTime ? (
                                <div style={styles.dialogTime}>
                                    {moment(this.state.fullRefreshTime).format('HH:mm:ss')}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        ) : null;
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        const content = (
            <>
                <div
                    style={styles.imageContainer}
                    onClick={() => this.setState({ dialog: true }, () => this.propertiesUpdate())}
                >
                    <img
                        ref={this.imageRef}
                        src={this.takeUrl()}
                        alt="Camera"
                        style={{ ...styles.camera, transform: `rotate(${this.state.rxData.rotateVideo}deg)` }}
                    />
                    {this.state.rxData.showRefreshTime && this.state.refreshTime ? (
                        <div style={styles.time}>{moment(this.state.refreshTime).format('HH:mm:ss')}</div>
                    ) : null}
                </div>
                {this.renderDialog()}
            </>
        );

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
