import type { VisRxWidgetState } from '@iobroker/types-vis-2';

import VisRxWidget from '@/Vis/visRxWidget';

/**
 * The base of the widgets that came from the widget set `vis-2-widgets-material`.
 *
 * They moved into vis-2 itself, so that they are always there - the wizard builds its pages out of them. Their ids,
 * their set name and their translations stayed as they were, so that the projects that use them keep working; the
 * widget set gives them up on its side. This class is what their `Generic` was there, only that it extends the
 * widget base of vis-2 directly instead of the one the set was handed at runtime.
 */

export const HISTORY_ADAPTER_NAMES = ['history', 'sql', 'influxdb'];

export default class Generic<
    RxData extends Record<string, any>,
    State extends Partial<VisRxWidgetState> = VisRxWidgetState,
> extends VisRxWidget<RxData, State> {
    /** Their words are read with the prefix the widget set gave them, see translations.ts */
    static i18nPrefix = 'vis_2_widgets_devices_';

    getPropertyValue = (stateName: string): any => this.state.values[`${(this.state.rxData as any)[stateName]}.val`];

    static getI18nPrefix(): string {
        return 'vis_2_widgets_devices_';
    }

    static getHistoryInstance(
        obj: ioBroker.StateObject | undefined | null | { common: ioBroker.StateCommon; _id: string },
        defaultHistory: string,
    ): string | null {
        if (obj?.common?.custom) {
            if (obj.common.custom[defaultHistory]) {
                return defaultHistory;
            }
            for (const instance in obj.common.custom) {
                if (HISTORY_ADAPTER_NAMES.includes(instance.split('.')[0])) {
                    return instance;
                }
            }
        }
        return null;
    }

    async getParentObject(id: string): Promise<ioBroker.Object | null> {
        const parts = id.split('.');
        parts.pop();
        const parentOID = parts.join('.');
        return (await this.props.context.socket.getObject(parentOID)) ?? null;
    }

    static getObjectIcon(obj: ioBroker.Object, id: string, imagePrefix?: string): string | null {
        imagePrefix ||= '../..'; // http://localhost:8081';
        let src = '';
        const common = obj?.common;

        if (common) {
            const cIcon = common.icon;
            if (cIcon) {
                if (!cIcon.startsWith('data:image/')) {
                    if (cIcon.includes('.')) {
                        let instance;
                        if (obj.type === 'instance' || obj.type === 'adapter') {
                            src = `${imagePrefix}/adapter/${common.name as string}/${cIcon}`;
                        } else if (id && id.startsWith('system.adapter.')) {
                            instance = id.split('.', 3);
                            if (cIcon[0] === '/') {
                                instance[2] += cIcon;
                            } else {
                                instance[2] += `/${cIcon}`;
                            }
                            src = `${imagePrefix}/adapter/${instance[2]}`;
                        } else {
                            instance = id.split('.', 2);
                            if (cIcon[0] === '/') {
                                instance[0] += cIcon;
                            } else {
                                instance[0] += `/${cIcon}`;
                            }
                            src = `${imagePrefix}/adapter/${instance[0]}`;
                        }
                    } else {
                        return null;
                    }
                } else {
                    src = cIcon;
                }
            }
        }

        return src || null;
    }
}
