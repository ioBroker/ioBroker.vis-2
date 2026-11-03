/**
 * A web component as a vis-2 widget: one widget type per component, built from its manifest at runtime.
 */
import React, { useLayoutEffect, useRef } from 'react';

import { I18n } from '@iobroker/gui-components';
import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';
import VisRxWidget from '@/Vis/visRxWidget';
import type { VisRxWidgetWithInfo } from '@/Vis/visLoadWidgets';

import { getWebComponentSettingTypes, manifestToWidgetInfo, toSettingValue } from './webComponentSettings';
import type { LoadedWebComponent, WebComponentElement, WebComponentSocket } from './webComponentTypes';

interface WebComponentHostProps {
    tag: string;
    socket: WebComponentSocket;
    settings: Record<string, unknown>;
}

/**
 * Renders the custom element and hands it its two properties
 *
 * Properties, not attributes: the socket is an object, and a setting keeps its type. React 19 would set them
 * itself if the element has a property of that name, but whether it has one before `customElements.define` ran
 * is up to the component - assigning them by hand works in either case. The socket comes first, so that the
 * element can subscribe as soon as it has its settings.
 */
function WebComponentHost(props: WebComponentHostProps): React.JSX.Element {
    const ref = useRef<WebComponentElement | null>(null);

    useLayoutEffect(() => {
        if (ref.current) {
            ref.current.socket = props.socket;
        }
    }, [props.socket]);

    useLayoutEffect(() => {
        if (ref.current) {
            ref.current.settings = props.settings;
        }
    }, [props.settings]);

    return React.createElement(props.tag, {
        ref,
        style: { display: 'block', width: '100%', height: '100%' },
    });
}

/**
 * The widget class of one web component
 *
 * @param component the loaded component
 */
export function createWebComponentWidget(component: LoadedWebComponent): VisRxWidgetWithInfo<any> {
    const { info, translations } = manifestToWidgetInfo(component);
    I18n.extendTranslations(translations);

    const settingTypes = getWebComponentSettingTypes(component.manifest);
    const tag = component.manifest.tag;

    class VisWebComponentWidget extends VisRxWidget<Record<string, any>> {
        /** The last settings handed to the element - kept, so that an unchanged value is no new object */
        private settings: Record<string, unknown> = {};

        private settingsJson = '';

        static getWidgetInfo(): RxWidgetInfo {
            return info;
        }

        // eslint-disable-next-line class-methods-use-this
        getWidgetInfo(): RxWidgetInfo {
            return info;
        }

        /** The settings of the element out of the widget data, in which the bindings are already resolved */
        private getSettings(): Record<string, unknown> {
            const settings: Record<string, unknown> = {};
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

            return (
                <div className="vis-widget-body">
                    <WebComponentHost
                        tag={tag}
                        socket={this.props.context.socket}
                        settings={this.getSettings()}
                    />
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
