/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2022-2026 Denis Haev https://github.com/GermanBluefox,
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 *
 * Short content:
 * Licensees may copy, distribute, display and perform the work and make derivative works based on it only if they give the author or licensor the credits in the manner specified by these.
 * Licensees may copy, distribute, display, and perform the work and make derivative works based on it only for noncommercial purposes.
 * (Free for non-commercial use).
 */

import React, { Component } from 'react';
import { Button } from '@mui/material';

import { I18n } from '@iobroker/adapter-react-v5';

import type { AnyWidgetId, WidgetStyle } from '@iobroker/types-vis-2';

interface VisWidgetErrorBoundaryProps {
    /** ID of the widget rendered inside the boundary */
    id: AnyWidgetId;
    /** Template of the widget, e.g. `tplVis2WidgetsBasicBulb`. The only hint at which widget set is broken */
    tpl: string;
    /** View the widget belongs to. Used for the console output only */
    view: string;
    /** Relative widgets are placed by the flow, absolute ones must keep their place in the view */
    isRelative: boolean;
    /** Style of the crashed widget. The placeholder takes over its position, so the rest of the view stays intact */
    style?: WidgetStyle;
    editMode: boolean;
    /** Projects with `___settings.ignoreNotLoaded` show nothing instead of a placeholder in the runtime */
    ignoreNotLoaded?: boolean;
    /**
     * Selects the widget in the editor. The crashed widget renders no `VisBaseWidget` around itself anymore, so
     * without this the placeholder could not be selected and the broken widget not be deleted from the view.
     */
    onSelect?: () => void;
    children: React.ReactNode;
}

interface VisWidgetErrorBoundaryState {
    error: string | null;
}

/**
 * Keeps a crashing widget from taking the whole view - and in the editor the whole application - down with it.
 *
 * Widget sets are loaded from other adapters via module federation and are built against the React and MUI
 * versions that were current when that adapter was released. A widget can therefore throw for reasons that have
 * nothing to do with the project it is used in. Without a boundary React unmounts the tree up to the root, and
 * instead of a dashboard the user gets a white page.
 *
 * Caveat of every React error boundary: only errors thrown while rendering, in the lifecycle methods and in the
 * constructors of the children are caught. Errors in event handlers, timers or promises are not - those still
 * end up in the console only.
 */
class VisWidgetErrorBoundary extends Component<VisWidgetErrorBoundaryProps, VisWidgetErrorBoundaryState> {
    constructor(props: VisWidgetErrorBoundaryProps) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error: Error): VisWidgetErrorBoundaryState {
        return { error: error?.toString() || 'Unknown error' };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error(
            `Widget ${this.props.id} (${this.props.tpl}) in view "${this.props.view}" crashed: ${error?.stack || error}${errorInfo.componentStack || ''}`,
        );
    }

    componentDidUpdate(prevProps: VisWidgetErrorBoundaryProps): void {
        // Changing the template in the editor means a different widget: give it a chance instead of showing
        // the error of the previous one forever
        if (this.state.error !== null && prevProps.tpl !== this.props.tpl) {
            this.setState({ error: null });
        }
    }

    render(): React.ReactNode {
        if (this.state.error === null) {
            return this.props.children;
        }

        // The project asked not to be bothered with widgets that cannot be shown
        if (!this.props.editMode && this.props.ignoreNotLoaded) {
            return null;
        }

        const widgetStyle = this.props.style || {};

        // Use the same striped "broken widget" look as the placeholder for an unknown widget type
        const style: React.CSSProperties = {
            overflow: 'hidden',
            boxSizing: 'border-box',
            minWidth: 100,
            minHeight: 40,
            width: widgetStyle.width || undefined,
            height: widgetStyle.height || undefined,
            background: 'repeating-linear-gradient(45deg, #333, #333 10px, #666 10px, #666 20px)',
            color: '#FFF',
            fontFamily: 'Arial, sans-serif',
            fontSize: 12,
        };

        if (this.props.isRelative) {
            style.position = 'relative';
            style.display = 'inline-block';
        } else {
            style.position = 'absolute';
            style.left = widgetStyle.left || 0;
            style.top = widgetStyle.top || 0;
            // without the original z-index the placeholder could end up behind the widgets that still work
            style.zIndex = widgetStyle['z-index'] || undefined;
        }

        const onSelect = this.props.editMode ? this.props.onSelect : undefined;
        if (onSelect) {
            style.cursor = 'pointer';
        }

        return (
            <div
                style={style}
                title={this.state.error}
                onClick={onSelect}
            >
                <div style={{ color: '#FF0000', fontWeight: 'bold', padding: '2px 6px' }}>
                    {I18n.t('Cannot render widget %s', this.props.id)}
                </div>
                <div style={{ padding: '0 6px', wordBreak: 'break-word' }}>{this.props.tpl}</div>
                {this.props.editMode ? (
                    <>
                        <div style={{ padding: '0 6px', opacity: 0.8, wordBreak: 'break-word' }}>
                            {this.state.error}
                        </div>
                        <Button
                            style={{ margin: '4px 6px' }}
                            variant="contained"
                            size="small"
                            onClick={e => {
                                e.stopPropagation();
                                this.setState({ error: null });
                            }}
                        >
                            {I18n.t('Retry')}
                        </Button>
                    </>
                ) : null}
            </div>
        );
    }
}

export default VisWidgetErrorBoundary;
