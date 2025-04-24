import React from 'react';

import type {
    AnyWidgetId,
    AskViewCommand,
    GroupWidgetId,
    VisContext,
    Widget,
    WidgetReference,
} from '@iobroker/types-vis-2';

import VisCanWidget from './visCanWidget';
import VisBaseWidget from './visBaseWidget';

export interface CreateWidgetOptions {
    context: VisContext;
    editMode: boolean;
    id: AnyWidgetId;
    isRelative: boolean;
    mouseDownOnView:
        | null
        | ((
              e: React.MouseEvent,
              wid: AnyWidgetId,
              isRelative: boolean,
              isResize?: boolean,
              isDoubleClick?: boolean,
          ) => void);
    moveAllowed: boolean;
    ignoreMouseEvents?: boolean | undefined;
    onIgnoreMouseEvents?: (ignore: boolean) => void;
    refParent: React.RefObject<HTMLElement>;
    askView: (command: AskViewCommand, props?: WidgetReference) => any;
    relativeWidgetOrder: AnyWidgetId[];
    selectedGroup: GroupWidgetId;
    selectedWidgets: AnyWidgetId[];
    view: string;
    viewsActiveFilter: Record<string, string[]>;
    customSettings: Record<string, any> | undefined;
    index?: number;
}

export function getOneWidget(index: number, widget: Widget, options: CreateWidgetOptions): React.JSX.Element | null {
    if (!window.VisWidgetsCatalog.rxWidgets) {
        return null;
    }
    // context, id, isRelative, refParent, askView, mouseDownOnView, view,
    // relativeWidgetOrder, moveAllowed, editMode, multiView, ignoreMouseEvents, selectedGroup
    // viewsActiveFilter, customSettings, onIgnoreMouseEvents
    const WidgetEl =
        window.VisWidgetsCatalog.rxWidgets[widget.tpl] ||
        (window.VisWidgetsCatalog.allWidgetsList?.includes(widget.tpl) ? VisCanWidget : VisBaseWidget);

    return (
        // @ts-expect-error fix later
        <WidgetEl
            key={`${index}_${options.id}`}
            tpl={widget.tpl}
            {...options}
        />
    );
}
