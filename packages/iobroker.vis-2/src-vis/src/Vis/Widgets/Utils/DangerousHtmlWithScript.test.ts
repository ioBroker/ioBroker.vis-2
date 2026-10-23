import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import DangerousHtmlWithScript from './DangerousHtmlWithScript';

/** The body of a page: what the component adds to it, and what of that is still there */
let body: { id: string; innerHTML: string }[];
/** The text of every script that was added, in order - adding a script element is what runs it */
let ran: string[];

beforeEach(() => {
    body = [];
    ran = [];
    (globalThis as any).DOMParser = class {
        // eslint-disable-next-line class-methods-use-this
        parseFromString(html: string): { getElementsByTagName: () => { innerHTML: string }[] } {
            return {
                getElementsByTagName: () =>
                    [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(match => ({
                        innerHTML: match[1],
                    })),
            };
        }
    };
    (globalThis as any).document = {
        querySelectorAll: () => [...body],
        createElement: () => {
            const element = {
                id: '',
                type: '',
                innerHTML: '',
                remove: () => body.splice(body.indexOf(element), 1),
            };
            return element;
        },
        body: {
            appendChild: (element: { id: string; innerHTML: string }) => {
                body.push(element);
                ran.push(element.innerHTML);
            },
        },
    };
});

afterEach(() => {
    delete (globalThis as any).DOMParser;
    delete (globalThis as any).document;
});

function mount(html: string): DangerousHtmlWithScript {
    const component = new DangerousHtmlWithScript({ html, wid: 'w000001' });
    component.componentDidMount();
    return component;
}

function update(component: DangerousHtmlWithScript, html: string): void {
    const prevProps = component.props;
    (component as any).props = { ...prevProps, html };
    component.componentDidUpdate(prevProps);
}

describe('DangerousHtmlWithScript', () => {
    // #514: the script saw the value of a binding only as it was before the widget got its values
    it('runs the scripts again with the new values of the bindings', () => {
        const component = mount('<div></div><script>var x = ;</script>');
        update(component, '<div></div><script>var x = 10;</script>');

        expect(ran).toEqual(['var x = ;', 'var x = 10;']);
        // the script of the first run is gone
        expect(body.map(script => script.innerHTML)).toEqual(['var x = 10;']);
    });

    it('does not run the scripts again if the HTML is the same', () => {
        const component = mount('<script>a();</script>');
        update(component, '<script>a();</script>');

        expect(ran).toEqual(['a();']);
    });

    // #514: the script element of the first mount was still in the body, so a second mount ran nothing
    it('runs the scripts when the widget is mounted again, and removes them on unmount', () => {
        mount('<script>a();</script>').componentWillUnmount();
        expect(body).toEqual([]);

        mount('<script>a();</script>');
        expect(ran).toEqual(['a();', 'a();']);
        expect(body).toHaveLength(1);
    });

    it('runs every script of the HTML under its own ID, and nothing without scripts', () => {
        const component = mount('<b>no script</b>');
        expect(ran).toEqual([]);

        update(component, '<script>a();</script><p></p><script>b();</script>');
        expect(body.map(script => script.id)).toEqual(['w000001-0', 'w000001-1']);
        expect(ran).toEqual(['a();', 'b();']);

        update(component, '<b>no script</b>');
        expect(body).toEqual([]);
    });
});
