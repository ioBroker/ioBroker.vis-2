/**
 *  ioBroker.vis-2
 *  https://github.com/ioBroker/ioBroker.vis-2
 *
 *  Copyright (c) 2026 Denis Haev https://github.com/GermanBluefox,
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

import { Fullscreen as FullscreenIcon, FullscreenExit as FullscreenExitIcon } from '@mui/icons-material';

import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';
import VisRxWidget, { type VisRxWidgetState } from '../../visRxWidget';

type RxData = Record<string, never>;

interface BasicFullScreenState extends VisRxWidgetState {
    /** whether the page is showing full screen right now */
    isFullScreen: boolean;
}

/**
 * `Basic - Full Screen`: a button that puts the page into full screen and back.
 *
 * Replaces the can.js template `tplFullScreen` with `vis.binds.basic.toggleFullScreen`. Two things are done
 * differently, both because the old way could not tell the truth:
 *
 * - the icon follows `document.fullscreenElement` instead of a flag of its own, so it is still right after the
 *   viewer left full screen with Escape - which the flag never noticed;
 * - the element that goes full screen is `#root`, the container vis-2 renders into. The template asked for
 *   `#vis_container`, which was the container of vis-1 and does not exist here.
 */
class BasicFullScreen extends VisRxWidget<RxData, BasicFullScreenState> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplFullScreen',
            visSet: 'basic',
            visName: 'Full Screen',
            visPrev: 'widgets/basic/img/Prev_FullScreen.svg',
            visAttrs: [],
            visWidgetLabel: 'full_screen', // Label of widget
            visHelp: 'help_full_screen', // Description in the palette
            visDefaultStyle: {
                width: 43,
                height: 43,
            },
        } as const;
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return BasicFullScreen.getWidgetInfo();
    }

    componentDidMount(): void {
        super.componentDidMount();
        window.document.addEventListener('fullscreenchange', this.onFullScreenChange);
        this.onFullScreenChange();
    }

    componentWillUnmount(): void {
        window.document.removeEventListener('fullscreenchange', this.onFullScreenChange);
        super.componentWillUnmount();
    }

    /** The browser is the truth about full screen, not a flag of this widget */
    private onFullScreenChange = (): void => {
        const isFullScreen = !!window.document.fullscreenElement;
        if (isFullScreen !== this.state.isFullScreen) {
            this.setState({ isFullScreen });
        }
    };

    private onClick = (): void => {
        if (this.props.editMode) {
            return;
        }

        if (window.document.fullscreenElement) {
            void window.document.exitFullscreen();
            return;
        }

        const element = window.document.getElementById('root') || window.document.documentElement;
        void element.requestFullscreen();
    };

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        // set default width and height
        props.style.width ??= 43;
        props.style.height ??= 43;

        return (
            <div
                className="vis-widget-body"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: this.props.editMode ? undefined : 'pointer',
                }}
                onClick={this.onClick}
            >
                <div className="vis-fullscreen-icon">
                    {this.state.isFullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                </div>
            </div>
        );
    }
}

export default BasicFullScreen;
