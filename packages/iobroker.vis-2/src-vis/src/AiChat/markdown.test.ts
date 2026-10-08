import { describe, expect, it } from 'vitest';

import { inlineSpans, markdownBlocks } from './markdown';

describe('inlineSpans', () => {
    it('keeps a plain line as it is', () => {
        expect(inlineSpans('Für Anwesenheit gibt es drei Wege')).toEqual([
            { kind: 'text', text: 'Für Anwesenheit gibt es drei Wege' },
        ]);
    });

    it('reads bold, code and the text between them', () => {
        expect(inlineSpans('**Schalter** (`tplRelSwitch`)')).toEqual([
            { kind: 'bold', text: 'Schalter' },
            { kind: 'text', text: ' (' },
            { kind: 'code', text: 'tplRelSwitch' },
            { kind: 'text', text: ')' },
        ]);
    });

    it('reads italic with either marker', () => {
        expect(inlineSpans('*so* und _so_')).toEqual([
            { kind: 'italic', text: 'so' },
            { kind: 'text', text: ' und ' },
            { kind: 'italic', text: 'so' },
        ]);
    });

    it('leaves the underscores of an object id alone', () => {
        expect(inlineSpans('0_userdata.0.claude.light1')).toEqual([
            { kind: 'text', text: '0_userdata.0.claude.light1' },
        ]);
    });

    it('leaves a multiplication alone', () => {
        expect(inlineSpans('3 * 4 * 5')).toEqual([{ kind: 'text', text: '3 * 4 * 5' }]);
    });

    it('keeps a marker that never closes as the characters it is', () => {
        expect(inlineSpans('**Schalter')).toEqual([{ kind: 'text', text: '**Schalter' }]);
        expect(inlineSpans('a `tplRel')).toEqual([{ kind: 'text', text: 'a `tplRel' }]);
    });

    it('reads a link', () => {
        expect(inlineSpans('siehe [die Doku](https://iobroker.net/) dort')).toEqual([
            { kind: 'text', text: 'siehe ' },
            { kind: 'link', text: 'die Doku', href: 'https://iobroker.net/' },
            { kind: 'text', text: ' dort' },
        ]);
    });

    it('refuses an address a browser should not follow', () => {
        expect(inlineSpans('[klick](javascript:alert(1))')).toEqual([
            { kind: 'text', text: '[klick](javascript:alert(1))' },
        ]);
    });

    it('does not read into an unfinished marker across the whole answer', () => {
        // the closing ` of the next line is not the closing one of this
        expect(inlineSpans('`tplRelSwitch` und `tplAbsSwitch`')).toEqual([
            { kind: 'code', text: 'tplRelSwitch' },
            { kind: 'text', text: ' und ' },
            { kind: 'code', text: 'tplAbsSwitch' },
        ]);
    });
});

describe('markdownBlocks', () => {
    it('makes one paragraph of lines that belong together', () => {
        expect(markdownBlocks('erste Zeile\nzweite Zeile')).toEqual([
            { kind: 'paragraph', text: 'erste Zeile\nzweite Zeile' },
        ]);
    });

    it('separates paragraphs at a blank line', () => {
        expect(markdownBlocks('eins\n\nzwei')).toEqual([
            { kind: 'paragraph', text: 'eins' },
            { kind: 'paragraph', text: 'zwei' },
        ]);
    });

    it('reads a heading and clamps it to three levels', () => {
        expect(markdownBlocks('# oben\n##### tief')).toEqual([
            { kind: 'heading', level: 1, text: 'oben' },
            { kind: 'heading', level: 3, text: 'tief' },
        ]);
    });

    it('reads a bulleted list that follows a line without a blank line between', () => {
        expect(markdownBlocks('**Schalter**\n- für Boolean\n- zeigt An oder Aus')).toEqual([
            { kind: 'paragraph', text: '**Schalter**' },
            { kind: 'list', ordered: false, items: ['für Boolean', 'zeigt An oder Aus'] },
        ]);
    });

    it('reads a numbered list and keeps it apart from a bulleted one', () => {
        expect(markdownBlocks('1. eins\n2) zwei\n- drei')).toEqual([
            { kind: 'list', ordered: true, items: ['eins', 'zwei'] },
            { kind: 'list', ordered: false, items: ['drei'] },
        ]);
    });

    it('hangs an indented line on the item above it', () => {
        expect(markdownBlocks('- der Schalter\n  schreibt sofort')).toEqual([
            { kind: 'list', ordered: false, items: ['der Schalter schreibt sofort'] },
        ]);
    });

    it('reads a fenced code block with its language', () => {
        expect(markdownBlocks('so:\n```json\n{ "a": 1 }\n```\nfertig')).toEqual([
            { kind: 'paragraph', text: 'so:' },
            { kind: 'code', language: 'json', text: '{ "a": 1 }' },
            { kind: 'paragraph', text: 'fertig' },
        ]);
    });

    it('takes a fence that is still being written to the end of what there is', () => {
        expect(markdownBlocks('```\nconst a =')).toEqual([{ kind: 'code', language: '', text: 'const a =' }]);
    });

    it('reads a quote', () => {
        expect(markdownBlocks('> erst lesen\n> dann bauen')).toEqual([
            { kind: 'quote', text: 'erst lesen\ndann bauen' },
        ]);
    });

    it('answers nothing with nothing', () => {
        expect(markdownBlocks('')).toEqual([]);
        expect(markdownBlocks('   \n\n  ')).toEqual([]);
    });

    it('reads the answer of the screenshot', () => {
        const answer =
            'Für **Anwesenheit** haben Sie mehrere Möglichkeiten:\n' +
            '\n' +
            '**1. Schalter-Widget** (`tplRelSwitch` / `tplAbsSwitch`)\n' +
            '- Wenn Ihre Anwesenheit als Boolean gespeichert ist\n' +
            '- Zeigt "Anwesend" oder "Abwesend" an\n' +
            '\n' +
            '**2. Sensor-Widget** (`tplRelSensor`)\n' +
            '- Kann als "Alarm" markiert werden\n';

        expect(markdownBlocks(answer).map(block => block.kind)).toEqual([
            'paragraph',
            'paragraph',
            'list',
            'paragraph',
            'list',
        ]);
    });
});
