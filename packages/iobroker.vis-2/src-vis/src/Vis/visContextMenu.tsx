import React, { useState } from 'react';
import { toPng } from 'html-to-image';

import {
    Widgets as WidgetIcon,
    Delete as DeleteIcon,
    Lock as LockIcon,
    LockOpen as LockOpenIcon,
} from '@mui/icons-material';
import { BiImport, BiExport, BiCut, BiCopy, BiPaste } from 'react-icons/bi';
import { RiBringToFront, RiSendToBack } from 'react-icons/ri';
import { AiOutlineGroup, AiOutlineUngroup } from 'react-icons/ai';

import { I18n, type ThemeType } from '@iobroker/adapter-react-v5';

import { store } from '@/Store';
import type { AnyWidgetId, Project, GroupWidgetId, SingleWidgetId, View, Widget } from '@iobroker/types-vis-2';

import type Editor from '@/Editor';
import IOContextMenu from '../Components/IOContextMenu';
import WidgetExportDialog from '../Toolbar/WidgetExportDialog';
import WidgetImportDialog from '../Toolbar/WidgetImportDialog';
import { type WidgetType, getWidgetTypes } from './visWidgetsCatalog';

interface VisContextMenuProps {
    changeProject: (project: Project) => void;
    children: any;
    copyWidgets: () => void;
    cutWidgets: () => void;
    deleteWidgets: () => void;
    disabled: boolean;
    groupWidgets: () => void;
    lockWidgets: (action: 'lock' | 'unlock') => void;
    orderWidgets: (action: 'front' | 'back') => void;
    pasteWidgets: () => void;
    selectedView: string;
    selectedWidgets: AnyWidgetId[];
    setSelectedGroup: (group: GroupWidgetId) => void;
    setSelectedWidgets: (widgets: AnyWidgetId[]) => void;
    ungroupWidgets: () => void;
    widgetsClipboard: Record<string, any>;
    themeType: ThemeType;
    setMarketplaceDialog: Editor['setMarketplaceDialog'];
}

export interface VisMarketplaceProps {
    language: ioBroker.Languages;
    addPage?: boolean;
    widget: { name: string; date: string; widget_id: string; image_id: string };
    installWidget: (widget: { name: string; date: string; widget_id: string; image_id: string }) => Promise<void>;
    installedWidgets?: { id: string }[];
    themeName: string;
    onAdded?: () => void;
}

const VisContextMenu = (props: VisContextMenuProps): React.JSX.Element | null => {
    const [exportDialog, setExportDialog] = useState(false);
    const [importDialog, setImportDialog] = useState(false);
    const visProject = store.getState().visProject;

    if (!visProject[props.selectedView] && Object.keys(visProject).length > 1) {
        return null;
    }

    const menuItemsData =
        Object.keys(visProject).length <= 1
            ? null
            : (menuPosition: { top: number; left: number }) => {
                  const view: View = visProject[props.selectedView];
                  const coordinatesWidgets: AnyWidgetId[] = menuPosition
                      ? (Object.keys(view.widgets).filter(widget => {
                            const rect = window.document.getElementById(widget)?.getBoundingClientRect();
                            if (view.widgets[widget as AnyWidgetId].grouped) {
                                return false;
                            }

                            return (
                                rect &&
                                menuPosition.left >= rect.left &&
                                menuPosition.left <= rect.right &&
                                menuPosition.top >= rect.top &&
                                menuPosition.top <= rect.bottom
                            );
                        }) as AnyWidgetId[])
                      : [];

                  // find name and widget type
                  let widgetType = null;
                  let widgetName = '';
                  let showSelect = coordinatesWidgets.length > 1;
                  // let marketplaceUpdate;
                  if (
                      view &&
                      coordinatesWidgets[0] &&
                      view.widgets[coordinatesWidgets[0]] &&
                      view.widgets[coordinatesWidgets[0]].tpl
                  ) {
                      if (view.widgets[coordinatesWidgets[0]].data?.locked) {
                          showSelect = true;
                      }
                      widgetName = coordinatesWidgets[0];
                      if (view.widgets[coordinatesWidgets[0]].data?.name) {
                          widgetName = view.widgets[coordinatesWidgets[0]].data.name;
                          widgetType = coordinatesWidgets[0];
                      } else {
                          const tpl = view.widgets[coordinatesWidgets[0]].tpl;
                          if (tpl === '_tplGroup') {
                              widgetType = I18n.t('Group');
                          } else {
                              const wSet = view.widgets[coordinatesWidgets[0]].widgetSet;
                              const widgetItem = getWidgetTypes().find(item => item.name === tpl && item.set === wSet);
                              widgetType = widgetItem ? widgetItem.title : tpl;
                          }
                      }

                      if (view.widgets[coordinatesWidgets[0]].marketplace) {
                          widgetType = `${view.widgets[coordinatesWidgets[0]].marketplace.name} (${I18n.t('version')} ${view.widgets[coordinatesWidgets[0]].marketplace.version})`;
                          // marketplaceUpdate = visProject.___settings.marketplace.find(u =>
                          //     u.widget_id === view.widgets[coordinatesWidgets[0]].marketplace.widget_id &&
                          //     u.version > view.widgets[coordinatesWidgets[0]].marketplace.version);
                      }
                  }

                  const selectedWidget: Widget = visProject[props.selectedView].widgets[props.selectedWidgets[0]];

                  return [
                      {
                          leftIcon: <WidgetIcon />,
                          hide: coordinatesWidgets.length !== 1,
                          label: widgetName,
                          subLabel: widgetType,
                          style: { fontWeight: 'bold' },
                          disabled: true,
                      },
                      {
                          hide: !showSelect,
                          label: 'Select',
                          items: [
                              {
                                  label: 'all',
                                  hide: coordinatesWidgets.length === 1,
                                  onClick: () => props.setSelectedWidgets(coordinatesWidgets),
                              },
                              ...coordinatesWidgets.map(widget => ({
                                  label: widget,
                                  onClick: () => props.setSelectedWidgets([widget]),
                              })),
                          ],
                      },
                      {
                          leftIcon: <AiOutlineGroup />,
                          label: 'Group widgets',
                          onClick: () => props.groupWidgets(),
                          hide: props.selectedWidgets.length < 2,
                      },
                      {
                          leftIcon: <AiOutlineUngroup />,
                          label: 'Ungroup',
                          subLabel: selectedWidget?.marketplace ? I18n.t('convert from widgeteria widget') : null,
                          onClick: () => props.ungroupWidgets(),
                          hide: props.selectedWidgets.length !== 1 || selectedWidget.tpl !== '_tplGroup',
                      },
                      window.VisMarketplace
                          ? {
                                leftIcon: (
                                    <img
                                        src="./img/marketplace.png"
                                        alt="widgeteria"
                                        style={{ width: 16, height: 16, verticalAlign: 'middle' }}
                                    />
                                ),
                                label: 'Add to widgeteria',
                                onClick: async () => {
                                    // copy all selected widgets
                                    const widgets = props.selectedWidgets.map(wid => {
                                        const w = JSON.parse(
                                            JSON.stringify(visProject[props.selectedView].widgets[wid]),
                                        );
                                        w._id = wid;
                                        w.isRoot = true;
                                        delete w.marketplace;
                                        w.widgetSet = (window as any).visWidgetTypes.find(
                                            (type: WidgetType) => type.name === w.tpl,
                                        ).set;
                                        return w;
                                    });

                                    const groupWidgets: SingleWidgetId[] = [];

                                    let gIdx = 1;
                                    let wIdx = 1;
                                    const len = widgets.length;
                                    for (let w = 0; w < len; w++) {
                                        const widget = widgets[w];
                                        // if we are creating the group of groups (only two groups could be leveled)
                                        if (widget.tpl === '_tplGroup') {
                                            const newId = `f${gIdx.toString().padStart(6, '0')}`;
                                            gIdx++;

                                            if (widget.data && widget.data.members) {
                                                const members: SingleWidgetId[] = [];
                                                for (let m = 0; m < widget.data.members.length; m++) {
                                                    const member: SingleWidgetId = widget.data.members[m];
                                                    if (groupWidgets.includes(member)) {
                                                        continue;
                                                    }
                                                    const memberWidget = JSON.parse(
                                                        JSON.stringify(visProject[props.selectedView].widgets[member]),
                                                    );
                                                    memberWidget._id = `i${wIdx.toString().padStart(6, '0')}`;
                                                    memberWidget.widgetSet = (window as any).visWidgetTypes.find(
                                                        (type: WidgetType) => type.name === memberWidget.tpl,
                                                    ).set;
                                                    wIdx++;
                                                    members.push(memberWidget._id);
                                                    memberWidget.groupid = newId;
                                                    memberWidget.grouped = true;
                                                    delete memberWidget.isRoot;
                                                    delete memberWidget.marketplace;
                                                    widgets.push(memberWidget);
                                                    groupWidgets.push(member);
                                                }

                                                widget.data.members = members;
                                            }
                                            widget._id = newId;
                                        } else if (widget._id.startsWith('w')) {
                                            if (widget.grouped) {
                                                delete widget.grouped;
                                                delete widget.groupid;
                                                delete widget._id;
                                            } else {
                                                widget._id = `i${wIdx.toString().padStart(6, '0')}`;
                                                wIdx++;
                                            }
                                        }
                                    }

                                    const resizers = document.getElementsByClassName('vis-editmode-resizer');
                                    for (let i = 0; i < resizers.length; i++) {
                                        const el = resizers[i] as HTMLElement;
                                        el.style.display = 'none';
                                    }
                                    const el = document.getElementById(props.selectedWidgets[0]);
                                    if (el) {
                                        const cachePosition = el.style.position;
                                        el.style.position = 'initial';
                                        const dataUrl = await toPng(el);
                                        el.style.position = cachePosition;
                                        // create image of widget

                                        for (let i = 0; i < resizers.length; i++) {
                                            const el_ = resizers[i] as HTMLElement;
                                            el_.style.display = 'block';
                                        }
                                        // console.log(document.getElementById(props.selectedWidgets[0]));

                                        props.setMarketplaceDialog({
                                            addPage: true,
                                            widget: { widget: widgets, image: dataUrl },
                                        });
                                    }
                                },
                                hide:
                                    props.selectedWidgets.length !== 1 ||
                                    selectedWidget.tpl !== '_tplGroup' ||
                                    selectedWidget.marketplace,
                            }
                          : null,
                      {
                          // leftIcon: <AiOutlineUngroup />,
                          label: 'Edit group',
                          onClick: () => props.setSelectedGroup(props.selectedWidgets[0] as GroupWidgetId),
                          hide:
                              props.selectedWidgets.length !== 1 ||
                              selectedWidget.tpl !== '_tplGroup' ||
                              selectedWidget.marketplace,
                      },
                      {
                          leftIcon: <BiCopy />,
                          label: 'Copy',
                          onClick: () => props.copyWidgets(),
                          disabled: !props.selectedWidgets.length,
                      },
                      {
                          leftIcon: <BiCut />,
                          label: 'Cut',
                          onClick: () => props.cutWidgets(),
                          disabled: !props.selectedWidgets.length,
                      },
                      {
                          leftIcon: <BiPaste />,
                          label: 'Paste',
                          onClick: () => props.pasteWidgets(),
                          disabled: !Object.keys(props.widgetsClipboard.widgets).length,
                      },
                      {
                          leftIcon: <DeleteIcon fontSize="small" />,
                          label: 'Delete',
                          onClick: () => props.deleteWidgets(),
                          disabled: !props.selectedWidgets.length,
                      },
                      {
                          label: 'More',
                          items: [
                              {
                                  leftIcon: <LockIcon fontSize="small" />,
                                  label: 'Lock',
                                  onClick: () => props.lockWidgets('lock'),
                                  disabled: !props.selectedWidgets.length,
                              },
                              {
                                  leftIcon: <LockOpenIcon fontSize="small" />,
                                  label: 'Unlock',
                                  onClick: () => props.lockWidgets('unlock'),
                                  disabled: !props.selectedWidgets.length,
                              },
                              {
                                  leftIcon: <RiBringToFront />,
                                  label: 'Bring to front',
                                  onClick: () => props.orderWidgets('front'),
                                  disabled: !props.selectedWidgets.length,
                              },
                              {
                                  leftIcon: <RiSendToBack />,
                                  label: 'Sent to back',
                                  onClick: () => props.orderWidgets('back'),
                                  disabled: !props.selectedWidgets.length,
                              },
                              {
                                  leftIcon: <BiExport />,
                                  label: 'Export widgets',
                                  onClick: () => setExportDialog(true),
                                  disabled: !props.selectedWidgets.length,
                              },
                              {
                                  leftIcon: <BiImport />,
                                  label: 'Import widgets',
                                  onClick: () => setImportDialog(true),
                              },
                          ],
                      },
                  ];
              };

    return (
        <>
            {menuItemsData ? (
                <IOContextMenu
                    menuItemsData={menuItemsData}
                    disabled={props.disabled}
                >
                    {props.children}
                </IOContextMenu>
            ) : (
                props.children
            )}
            {importDialog ? (
                <WidgetImportDialog
                    onClose={() => setImportDialog(false)}
                    changeProject={props.changeProject}
                    selectedView={props.selectedView}
                    themeType={props.themeType}
                />
            ) : null}
            {exportDialog ? (
                <WidgetExportDialog
                    onClose={() => setExportDialog(false)}
                    widgets={visProject[props.selectedView].widgets}
                    selectedWidgets={props.selectedWidgets}
                    themeType={props.themeType}
                />
            ) : null}
        </>
    );
};

export default VisContextMenu;
