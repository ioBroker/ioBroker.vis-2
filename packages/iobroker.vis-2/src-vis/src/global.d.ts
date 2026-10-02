import type * as SpeechRecognition from 'dom-speech-recognition';
import type VisRxWidget from '@/Vis/visRxWidget';
import type JQuery from '@types/jquery';

declare global {
    interface Window {
        webkitSpeechRecognition?: SpeechRecognition;
        adapterName: string;
        /** The vis-2 adapter instance */
        visAdapterInstance?: number;
        visRxWidget: typeof VisRxWidget;
        visConfigLoaded?: Promise<void>;
        /** Where ioBroker is, written into the page by the dev server; see Utilities/devServer.ts */
        visDevBackend?: string;
        sentryDSN?: string;
        disableDataReporting?: boolean;
        jQuery: JQuery;
    }
}

declare module '@mui/material/Button' {
    interface ButtonPropsColorOverrides {
        grey: true;
    }
}
