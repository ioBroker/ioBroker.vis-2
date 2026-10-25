# Older changes

### 2.10.6 (2024-07-20)
* (bluefox) Improved the typing in typescript

### 2.10.4 (2024-07-16)
* (bluefox) Corrected the jumping by object selection
* (bluefox) Implemented swipe widget

### 2.10.3 (2024-07-11)
* (bluefox) Converted the CanJSWidget to typescript
* (bluefox) Added "clone" button to the attribute groups

### 2.10.2 (2024-07-10)
* (bluefox) Removed incompatible package for styles
* (bluefox) All widgets must be updated
* (bluefox) The basic input value widget was migrated to ReactJS

### 2.9.64 (2024-05-23)
* (bluefox) Added possibility to clear a text field by button

### 2.9.63 (2024-05-15)
* (bluefox) Migrated some files to typescript

### 2.9.60 (2024-05-07)
* (foxriver76) test automatic release

### 2.9.53 (2024-05-06)
* (bluefox) Allowed applying styles to jQui buttons

### 2.9.52 (2024-04-25)
* (bluefox) Navigation was improved: adjustable menu width and bulk edit were added

### 2.9.50 (2024-04-19)
* (bluefox) Corrected widget in widget behavior

### 2.9.49 (2024-04-11)
* (bluefox) Corrected the scroll buttons in Tabs widget
* (bluefox) Corrected resizers if the border width is set

### 2.9.48 (2024-03-30)
* (bluefox) Showed selected view in the view dialog
* (bluefox) Added customization of loading screen
* (bluefox) Respected the sentry disable flag in GUI

### 2.9.42 (2024-03-09)
* (bluefox) Allowed limiting the view size only on desktop
* (bluefox) Change word "Filter" to "Search"

### 2.9.40 (2024-03-05)
* (bluefox) Migrated the filter widget to react
* (bluefox) Migrated the basic link widget to react

### 2.9.39 (2024-03-01)
* (foxriver76) allow to use `widgetOid` in bindings
* (foxriver76) fixed various problems with Date Picker widget
* (foxriver76) made default option of Date Picker human readable and added option for full parseable date
* (bluefox) Added the possibility to add suffix by navigation widgets
* (bluefox) Improved the license manager

### 2.9.37 (2024-02-28)
* (foxriver76) TimePicker widget now saves the time instead of date by default, if you want old behavior use checkbox `asDate`

### 2.9.36 (2024-02-27)
* (foxriver76) fixed project-specific css not being applied

### 2.9.35 (2024-02-27)
* (foxriver76) user-specified css has now priority over widgets css
* (foxriver76) fixed crash case for broken grouped widgets

### 2.9.34 (2024-02-26)
* (foxriver76) detect admin user correctly in project permissions dialog

### 2.9.33 (2024-02-21)
* (foxriver76) fixed issue that last image is never shown in image8 widget
* (foxriver76) added possibility to define background and title color for jqui dialog
* (foxriver76) make it possible to click through signal image if in front of widget

### 2.9.32 (2024-02-16)
* (foxriver76) implemented buttons to show or hide all views in views manager
* (foxriver76) fixed issue with signals on RxWidgets
* (foxriver76) allow disabling Sentry only for this instance

### 2.9.31 (2024-02-06)
* (foxriver76) apply default overflow correctly
* (foxriver76) navigation style fixes (fix an icon background and allow to customize header text color)

### 2.9.30 (2024-02-06)
* (foxriver76) global css will no longer be deleted on adapter upload/update
* (foxriver76) allowed modifying style of navigation

### 2.9.29 (2024-02-05)
* (foxriver76) fixed multiple problems with nested groups
* (foxriver76) also made group/ungroup commands working in group view
* (foxriver76) allowed selecting widgets in a group via click (previously only dropdown worked)
* (foxriver76) fixed issue, that Basic Image 8 is not configurable for value 0

### 2.9.28 (2024-02-03)
* (foxriver76) correctly determine the vis instance in all cases

### 2.9.26 (2024-02-02)
* (foxriver76) do not show empty icon category if jquery style selected for jquery button widgets
* (foxriver76) added possibility to hide navigation after selection

### 2.9.25 (2024-01-29)
* (foxriver76) fixed resizing issue for relative widgets
* (foxriver76) do not crash when using visibility "only for groups"
* (foxriver76) do not crash if a widget tries to update widget on non-existent view

### 2.9.24 (2024-01-24)
* (foxriver76) Image 8 widget ported to react

### 2.9.23 (2024-01-24)
* (foxriver76) fixed another bug due to previous versions

### 2.9.22 (2024-01-22)
* (foxriver76) try to fix problems introduced with 2.9.21

### 2.9.21 (2024-01-19)
* (foxriver76) fixed crash case when fixing widgets
* (foxriver76) fixed bug, that opacity is applied twice on image edit mode overlay

### 2.9.20 (2024-01-18)
* (foxriver76) increased timeout for project import
* (foxriver76) added permissions on widget level

### 2.9.19 (2024-01-17)
* (foxriver76) fixed issue when resizing widget from the left side
* (foxriver76) added select box to dimension attributes if multiple widgets selected

### 2.9.18 (2024-01-15)
* (foxriver76) fixed issue that old attributes value is shown in some scenarios
* (foxriver76) dedicated permission system extended to view level

### 2.9.17 (2024-01-13)
* (foxriver76) dedicated permission system on project level introduced

### 2.9.16 (2024-01-11)
* (foxriver76) use the correct fallback values for widget signals determination

### 2.9.15 (2024-01-09)
* (foxriver76) fixed issue with BulkEditor

### 2.9.14 (2024-01-09)
* (foxriver76) fixed last change y-offset for some widgets
* (foxriver76) fixed issue where JquiState did not respect data type
* (foxriver76) fixed issues with BulkEdtior (dialog not closing and other dialog showing the wrong button)
* (foxriver76) implemented workaround resize bug for https://github.com/devbookhq/splitter/issues/15

### 2.9.13 (2024-01-08)
* (foxriver76) correctly detect IDs in bindings when they contain hash character
* (foxriver76) fix crash when multiple JquiState widgets selected
* (foxriver76) prevent showing widget in a group after it is already cut out
* (foxriver76) prevent usage of widgets which are not in a group for calculating rulers on group view

### 2.9.12 (2024-01-04)
* (foxriver76) optimized copy/paste/cut in groups

### 2.9.11 (2024-01-02)
* (foxriver76) fixed bug with visibility calculation

### 2.9.10 (2024-01-02)
* (foxriver76) remove accidentally added script file, which leads to crash

### 2.9.9 (2024-01-01)
* (foxriver76) allow importing views without attribute `activeWidgets`
* (foxriver76) make BasicBulb behave more like its old version
* (foxriver76) fixed issue that data of different widget is displayed in edit mode
* (foxriver76) fixed issue that every state update is used for visibility calculation
* (bluefox) migrated jQui select, jQui Radio steps widgets to react
* (bluefox) All jQui widgets were migrated to react

### 2.9.8 (2023-12-21)
* (foxriver76) fixed bug that no labels are shown for a background
* (foxriver76) prevent short flashing of widgets with visibility condition at a page load
* (foxriver76) fixed issue on theme switch

### 2.9.7 (2023-12-19)
* (bluefox) Allowed the read-only flag for Styled/Input

### 2.9.6 (2023-12-14)
* (foxriver76) fixed issues with the BulkEditor
* (foxriver76) scripts in HTML are now added to the DOM, instead of being executed in eval
* (foxriver76) fixed issues with Bulb widget if min/max was once filled
* (foxriver76) migrated "speech2text" widget to react

### 2.9.5 (2023-12-10)
* (foxriver76) open new views at the beginning
* (foxriver76) fixed crash case if signals are used
* (foxriver76) fixed material-design-widgets helper
* (foxriver76) update references to view in widget when view is renamed
* (bluefox) jQui Toggle icon widget was migrated to react
* (bluefox) jQui Radio widget was migrated to react
* (bluefox) jQui Radio List widget was migrated to react
* (bluefox) Corrected last-change by React widgets

### 2.9.4 (2023-12-04)
* (foxriver76) fixed issues with display width

### 2.9.3 (2023-12-03)
* (bluefox) Added the possibility to limit hard the view size
* (foxriver76) implemented simple sort mechanic for navigation
* (foxriver76) fixed import of views, which were inside a folder
* (foxriver76) fixed theme also applied in iframe
* (foxriver76) do not simply reuse widget ids when importing or copying views
* (foxriver76) implemented basic bulb widget as React widget
* (foxriver76) made script tags work in basic html widget

### 2.9.2 (2023-11-29)
* (foxriver76) fixed reactivity in custom components
* (foxriver76) fixed import for groups
* (foxriver76) after creating a group it is now pre-selected
* (foxriver76) fields are now updated when moved via keyboard

### 2.9.1 (2023-11-28)
* (foxriver76) recalculate fields after moving widgets
* (foxriver76) fixed a pasting group on other view
* (foxriver76) fixed theme also applied in iframe
* (bluefox) implemented Basic Image as React widget

### 2.9.0 (2023-11-27)
* (bluefox) implemented SVG shape and Screen Resolution widgets natively
* (bluefox) implemented Basic iFrame as React widget
* (foxriver76) only allow zip files at project import
* (foxriver76) fix overflow being overwritten
* (foxriver76) sort pages and projects alphabetically
* (foxriver76) fixed problem on saving
* (foxriver76) fixed problem with groups when `always render` is activated
* (foxriver76) allow changing color and write lowercase in a tabs component
* (foxriver76) fixed problem that navigation from a alwaysRender page is shown on different page

### 2.8.0 (2023-11-24)
* (foxriver76) sort folders alphabetically in pages view
* (foxriver76) fixed deselecting widgets with ctrl + click
* (foxriver76) fixed display issue with a switch component
* (bluefox) implemented Basic Red Number widget natively
* (foxriver76) fixed copy/clone of grouped widgets
* (foxriver76) fixed problem with open/close dialog via state

### 2.7.0 (2023-11-22)
* (foxriver76) implemented Basic Bar widget natively

### 2.6.4 (2023-11-21)
* (foxriver76) fixed typescript build

### 2.6.3 (2023-11-20)
* (foxriver76) fixed several crash cases

### 2.6.2 (2023-11-20)
* (foxriver76) fixed crash case when editing group
* (foxriver76) fixed pasting groups
* (foxriver76) fixed problem jumping cursor and removed characters while typing

### 2.6.1 (2023-11-17)
* (bluefox) Showed "file too large" message by icon upload
* (bluefox) Made navigation bar for view as an own group
* (foxriver76) sorted views alphabetically
* (foxriver76) respect uppercase/lowercase in projects toolbar
* (bluefox) Redirect `dialog` and `dialogClose` commands to widgets

### 2.6.0 (2023-11-13)
* (foxriver76) implemented select/unselect all buttons
* (foxriver76) fixed bindings not working

### 2.5.0 (2023-11-11)
* (foxriver76) allowed using real html in prepend-HTML and append-HTML (basic string widget)
* (foxriver76) fixed problem while editing groups
* (foxriver76) do not automatically format button text as uppercase
* (foxriver76) do not automatically show page names as uppercase
* (bluefox) Implemented the signal icons for React widgets
* (bluefox) Implemented the last change indication for React widgets
* (bluefox) Implemented SVG Bool widget as React Component

### 2.4.0 (2023-11-08)
* (foxriver76) fixed issues with icon selector filter when changing category
* (foxriver76) fixed problem, that only the first widget is pasted
* (bluefox) added JSON binding operator
* (bluefox) Allowed using function as filter for Object ID
* (bluefox) Implemented View bar (with no menu)

### 2.3.6 (2023-11-06)
* (foxriver76) fixed issues with binding editor on style attributes
* (foxriver76) improved performance due to optimizations on auto save

### 2.3.5 (2023-11-03)
* (foxriver76) update adapter-react to have enhanced image support in file selector
* (foxriver76) fixed color of file browser in light mode
* (foxriver76) fixed the color inputs jumping to the end of input on modifying

### 2.3.4 (2023-11-02)
* (foxriver76) fix crash when selecting multiple widgets
* (foxriver76) removed duplicate `none` entry in `border-style` dropdown
* (foxriver76) fix crash when reordering widgets

### 2.3.3 (2023-10-30)
* (foxriver76) fixed problem, that vis is not loading if a single widget has a script error
* (bluefox) added the editor for bindings
* (bluefox) background does not used if in iframe

### 2.3.2 (2023-10-14)
* (bluefox) Allowed showing only selected widgets in edit mode
* (bluefox) Corrected the visibility calculation for old (CanJS) widgets

### 2.3.1 (2023-10-13)
* (bluefox) Corrected vertical gap between relative widgets
* (bluefox) Better input of numbers with min/max in attribute dialog

### 2.3.0 (2023-09-28)
* (bluefox) jQui widgets (many of them) were improved

### 2.2.7 (2023-09-18)
* (bluefox) Improved icon selector: you can upload your own icon directly
* (bluefox) Optimized loading: do not load unused widget sets

### 2.2.6 (2023-09-17)
* (bluefox) Date binding corrected
* (bluefox) Optimized loading of widgeteria
* (bluefox) Horizontal navigation is fixed

### 2.2.5 (2023-09-12)
* (bluefox) Implemented horizontal navigation

### 2.2.4 (2023-09-04)
* (bluefox) Corrected license checking

### 2.2.2 (2023-08-16)
* (bluefox) Changed sentry settings

### 2.2.1 (2023-08-15)
* (bluefox) Added possibility to filter widgets in edit mode
* (bluefox) Added possibility to change the order of relative widgets with drag&drop

### 2.2.0 (2023-08-14)
* (bluefox) Release candidate 1

### 2.1.7 (2023-08-10)
* (bluefox) Optimized the rendering of the widgets

### 2.1.6 (2023-07-30)
* (bluefox) First beta release

### 2.1.4 (2023-07-19)
* (bluefox) Allowed to add widgets to widgets

### 2.0.36 (2023-06-21)
* (bluefox) Added widgeteria

### 2.0.29 (2023-05-17)
* (bluefox) Corrected errors

### 2.0.10 (2022-12-01)
* (bluefox) Added the file browser

### 2.0.8 (2022-11-26)
* (bluefox) Improved the error handling

### 2.0.0 (2022-10-21)
* (bluefox) Completely new visualization, but partly compatible with the previous version
## 2.15.0 (2026-08-16)
* (@GermanBluefox) Reworked the name plate of a widget in the editor: it is only as wide as its content, its buttons sit next to the name instead of on fixed positions that left a gap whenever a button was hidden, and the plate of a selected widget is drawn in the same blue as its frame
* (@GermanBluefox) The three buttons of the name plate have a tooltip now and no longer turn red and double their size when the cursor is over them
* (@GermanBluefox) The widget under the cursor is highlighted in blue instead of olive in the editor, in both themes
* (@GermanBluefox) Several selected widgets are marked with the same frame as a single one, only without the handles to resize them. They carried no mark at all before, as the frame is drawn by those handles
* (@GermanBluefox) Relative widgets can be reordered by dragging them again: a half transparent copy follows the cursor and a placeholder shows the slot the widget will land in. Dragging one never reordered anything before, because the gesture was not started for relative widgets at all
* (@GermanBluefox) Removed the arrow buttons and the re-order menu of the relative widgets, as dragging replaces them
* (@GermanBluefox) Moving and resizing a widget is rendered from the widget state now instead of being written into the DOM, which removes the duplicated geometry of the service and the can.js element
* (@GermanBluefox) Removed the dead `calculateRelativeWidgetPosition` callback from `onMove` and `WidgetReference`: it has been `null` since 2022 and was never called
* (@typhosj) The `view in widget 8` and `image 8` widgets show the view/image with the number of the value again
* (@typhosj) `vis.updateStates` does not write the states back to ioBroker anymore, like in vis-1
* (@typhosj) The `iFrame 8` widget shows the frame with the number of the value, also for a boolean object
* (@typhosj) Every copy of a group gets its own member widgets if several widgets are pasted at once
* (@typhosj) A binding can be used as the comparison value of the visibility condition
* (@typhosj) The application bar is not wider than the window anymore
* (@typhosj) Fixed the invisible content of the `tabs` widget if the tabs are placed vertically
* (@typhosj) The tabs of the `tabs` widget are as wide as their title now and can be scrolled on a touch device
* (@GermanBluefox) Shortened the values that a failing binding writes to the console: a widget with braces in its HTML produced hundreds of failing bindings, each printing the complete HTML, which buried every other error
* (@typhosj) Fixed the position of the vis-1 widgets in a view with a limited screen size
* (@typhosj) The `bulb on/off` widget writes numeric min/max values as a number and not as a string
* (@typhosj) Fixed `min`, `max` and `step` of the vis-1 widget attributes: they are optional and may be fractional
* (@typhosj) Fixed the doubled border of the jQui widgets: the border is drawn by the button only and not by the widget too
* (@typhosj) Fixed the missing attributes of a group: the sections could not be opened and the group attributes were not editable
* (@typhosj) Made the background color and the text color of the selected entry editable for the horizontal navigation menu. The new background color takes precedence over the color of the application bar, which the horizontal menu borrowed before, so a view that was switched from the vertical to the horizontal navigation can change its color once
* (@typhosj) Fixed the enumerable widget groups and fields that start at the index 0 and were not expanded
* (@typhosj) Added the MUI CSS variables (`--mui-palette-*`), so the theme colors can be adjusted with CSS
* (@typhosj) Fixed the overlapping entries of the horizontal navigation menu in a narrow window
* (@typhosj) Fixed the invalid HTML element IDs of the widgets shown in multiple views
* (@GermanBluefox) A widget that crashes while rendering does not take the whole view down anymore, but is replaced by a placeholder
* (@GermanBluefox) Added `react/jsx-runtime` and `react/jsx-dev-runtime` to the shared modules of the module federation, so a widget set uses the JSX runtime of vis-2 instead of bundling its own
* (@GermanBluefox) Fixed the shared modules `react-dom/client` and the i18n files of `adapter-react-v5` being dropped if a widget set passes its `package.json` to `moduleFederationShared()`
* (@GermanBluefox) `@mui/material`, `@mui/system`, `@mui/icons-material` and `@mui/styles` are shared per version now instead of as a singleton. A widget set that is rebuilt keeps its own MUI copy if it was built against another MUI major than vis-2, instead of being given the one of vis-2
* (@GermanBluefox) Added `@mui/private-theming` to the shared modules, so the theme of vis-2 also reaches a widget set that uses its own MUI major
* (@GermanBluefox) The widgeteria is not shown in the GUI anymore

## 2.14.4 (2026-08-10)
* (@typhosj) The entries of the horizontal navigation menu can be scrolled now instead of being cut off in a narrow window
* (@typhosj) Fixed the invalid HTML element IDs of the widgets shown in multiple views. Their IDs changed from `<view>_<widget>` to `v<view>_<widget>`, so a user script or CSS that addresses such a copy must be adapted
* (@typhosj) Fixed the double click on a widget shown in multiple views jumping to a wrong view
* (@typhosj) Show the text of the button widgets as entered and not upper cased
* (@GermanBluefox) Fixed the ignored "small" option of the `filter - dropdown` widget
* (@typhosj) Subscribed to object IDs that are the result of a binding
* (@typhosj) Fixed the ignored read-only option of the Bool SVG widget
* (@GermanBluefox) Fixed the position of a new group created inside another group
* (@typhosj) Fixed the position of the members when a nested group is dissolved
* (@GermanBluefox) Fixed "same width"/"same height" applying the sizes of a previously selected widget
* (@GermanBluefox) Fixed the widget selection when a stored selected widget does not exist anymore
* (@typhosj) Fixed dissolving a group deleting a member widget instead of the group
* (@GermanBluefox) The user permissions are now applied to widgets embedded via `getWidgetInWidget`, which can return `null` now
* (@typhosj) Fixed the user permissions being ignored for widgets inside a group
* (@typhosj) Added the CSS classes `vis-filter-item` and `vis-filter-item-active` to the `filter - dropdown` widget
* (@GermanBluefox) Fixed `exist`/`not exist` of signals evaluating the comparison value instead of the state value
* (@GermanBluefox) Fixed the signal condition if the state value is `null`
* (@typhosj) Fixed the URL attributes of the `iFrame 8` widget being subscribed as object IDs
* (@typhosj) Fixed the visibility condition if the state value is `null`

## 2.14.3 (2026-06-09)
* (@GermanBluefox) Applied the user-defined style to tplValueInput

## 2.14.0 (2026-05-29)
* (@GermanBluefox) Refactoring of the build process

## 2.13.19 (2026-04-27)
* (@GermanBluefox) Refactoring

## 2.13.17 (2026-03-29)
* (@GermanBluefox) Removed debug code for theme

## 2.13.19 (2026-04-27)
* (@GermanBluefox) Refactoring

## 2.13.17 (2026-03-29)
* (@GermanBluefox) Removed debug code for theme

## 2.13.16 (2026-03-26)
* (@GermanBluefox) Fixing the usage of umlauts in patterns
* (@GermanBluefox) Fixing commands via control interface when sent as JSON

## 2.13.8 (2025-11-15)
* (@GermanBluefox) Updated packages

## 2.13.7 (2025-11-09)
* (@GermanBluefox) Updated packages
* (@GermanBluefox) Corrected the basic image refreshing

## 2.13.6 (2025-10-10)
* (@GermanBluefox) Prevent error by the icon selection dialog

## 2.13.5 (2025-09-16)
* (@GermanBluefox) Corrected loading of icon sets

## 2.13.4 (2025-09-05)
* (@GermanBluefox) Added the basic methods for metro widgets again

## 2.13.3 (2025-08-27)
* (@GermanBluefox) Corrected loading of icon sets

## 2.13.2 (2025-08-26)
* (@GermanBluefox) Added support for older Android versions

## 2.13.1 (2025-08-25)
* (@GermanBluefox) Fixed loading of widgets on the cloud

## 2.13.0 (2025-08-24)
* (@GermanBluefox) Added possibility to define SVG icon sets from widgets sets

## 2.12.12 (2025-07-20)
* (@foxriver76) enabled the local binding states for widgets

## 2.12.11 (2025-07-01)
* (@GermanBluefox) Corrected selection of the view for resolution
* (@GermanBluefox) Added option to ignore the unloaded widgets in runtime
* (@oweitman) Corrected the user defined resolution for the view

## 2.12.10 (2025-05-25)
* (@GermanBluefox) Added possibility to define favicon and browser tab title

## 2.12.9 (2025-05-19)
* (@GermanBluefox) Added possibility to use value in signal text

## 2.12.8 (2025-05-03)
* (@GermanBluefox) Added new SVG icon as favicon.
* (@GermanBluefox) Added support for the TypeScript widgets
* (@GermanBluefox) Used `vite` for faster loading

## 2.11.2 (2025-01-23)
* (@GermanBluefox) Do not load vis-1 widgets if vis-2 widgets are provided

## 2.11.1 (2024-12-02)
* (@GermanBluefox) Corrected navigation menu
* (@GermanBluefox) Migrated widgets to React: basic - frame, basic - note, basic - logout 
* (@GermanBluefox) Added the HTML rebuild button to settings
* (@GermanBluefox) Backend was migrated to TypeScript

## 2.10.8 (2024-11-22)
* (bluefox) Added a new option for view: "Limit only for instances"

## 2.10.7 (2024-07-23)
* (bluefox) Optimization of the module federation
