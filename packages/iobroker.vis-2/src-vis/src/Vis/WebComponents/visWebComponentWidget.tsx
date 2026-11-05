/**
 * A web component as a vis-2 widget: one widget type per component, built from its manifest at runtime.
 *
 * The palette and the attributes come from the manifest alone; the module of a component is imported when a
 * widget of it is shown for the first time.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { I18n, type IobTheme } from '@iobroker/gui-components';
import type { RxRenderWidgetProps, RxWidgetInfo, VisRxWidgetState } from '@iobroker/types-vis-2';
import {
    getWebComponentTheme,
    importWebComponent,
    NAVIGATE_EVENT,
    type LoadedWebComponent,
    type WebComponentDialogRequest,
    type WebComponentDialogs,
    type WebComponentElement,
    type WebComponentNavigateDetail,
    type WebComponentSettings,
    type WebComponentSocket,
    type WebComponentTheme,
} from '@iobroker/web-components';
import VisRxWidget from '@/Vis/visRxWidget';
import type { VisRxWidgetWithInfo } from '@/Vis/visLoadWidgets';

import {
    getWebComponentSettingTypes,
    manifestToWidgetInfo,
    toSettingValue,
    type WebComponentAdapterInfo,
} from './webComponentSettings';
import type { OpenWebComponentDialog } from './WebComponentDialogs';

/** The dialogs come with MUI and a form renderer: only fetched when a component asks for one */
const WebComponentDialogs = React.lazy(() => import('./WebComponentDialogs'));

interface WebComponentHostProps {
    component: LoadedWebComponent;
    socket: WebComponentSocket;
    settings: WebComponentSettings;
    theme: WebComponentTheme;
    editMode: boolean;
    dialogs: WebComponentDialogs;
    onNavigate: (view: string) => void;
}

const FILL: React.CSSProperties = { display: 'block', width: '100%', height: '100%' };

/** The theme of vis-2 as the components get it, made once per MUI theme */
const componentThemes = new WeakMap<IobTheme, WebComponentTheme>();

/**
 * The colors, the font and the corners of vis-2 for the components
 *
 * @param theme the MUI theme of vis-2
 */
function toComponentTheme(theme: IobTheme): WebComponentTheme {
    let result = componentThemes.get(theme);
    if (!result) {
        result = getWebComponentTheme(theme);
        componentThemes.set(theme, result);
    }
    return result;
}

/**
 * Imports the module of the component, then renders the custom element and hands it its properties
 *
 * The element is created only when its class is defined, so it gets its properties through the setters of the
 * class. Properties, not attributes: the socket is an object, and a setting keeps its type. The socket comes
 * first, so that the element can subscribe as soon as it has its settings.
 */
function WebComponentHost(props: WebComponentHostProps): React.JSX.Element {
    const ref = useRef<WebComponentElement | null>(null);
    const { component, onNavigate, editMode } = props;
    const tag = component.manifest.tag;
    // a widget of a component already shown needs no wait
    const [ready, setReady] = useState(() => !!window.customElements.get(tag));
    const [error, setError] = useState('');

    useEffect(() => {
        if (ready) {
            return undefined;
        }
        let active = true;
        importWebComponent(component).then(
            () => active && setReady(true),
            (e: unknown) => {
                const message = (e as Error)?.message || String(e);
                console.error(`Cannot load web component <${tag}>: ${message}`);
                if (active) {
                    setError(message);
                }
            },
        );
        return () => {
            active = false;
        };
    }, [component, tag, ready]);

    useLayoutEffect(() => {
        if (ref.current) {
            ref.current.socket = props.socket;
            ref.current.dialogs = props.dialogs;
        }
    }, [ready, props.socket, props.dialogs]);

    useLayoutEffect(() => {
        if (ref.current) {
            ref.current.theme = props.theme;
            ref.current.editMode = props.editMode;
        }
    }, [ready, props.theme, props.editMode]);

    useLayoutEffect(() => {
        if (ref.current) {
            ref.current.settings = props.settings;
        }
    }, [ready, props.settings]);

    // a view the component asks for: vis-2 has views, so it shows it - not while the page is edited
    useEffect(() => {
        const el = ref.current;
        if (!el || editMode) {
            return undefined;
        }
        const listener = (event: Event): void => {
            const view = (event as CustomEvent<WebComponentNavigateDetail>).detail?.view;
            if (view) {
                event.preventDefault();
                onNavigate(view);
            }
        };
        el.addEventListener(NAVIGATE_EVENT, listener);
        return () => el.removeEventListener(NAVIGATE_EVENT, listener);
    }, [ready, onNavigate, editMode]);

    if (!ready) {
        // the reason only for the one who edits the page; the runtime shows an empty widget
        return (
            <div
                style={{ ...FILL, overflow: 'hidden', fontSize: 12, opacity: 0.7 }}
                title={error || undefined}
            >
                {error && editMode ? `<${tag}>: ${error}` : null}
            </div>
        );
    }

    return React.createElement(tag, { ref, style: FILL });
}

interface WebComponentWidgetState extends VisRxWidgetState {
    wcDialogs: OpenWebComponentDialog[];
}

/**
 * The widget class of one web component
 *
 * @param component the loaded component
 * @param adapter title and icon of the adapter that brings the component, for its set in the palette
 */
export function createWebComponentWidget(
    component: LoadedWebComponent,
    adapter?: WebComponentAdapterInfo,
): VisRxWidgetWithInfo<any> {
    const { info, translations } = manifestToWidgetInfo(component, adapter);
    I18n.extendTranslations(translations);

    const settingTypes = getWebComponentSettingTypes(component.manifest);
    let nextDialogId = 1;

    class VisWebComponentWidget extends VisRxWidget<Record<string, any>, WebComponentWidgetState> {
        /** The last settings handed to the element - kept, so that an unchanged value is no new object */
        private settings: WebComponentSettings = {};

        private settingsJson = '';

        private wcUnmounted = false;

        /** The dialogs of vis-2 for the element; one object, so the element gets it once */
        private readonly wcDialogs: WebComponentDialogs = {
            open: (request: WebComponentDialogRequest): Promise<unknown> =>
                new Promise(resolve => {
                    const id = nextDialogId++;
                    const dialog: OpenWebComponentDialog = {
                        id,
                        request,
                        resolve: (result: unknown): void => {
                            if (!this.wcUnmounted) {
                                this.setState(state => ({
                                    wcDialogs: (state.wcDialogs || []).filter(d => d.id !== id),
                                }));
                            }
                            resolve(result ?? null);
                        },
                    };
                    this.setState(state => ({ wcDialogs: [...(state.wcDialogs || []), dialog] }));
                }),
        };

        static getWidgetInfo(): RxWidgetInfo {
            return info;
        }

        // eslint-disable-next-line class-methods-use-this
        getWidgetInfo(): RxWidgetInfo {
            return info;
        }

        componentWillUnmount(): void {
            // a dialog still open answers "cancelled", so the component does not wait forever
            this.wcUnmounted = true;
            for (const dialog of this.state.wcDialogs || []) {
                dialog.resolve(null);
            }
            super.componentWillUnmount();
        }

        private onNavigate = (view: string): void => this.props.context.changeView(view);

        /** The settings of the element out of the widget data, in which the bindings are already resolved */
        private getSettings(): WebComponentSettings {
            const settings: WebComponentSettings = {};
            for (const [name, type] of Object.entries(settingTypes)) {
                const value = toSettingValue(type, this.state.rxData[name]);
                if (value !== undefined) {
                    settings[name] = value;
                }
            }
            const json = JSON.stringify(settings);
            if (json !== this.settingsJson) {
                this.settingsJson = json;
                this.settings = settings;
            }
            return this.settings;
        }

        renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
            super.renderWidgetBody(props);
            const dialogs = this.state.wcDialogs || [];

            return (
                <div className="vis-widget-body">
                    <WebComponentHost
                        component={component}
                        socket={this.props.context.socket}
                        settings={this.getSettings()}
                        theme={toComponentTheme(this.props.context.theme)}
                        editMode={!!this.props.editMode}
                        dialogs={this.wcDialogs}
                        onNavigate={this.onNavigate}
                    />
                    {dialogs.length ? (
                        <React.Suspense fallback={null}>
                            <WebComponentDialogs
                                dialogs={dialogs}
                                socket={this.props.context.socket}
                                theme={this.props.context.theme}
                            />
                        </React.Suspense>
                    ) : null}
                </div>
            );
        }
    }

    const Widget = VisWebComponentWidget as unknown as VisRxWidgetWithInfo<any>;
    if (component.adapter) {
        Widget.adapter = component.adapter;
        Widget.version = component.version;
    }
    // no `url`: the palette takes an `http://` url for a widget set in developer mode
    return Widget;
}
