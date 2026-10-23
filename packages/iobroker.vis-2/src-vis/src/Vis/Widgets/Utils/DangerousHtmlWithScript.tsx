import React from 'react';

interface DangerousHtmlWithScriptProps {
    /** The passed html */
    html: string;
    /** If true uses a div, else a span */
    isDiv?: boolean;
    /** Any other props passed to the div or span element */
    [other: string]: any;
    /** The parent widget id */
    wid: string;
}

class DangerousHtmlWithScript extends React.Component<DangerousHtmlWithScriptProps> {
    /** The script elements this component added to the body last */
    private scripts: HTMLScriptElement[] = [];

    componentDidMount(): void {
        this.runScripts();
    }

    componentDidUpdate(prevProps: DangerousHtmlWithScriptProps): void {
        if (prevProps.html !== this.props.html) {
            this.runScripts();
        }
    }

    componentWillUnmount(): void {
        this.removeScripts();
    }

    removeScripts(): void {
        this.scripts.forEach(script => script.remove());
        this.scripts = [];
    }

    /**
     * Runs the scripts of the HTML. A script set with innerHTML does not run, so each one is added to the body as
     * a new element. They run again whenever the HTML changes, like in vis-1: the bindings in the HTML get their
     * values only after the widget was mounted, so the first run sees no values yet (#514). They also run again
     * when the widget is mounted again, e.g. after a view switch.
     *
     * Known limits, as in vis-1: a `let` or `const` at the top level of a script throws when the script runs the
     * second time, `var` works. A timer or an event listener a script starts is started again at every run, so the
     * script has to end the previous one itself.
     */
    runScripts(): void {
        this.removeScripts();
        const doc = new DOMParser().parseFromString(this.props.html, 'text/html');

        Array.from(doc.getElementsByTagName('script')).forEach((scriptElement, i) => {
            const script = document.createElement('script');
            script.id = `${this.props.wid}-${i}`;
            script.type = 'text/javascript';
            script.innerHTML = scriptElement.innerHTML;
            document.body.appendChild(script);
            this.scripts.push(script);
        });
    }

    /**
     * Renders the component
     */
    render(): React.JSX.Element {
        const { isDiv, html, ...otherProps } = this.props;

        if (isDiv) {
            return (
                <div
                    dangerouslySetInnerHTML={{ __html: html }}
                    {...otherProps}
                />
            );
        }

        return (
            <span
                dangerouslySetInnerHTML={{ __html: html }}
                {...otherProps}
            />
        );
    }
}

export default DangerousHtmlWithScript;
