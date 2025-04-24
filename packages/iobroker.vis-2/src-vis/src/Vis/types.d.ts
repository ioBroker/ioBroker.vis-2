import type VisRxWidget from '@/Vis/visRxWidget';

export interface VisRxWidgetLoaded extends VisRxWidget<any> {
    readonly i18nPrefix?: string | undefined;
    readonly adapter?: string;
    readonly version?: string;
    readonly visHidden?: boolean;
    readonly url?: string;
}
