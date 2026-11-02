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
## 2.20.1
* (@GermanBluefox) Widget sets may bring background services (`common.visWidgets.<set>.services`): the runtime renders them once next to the views, with the widgets of the set in all views the user may see, whichever view is shown - e.g. so that a phone stays registered without "Render always"
* (@GermanBluefox) The runtime shows the first view much sooner - measured on a tablet profile (4x slower CPU, WLAN): 4.5 s instead of 7 s for a small project, 9 s instead of 23 s for one of 760 widgets, and 0.6 s instead of 1.5 s on a desktop:
  * The runtime loads 3.4 MB of JavaScript instead of 4.6 MB: `@iobroker/gui-components` is tree-shaken, the date pickers are loaded with the widgets that use them, the words of the standard widgets only in the language of the system
  * The requests of the start go out side by side instead of one after the other, and the project file and its style sheets come over HTTP - compressed, from the browser cache while unchanged - and already while the socket connects
  * The adapter lists the widget sets in `config.js`, so the runtime no longer reads every instance object of the system (1 MB) to find them
  * The widget sets of the first view are loaded first; the others follow while it is already shown. A view of React widgets does not wait for the vis-1 libraries anymore
  * Of `widgets.html` only the widget sets the project uses go into the page - with the style sheets and web fonts of all others, which were loaded although their scripts were skipped
  * jQuery, jQuery UI, can.js and the scripts of a vis-1 widget set are fetched side by side (and still run in their order), the files of a widget set are announced to the browser out of its federation manifest, and the shared modules of vis-2 with the page
* (@GermanBluefox) Changed: the AI assistant uses the shared libraries `@iobroker/ai-core` and `@iobroker/ai-gui`
* (@GermanBluefox) Fixed: the AI push session is bound to the user who opened it, and testing the values of the AI settings form needs the "execute" right
* (@GermanBluefox) The endpoint and the credential of an assistant request come out of the instance configuration and no longer out of the request. Both were taken from the message, and the key they resolve - a secret of this system, out of the configuration or out of the central credential store - travels with the request as its authorisation: whoever may send a message to this instance could therefore have that key carried to an address of their own. The editor never sent either of them, so nothing changes for it. The test buttons of the configuration page keep trying what stands in the form, with one limit: an address out of the form counts only together with a key out of the form - one's own key to one's own endpoint gives nothing away. In the central-store mode the saved address is used, so an endpoint of one's own has to be saved before it can be tested there
* (@GermanBluefox) Only an entry that was stored as an AI credential is read from the central credential store. The store holds the secrets of the whole system - a database password, the login of a camera - and a request for "the key of this provider" reached every one of them
* (@GermanBluefox) An answer of the assistant may take as long as it takes. A socket callback is given up on after thirty seconds, and the web adapter lets go of a `sendTo` even earlier, while a model that is handed a page of widgets and a dozen tools regularly needs longer - the answer then arrived at a callback nobody was holding any more: an empty bubble, no error, and nothing in any log. The editor now subscribes to an instance message, the callback carries nothing but the acknowledgement, and the finished answer is pushed to that one editor whenever it is ready
* (@GermanBluefox) The length of an answer is a setting: *Maximum answer length* in the AI tab of the instance configuration. Only Anthropic needs it - it refuses a request without one - and the 8192 tokens it was fixed at are not always enough for a page built in one go
* (@GermanBluefox) The assistant renders what it answers. A model writes `**Schalter-Widget**` and a datapoint in backticks whether it is asked to or not, and the panel showed the asterisks, so the reader did the parsing: the answers now have their headings, lists, quotes and code as what they were written as, while what the user typed stays the text they typed
* (@GermanBluefox) The two standard widget sets are written up: [docs/widgets-standard.md](packages/iobroker.vis-2/docs/widgets-standard.md) has a picture of every one of the twenty-seven devices, what it reads and writes, every attribute it carries, and what it looks like as a marker on a plan
* (@GermanBluefox) A chart in a section keeps the height of its card. It drew itself as high as the box it had just measured, which made that box higher, which made the next drawing higher: a card six thousand pixels tall with an axis label every tenth of a degree
* (@GermanBluefox) A table whose columns are given widths keeps all of them on a narrow card. Every column has a floor of its own now and the card scrolls sideways when they no longer fit, instead of the column without a width being squeezed to nothing - heading, data and all - on a phone
* (@GermanBluefox) A measured value takes its unit out of the object where its own field is empty, the way the fill level and the input field already did, so a card the assistant built says `21,4 °C` and not `21,4`
* (@GermanBluefox) The name of a list row and the dropdown beside it share the line. The dropdown was as wide as its longest word, which left `Betrie...` of `Betriebsart`; now both end in an ellipsis instead of one of them
* (@GermanBluefox) The minus and plus of a number field are left out where the card is too narrow for them - the plus stood outside the card, over its neighbour - and a number that can only be read is written with the decimal separator of the language
* (@GermanBluefox) vis-2 brings two widget sets of its own for the devices of a house: **Relative**, where a widget is a tile that fills its cell of a section, and **Absolute**, where it is as large as it was dragged. Both show the same devices in the same style - the card, a quiet name over a big value, the control at the bottom edge, and every colour out of the theme, so the two new themes carry them as well - and a device is described once and comes out in both sets. The two sets are not the same widget in two sizes: a page with an absolute layout has a picture of the flat under it, so a device there is **a marker no bigger than a coin** - a ring in the colour of its state around a dark disc with its icon, glowing in that colour so it is found on a busy picture. What it shows follows the shape it is dragged to: wider than tall it is a capsule with the number beside the icon, square it shows the number alone because both would have to be too small, taller than wide it stands the icon over the number. Picking the state for one takes over what the object already knows - its name, its unit, its limits and the icon of its channel - so none of that has to be typed again, and a marker says as much or as little as it is told to: only its icon, the icon with the name under it, or both with the state as well.
* (@GermanBluefox) A widget attribute can be an icon **or** a picture, in one field: two buttons beside it open the picker of the standard small icons and the file browser of ioBroker, and whichever was chosen last is what the widget shows. The widgets of the sets `Relative` and `Absolute` name their icon that way In a section a widget is a card instead, in one of three arrangements: the name above the value, a single row, or a tile in the colour of its state. The first three devices are there: switch, measured value and blind. Neither set measures the box it ended up in, so neither can chase its own size the way the widgets of the material set did
* (@GermanBluefox) A page can be built out of the devices of the installation: `Add view` offers `From devices...`, which finds what the type detector knows, sorts it into the rooms - or the functions - it belongs to, and writes one page with a section per room, or a page per room with its entry in the navigation. Every device becomes a widget of `Basic` or `jQui`, so no other adapter is needed: what can be switched becomes a switch, what can be set a slider, what can be read a value. The names can be changed and single devices left out before anything is written, and all of it is one step of the undo
* (@GermanBluefox) The search of the palette looks at the widget sets as well, by their name and by their label: typing `metro` found nothing, because that is a set and not a widget
* (@GermanBluefox) A field that still holds `nothing_selected` - what a new widget is created with - shows `--`, and the dialog behind it opens with nothing selected instead of looking for an object of that name
* (@GermanBluefox) The widgets can be selected, moved and resized with a finger in the editor: every gesture runs on pointer events now instead of mouse events only, and what starts one does not scroll the page (after #658 by @typhosj)
* (@typhosj) Every signal image of a widget names its small icon again. The label was a word per index, of which there were three - the third of them read `[3]` - so the signals beyond them showed the raw key after six of them became possible (#562)
* (@typhosj) The tab of the editor keeps its own name and icon. The title and the favicon of the project name the runtime, and an editor tab that carried them could not be told apart from the runtime tab of the same project (#537)
* (@typhosj) A `border-radius` on a jQui widget is drawn again. Only the frame moves to the button inside the widget, so that it is not drawn twice - the radius stays on the widget as well, whose square background filled in the corners the button had rounded away (#663)
* (@typhosj) The label of a jQui button follows a `text-align` of left or right in the style of the widget. The button lays out its label as a flex box, which does not care for `text-align`, so the label stayed in the middle (#426)
* (@typhosj) The widget set of an uninstalled adapter leaves the palette when vis-2 starts again. Once vis-2 had found the first installed widget set, every later one in the directory counted as installed too, so a removed set was kept, stayed in `widgets.html` and went back into the file storage with the next upload: `iobroker del echarts` deleted its widgets, and the restart that followed put them back
* (@typhosj) A page with the widget `Swipe` can be scrolled with a finger again. The widget held back every move of the finger, also up and down where no view was set. It holds back only a move towards a view now, and it also hears a swipe that starts on the page below the view, where the finger is once the page is scrolled (#499)
* (@typhosj) The push mode of the widget `Binary control` works on a touch screen: the state is on for as long as a finger holds the button. It ran on mouse events, which a finger fires only when it is lifted. The same held back the repetition of the widget `Write state` while its button is held. A mouse released outside of the button now releases it too, instead of leaving the state on or the repetition running (#475)
* (@typhosj) A group that is shown in more views (`multi-views`) is drawn in those views again. The widgets of its copy still belonged to the group of their own view, which the other view does not have, so each of them failed to render (#431)
* (@typhosj) A widget that is taken out of a view in `multi-views`, or deleted, leaves that view in the editor at once. Its copy stayed there until the editor was loaded again (#417)
* (@typhosj) The title of the widget `Border` takes HTML again, as it did in vis-1 - `<b>` makes it bold instead of being shown as text (#563)
* (@typhosj) The background of a view covers its whole screen size in the editor. With a screen size larger than the editor, the background stopped where the first screenful ended, and everything scrolled to beyond it was white (#560)
* (@typhosj) The text of the jQui inputs - input, date, date and time, and the select of the states control - takes the color of the widget, set in its style or by a CSS class. It kept the text color of the theme (#521)
* (@typhosj) The editor cuts the content of a widget at its border, as the runtime does. An image larger than its widget was shown whole in the editor and cut in the runtime: the editor lifted the clipping for the name plate of the widget, which does not sit inside the widget anymore (#582)
* (@typhosj) The jQui slider writes every value to its control ID. A value was left out when the object ID shown by the slider had it at that moment - so a slider that shows the temperature of a room and sets its thermostat could not set the temperature the room had (#580)
* (@typhosj) The groups of the editor toolbar wrap into another row when the window is too narrow for them. They ran on under the user, theme and menu buttons at the right edge and lay over the name of the user, first of all in the narrowest form of the toolbar (#570)
* (@GermanBluefox) The widget `Number` shows `--` instead of `NaN` when its object has no numeric value
* (@GermanBluefox) The editor scrolls the view by itself while a widget is dragged or resized near its edge, so a widget can reach a place that is out of sight
* (@GermanBluefox) A new view - and the first view of a new project - uses the grid layout with sections and starts with one empty section. Existing views keep their layout
* (@GermanBluefox) A widget can be dragged in the editor without selecting it first: the press selects it and moves it at once. A press that is only a click does not shift a widget by a pixel anymore
* (@GermanBluefox) The sections of the grid layout can be styled in the new attributes tab `Section`: header with title and icon, background, border, border radius, inner spacing, or the look of a panel. The tab shows the section of the selected widget, or the section clicked on. It is not offered while an absolute widget is selected, as such a widget has no section
* (@GermanBluefox) The labels of many attributes explain themselves in a tooltip with a picture: the responsive settings, grid, screen limit and navigation of a view, all attributes of a section, and the common CSS attributes of a widget (position, place, size, z-index, overflow, opacity, transform, border, padding, margin, shadow, visibility by view width)
* (@GermanBluefox) A button next to the title of the attributes switches their tabs between names and icons, so that all tabs fit into a narrow panel
* (@GermanBluefox) A section of the grid layout can be shown only to some user groups, only at some widths of the view, or only while a state fulfills a condition. The editor offers the condition and the value the way the state has them: true and false for a boolean, the list of a state with states, a number with its unit
* (@GermanBluefox) A section can be opened and closed by its header, can start closed, and can open and close by a condition on a state. The browser remembers what the user chose
* (@GermanBluefox) More attributes of a section: subtitle, bindings in the title, color, size and alignment of the title, color of the icon, a line below the header, a link to another view, background image, text color, shadow, glass effect, CSS class, width, a new row, the height of its row or a minimal one, and cells of its own size
* (@GermanBluefox) Every attribute of a section can be used as a binding, like every field of a widget: the link icon next to its label switches the input to the text of the binding, e.g. `{javascript.0.alarm}` as the border width. A number stays a number and a checkbox stays on or off, and the view shows the result at once
* (@GermanBluefox) The tabs of the open views can be put in another order by dragging them. The order is the one of the project, so it is there again the next time the editor is opened
* (@GermanBluefox) The button that opens the runtime shows the page that is being worked on. It used to open whatever page was selected when the editor was started, because the address was built once and never again
* (@GermanBluefox) A widget that fills the whole view could make the editor flicker: it grew a little too tall, the scrollbar of the work area appeared, the area became narrower, the widget became shorter, and the bar went again. The work area keeps the room for its scrollbar free now
* (@GermanBluefox) A project in which a widget has no widget set could not be opened in the built adapter: filling it in wrote into the project of the store, which is frozen, and the page died with `Cannot add property widgetSet, object is not extensible`. The repair works on a copy now
* (@GermanBluefox) The theme switcher offers the two new themes `modernDark` and `modernLight` as well, and its switch stays in the family it is in: a view on `modernLight` turns to `modernDark`, not to `dark`. The variant `Text` of the widget has a word in every language again
* (@GermanBluefox) The numbers 4 to 8 of the analog clock stood on their heads: they turned with the dial and did not turn back
* (@GermanBluefox) The history chart of the thermostat and of the static information is drawn by vis-2 itself now - a line or a step curve with its axes, a crosshair that reads the values, panning with the mouse and zooming with the wheel. echarts is not needed for it anymore and left the adapter
* (@GermanBluefox) Dragging the ring of the thermostat, the color wheel or a blind does not paint the text under the cursor blue anymore
* (@GermanBluefox) The RGB light moved into vis-2 as well. Its color wheel and the slider for the brightness are drawn by vis-2 itself now, and the second way of choosing - the palette - is the color picker of the ioBroker components, so the widget brings no color library of its own
* (@GermanBluefox) The attribute `instance` of a widget shows the icon of the adapter on the field itself, not only in the open list
* (@GermanBluefox) While a widget is dragged out of the palette, the section it would land in is marked. Over no section it becomes an absolute widget, as before, and nothing is marked
* (@GermanBluefox) An entry a widget set renders itself - the wizard of the material set, say - stands above the tiles of its set over the whole width, instead of being stretched into a tile as if it were a widget to drag
* (@GermanBluefox) The binding operation `array(...)` takes a boolean as well: true picks the second element, false the first. Until now such a binding - the example `{id.ack;array(…,…)}` of the documentation included - gave `undefined`
* (@GermanBluefox) The editor dims an empty section the same way as a hidden one, since the runtime leaves an empty section out, and says so when the cursor rests on it
* (@GermanBluefox) The name of a view in the narrow navigation menu is hidden again, instead of standing cut off beside its icon
* (@GermanBluefox) A section is selected by a click on it where no widget is, and moved to another place by dragging it from there - the other sections make room while it is dragged.
* (@GermanBluefox) The CSS attribute `display` of a view is not offered anymore in the grid layout, where it has no effect
* (@typhosj) `licenseInformation.link` points at the license editions now. For a non-free license that link is meant to name validity, shop and seller, which the source license file does not
* (@typhosj) A timestamp that arrives as a string is shown as a date again instead of `NaN:NaN:NaN`, and a value that cannot be parsed at all is shown as it is
* (@typhosj) A widget that leads to the view that is shown gets the CSS class `vis-nav-active`, so the current entry of a self-built navigation can be highlighted. The jQui buttons mark themselves by the active view now instead of the address of the browser, which they never noticed changing
* (@typhosj) The project setting `States Debounce Time` is applied again: the commands for one object ID are collected during that period. It had no effect at all, as the value was never read from the project
* (@typhosj) The switch of the `binary control` widget shows the state of the object again if no text and no icon are defined
* (@typhosj) `widgetOid` delivers the object ID of a widget inside a group again instead of the name of the group attribute
* (@typhosj) A view can show the navigation menu without being an entry of it: the new view setting `Hide this view in the menu`
* (@typhosj) A resize of the window does not leave the opened view anymore, unless that view offers itself for a resolution
* (@typhosj) Fixed the widget attributes keeping the groups of the previously selected widget after a view change
* (@typhosj) The view of a jQui dialog is drawn inside the dialog again and no longer over its title
* (@typhosj) Fixed the crash of the `bulb on/off` widget if the value of its object is `null`
* (@typhosj) An `iFrame` or `echarts` widget is transparent again in the dark mode. The CSS variables put `color-scheme: dark` on `:root`, and a browser paints an opaque canvas behind an iframe whose document declares itself transparent (#661)
* (@typhosj, @GermanBluefox) The content of a widget is not cut off anymore: `CssBaseline` is gone. It switched the whole document to `border-box` and painted the body, while the widgets - the built-in ones and those of other adapters alike - are laid out for the default `content-box` (#661)
* (@typhosj) The text of a `Fab` button is readable again in the dark mode. MUI writes `text.primary` into it as soon as the CSS variables are generated, which is white, although the background of the button stays light grey in both themes (#661)
* (@GermanBluefox) vis-2 uses MUI 9 and `@iobroker/gui-components` now, the successor of `@iobroker/adapter-react-v5`
* (@GermanBluefox) `@mui/styles` is gone: it does not exist beyond MUI 6 and vis-2 never used it. It stays in the shared modules of the module federation so that a widget set built against MUI 6 keeps its own copy
* (@GermanBluefox) Replaced the unmaintained `mui-nested-menu`, whose peer range ends at MUI 7, with an own sub menu entry built from MUI components
* (@GermanBluefox) Followed the MUI props that were consolidated into `slotProps` (`TransitionProps`, `TabIndicatorProps`, `InputLabelProps`, `PaperProps`) and the renamed `HelpOutline` icon
* (@GermanBluefox) vis-2 runs on React 19 now
* (@GermanBluefox) Replaced the unmaintained `react-beautiful-dnd` with its api-compatible fork `@hello-pangea/dnd`, which is the only one of the two that supports React 19
* (@GermanBluefox) Fixed the connectors of react-dnd being passed as a `ref`: React 19 takes what a ref callback returns as its cleanup function, and those connectors return a React element, so React would have tried to call an element on unmount
* (@GermanBluefox) Fixed the type of `window.VisMaterialIconSelector`, which named the state of the component instead of its properties
* (@GermanBluefox) A widget set that was built for an older React is recognized by its federation manifest and skipped with a readable message, instead of dying somewhere inside the module federation loader where no error boundary can catch it. As long as vis-2 itself runs on react 18 nothing is skipped
* (@GermanBluefox) Widget sets that were skipped are named in a dialog in the editor and in the runtime, so a view with missing widgets does not leave the user guessing. It is shown once per affected set
* (@GermanBluefox) Dropped the `mime` dependency; copied widget files are compared byte for byte instead of by type
* (@GermanBluefox) `@iobroker/types-vis-2`: `@iobroker/vis-2-widgets-react-dev` left the list of shared modules. vis-2 never provided it anyway, and bundled as a share it dragged its undeclared `@iobroker/adapter-react-v5` into the host build
* (@GermanBluefox) The check that skips widget sets built for an older React works on a real installation too: it asked for the federation manifest under `/vis-2/vis-2/...`, was always answered 404 and let every set through
* (@GermanBluefox) The build declares one placeholder remote (`vis2-dynamic-remotes.js`), which makes `@module-federation/vite` 1.21 treat vis-2 as the host it is. Without it the plugin deferred every shared module to the federation bootstrap and vis-2 died on `jsx is not a function` / `createCssVarsProvider is not a function`
* (@GermanBluefox) `@iobroker/types-vis-2`: `@mui/icons-material` and the i18n JSONs of `@iobroker/gui-components` are not shared modules anymore, and `moment` is one now. Since a shared entry is bundled as a whole namespace, the icons alone put all ~10700 of them into every vis-2 delivery although vis-2 uses 83 - the build shrinks from 11 MB to 5.9 MB. A widget set bundles the icons it really uses instead, which is what already happened for every set of an older MUI major
* (@GermanBluefox) Dropped the unused `echarts` and `echarts-for-react` dependencies of the editor
* (@GermanBluefox) A widget could not be dropped on a view anymore: the workspace wrapper carried no height, so the `height: 100%` of the canvas resolved to `auto` and the drop area collapsed to zero pixels. The workspace is a flex column now - the tabs take their height, the canvas takes the rest
* (@GermanBluefox) `@iobroker/types-vis-2`: `@mui/material` and `@mui/system` are singletons now instead of being versioned by the range of the consumer. A widget set built against 9.1.0 while vis-2 ships 9.1.2 used to carry its own copy; it renders with the MUI of vis-2 now, whatever patch or minor it was built against. Widget sets of an older MUI major are react 18 builds and are skipped before they are evaluated anyway
* (@GermanBluefox) The federation host uses the `loaded-first` share strategy, so a widget set cannot replace the shared react, MUI or gui-components of vis-2 with its own copy

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
