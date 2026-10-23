/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 */

/**
 * The background services of the widget sets (`common.visWidgets.<set>.services`, see `VisServiceProps`).
 *
 * The runtime renders only the active view and the views with "Render always", so a widget lives only while its view is
 * shown. A service lives as long as the runtime: it is rendered once, next to the views, with the widgets of its set in
 * all views - e.g. to keep a phone registered and to show the dialog of a call over whichever view is open.
 */

import React, { Component } from 'react';

import type { Connection } from '@iobroker/gui-components';
import type { Project, VisServiceWidget } from '@iobroker/types-vis-2';

import type { VisServiceWithInfo } from './visLoadWidgets';
import { getServiceWidgets, type ServiceUser } from './visServiceWidgets';

interface ServiceBoundaryProps {
    /** `<set>/<service>`, for the console */
    name: string;
    children: React.ReactNode;
}

/**
 * A service comes from another adapter, built against the React of its time. A crash must take neither the views nor
 * the other services with it.
 */
class ServiceBoundary extends Component<ServiceBoundaryProps, { failed: boolean }> {
    constructor(props: ServiceBoundaryProps) {
        super(props);
        this.state = { failed: false };
    }

    static getDerivedStateFromError(): { failed: boolean } {
        return { failed: true };
    }

    componentDidCatch(error: Error): void {
        console.error(`Background service ${this.props.name} crashed: ${error.message}`);
    }

    render(): React.ReactNode {
        return this.state.failed ? null : this.props.children;
    }
}

interface VisServicesProps {
    services: VisServiceWithInfo[];
    project: Project;
    socket: Connection;
    /** The name the permissions are stored under (`activeUser` of the store) */
    permissionsName: string;
    /** The id of the user without `system.user.` */
    user: string;
    userGroups: ServiceUser['userGroups'];
    lang: ioBroker.Languages;
    changeView: (view: string) => void;
}

export default class VisServices extends Component<VisServicesProps> {
    /** The widgets of each set, so that a service gets the same array while the project and the user stay */
    private widgetsCache = new Map<string, { key: unknown[]; widgets: VisServiceWidget[] }>();

    /** The engine renders often; the services only care about these */
    shouldComponentUpdate(next: VisServicesProps): boolean {
        const props = this.props;
        return (
            next.services !== props.services ||
            next.project !== props.project ||
            next.socket !== props.socket ||
            next.permissionsName !== props.permissionsName ||
            next.user !== props.user ||
            next.userGroups !== props.userGroups ||
            next.lang !== props.lang ||
            next.changeView !== props.changeView
        );
    }

    private getWidgets(service: VisServiceWithInfo): VisServiceWidget[] {
        const { project, permissionsName, user, userGroups } = this.props;
        const key = [project, permissionsName, user, userGroups];
        const cacheKey = service.setNames.join('|');
        const cached = this.widgetsCache.get(cacheKey);
        if (cached?.key.every((value, i) => value === key[i])) {
            return cached.widgets;
        }
        const widgets = getServiceWidgets(project, service.setNames, { permissionsName, id: user, userGroups });
        this.widgetsCache.set(cacheKey, { key, widgets });
        return widgets;
    }

    render(): React.JSX.Element {
        return (
            <>
                {this.props.services.map(service => {
                    const Service = service.Component;
                    const name = `${service.set}/${service.name}`;
                    return (
                        <ServiceBoundary
                            key={name}
                            name={name}
                        >
                            <Service
                                widgets={this.getWidgets(service)}
                                adapter={service.adapter}
                                socket={this.props.socket}
                                user={this.props.user}
                                lang={this.props.lang}
                                changeView={this.props.changeView}
                            />
                        </ServiceBoundary>
                    );
                })}
            </>
        );
    }
}
