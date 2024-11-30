import { createReducer, configureStore, createAction, createSelector } from '@reduxjs/toolkit';
import type {
    View,
    Project,
    AnyWidgetId,
    SingleWidgetId,
    SingleWidget,
    GroupWidget,
    GroupWidgetId,
} from '@iobroker/types-vis-2';

/** This id is used by some special widgets to work with non-existing widgets */
const FAKE_ID = 'fakeId';

export const updateProject = createAction<Project>('project/update');
export const updateView = createAction<{ viewId: string; data: View }>('view/update');
export const updateWidget = createAction<{
    viewId: string;
    widgetId: GroupWidgetId | SingleWidgetId | typeof FAKE_ID;
    data: SingleWidget;
}>('widget/update');
export const updateGroupWidget = createAction<{
    viewId: string;
    widgetId: GroupWidgetId | typeof FAKE_ID;
    data: GroupWidget;
}>('group/update');
export const updateActiveUser = createAction<string>('activeUser/update');
export const recalculateFields = createAction<boolean>('attributes/recalculate');

const initialState = {
    visProject: {} as Project,
    /** If fields need to be recalculated on next render */
    recalculateFields: false,
    /** Logged in user */
    activeUser: '',
};

const reducer = createReducer(initialState, builder => {
    builder
        .addCase(updateProject, (state, action) => {
            state.visProject = action.payload;
        })
        .addCase(updateView, (state, action) => {
            const { viewId, data } = action.payload;
            state.visProject[viewId] = data;
        })
        .addCase(updateWidget, (state, action) => {
            const { viewId, widgetId, data } = action.payload;
            if (widgetId === FAKE_ID) {
                // Ignore it
                return;
            }

            if (!(viewId in state.visProject)) {
                console.error(
                    `Cannot update widget "${widgetId}". The view "${viewId}" does not exist in the project.`,
                );
                return;
            }

            state.visProject[viewId].widgets[widgetId as SingleWidgetId] = data;
        })
        .addCase(updateGroupWidget, (state, action) => {
            const { viewId, widgetId, data } = action.payload;

            if (widgetId === FAKE_ID) {
                // Ignore it
                return;
            }

            if (!(viewId in state.visProject)) {
                console.error(
                    `Cannot update group widget "${widgetId}". The view "${viewId}" does not exist in the project.`,
                );
                return;
            }

            state.visProject[viewId].widgets[widgetId] = data;
        })
        .addCase(updateActiveUser, (state, action) => {
            state.activeUser = action.payload;
        })
        .addCase(recalculateFields, (state, action) => {
            state.recalculateFields = action.payload;
        });
});

type StoreState = typeof initialState;

export const selectProject = (state: StoreState): Project => state.visProject;

export const selectView = createSelector(
    [selectProject, (_state: StoreState, viewName: string) => viewName],
    (project, view) => project[view],
);

export const selectWidget = createSelector(
    [selectView, (_state: StoreState, _viewName: string, wid: AnyWidgetId) => wid],
    (view, wid) => view.widgets[wid],
);

export const store = configureStore({
    reducer,
});
