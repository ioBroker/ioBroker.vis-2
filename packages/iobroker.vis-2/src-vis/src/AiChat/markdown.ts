/**
 * As much Markdown as an answer of the assistant is made of, and not a line more.
 *
 * A model writes `**Schalter-Widget**`, a datapoint in backticks and a list of three dashes, and a chat that
 * shows that as it stands makes the reader do the parsing. The whole of Markdown is not needed for it -
 * tables, images, footnotes and raw HTML never arrive - so this is a parser of the handful of things that
 * do: paragraphs, headings, lists, quotes, fenced code, and inside a line bold, italic, code and links.
 *
 * It parses to data, not to HTML. What comes back from a model is text of unknown origin, and a renderer
 * that builds elements out of these pieces cannot be talked into anything, while one that hands a string to
 * `dangerouslySetInnerHTML` has to be guarded forever.
 *
 * An answer arrives a token at a time, so every unfinished thing has to read as itself: a `**` without its
 * closing pair is two asterisks, a fence that has not been closed yet is a code block to the end of what
 * there is. Nothing here throws, and nothing waits for a terminator that may never come.
 */

/** A piece of a line */
export type Span =
    | { kind: 'text' | 'bold' | 'italic' | 'code'; text: string }
    | { kind: 'link'; text: string; href: string };

/** A piece of an answer */
export type Block =
    | { kind: 'paragraph'; text: string }
    | { kind: 'heading'; level: number; text: string }
    | { kind: 'list'; ordered: boolean; items: string[] }
    | { kind: 'code'; text: string; language: string }
    | { kind: 'quote'; text: string };

/** Only an address a browser may follow: a model is not allowed to write `javascript:` into a page */
const SAFE_HREF = /^(https?:\/\/|mailto:|#|\/)/i;

/** A letter or a digit, which turns a `*` or a `_` beside it into one of the characters of a word */
function isWord(char: string | undefined): boolean {
    return !!char && /[\p{L}\p{N}]/u.test(char);
}

/** Where the marker closes again, or -1: an empty pair is two characters and not an empty word */
function closing(text: string, marker: string, from: number): number {
    const at = text.indexOf(marker, from);
    return at > from ? at : -1;
}

/**
 * One line of Markdown, as the pieces it is made of.
 *
 * The markers are read left to right, and one that does not close is kept as the characters it is - which is
 * what a half-written answer consists of. Nothing nests: `**bold with `code` in it**` becomes bold, then
 * code, then bold again, which reads the same and costs a tenth of the code.
 *
 * @param text - the line, as the model wrote it
 */
export function inlineSpans(text: string): Span[] {
    const spans: Span[] = [];
    let plain = '';
    let at = 0;

    const flush = (): void => {
        if (plain) {
            spans.push({ kind: 'text', text: plain });
            plain = '';
        }
    };

    while (at < text.length) {
        const char = text[at];

        if (char === '`') {
            const end = closing(text, '`', at + 1);
            if (end > 0) {
                flush();
                spans.push({ kind: 'code', text: text.slice(at + 1, end) });
                at = end + 1;
                continue;
            }
        } else if ((char === '*' || char === '_') && text[at + 1] === char) {
            const end = closing(text, char + char, at + 2);
            if (end > 0) {
                flush();
                spans.push({ kind: 'bold', text: text.slice(at + 2, end) });
                at = end + 2;
                continue;
            }
        } else if ((char === '*' || char === '_') && !isWord(text[at - 1])) {
            // `3 * 4 * 5` is a sum and `vis_2_widgets_standard` is a word: a marker needs a word behind it
            const end = closing(text, char, at + 1);
            if (end > 0 && text[at + 1] !== ' ' && !isWord(text[end + 1])) {
                flush();
                spans.push({ kind: 'italic', text: text.slice(at + 1, end) });
                at = end + 1;
                continue;
            }
        } else if (char === '[') {
            const label = text.indexOf(']', at + 1);
            const open = label > at + 1 && text[label + 1] === '(' ? label + 1 : -1;
            const end = open > 0 ? text.indexOf(')', open + 1) : -1;
            const href = end > open + 1 ? text.slice(open + 1, end).trim() : '';
            if (href && SAFE_HREF.test(href)) {
                flush();
                spans.push({ kind: 'link', text: text.slice(at + 1, label), href });
                at = end + 1;
                continue;
            }
        }

        plain += char;
        at++;
    }

    flush();
    return spans;
}

const HEADING = /^\s{0,3}(#{1,6})\s+(.*)$/;
const BULLET = /^\s{0,3}[-*+•]\s+(.*)$/;
const ORDERED = /^\s{0,3}\d{1,3}[.)]\s+(.*)$/;
const FENCE = /^\s{0,3}```(.*)$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;

/**
 * An answer, as the blocks it is made of.
 *
 * Inside a paragraph the line breaks are kept. In Markdown a single break is a space, but this is a chat:
 * somebody who writes two lines means two lines, and a model writing an address under a name means it too.
 *
 * @param source - the answer, as far as it has arrived
 */
export function markdownBlocks(source: string): Block[] {
    const lines = (source || '').replace(/\r\n?/g, '\n').split('\n');
    const blocks: Block[] = [];
    let paragraph: string[] = [];
    let quote: string[] = [];
    let list: { ordered: boolean; items: string[] } | null = null;

    const endParagraph = (): void => {
        if (paragraph.length) {
            blocks.push({ kind: 'paragraph', text: paragraph.join('\n') });
            paragraph = [];
        }
    };
    const endQuote = (): void => {
        if (quote.length) {
            blocks.push({ kind: 'quote', text: quote.join('\n') });
            quote = [];
        }
    };
    const endList = (): void => {
        if (list) {
            blocks.push({ kind: 'list', ordered: list.ordered, items: list.items });
            list = null;
        }
    };
    const endAll = (): void => {
        endParagraph();
        endQuote();
        endList();
    };

    for (let at = 0; at < lines.length; at++) {
        const line = lines[at];

        const fence = FENCE.exec(line);
        if (fence) {
            endAll();
            const code: string[] = [];
            // to the closing fence, or - while the answer is still being written - to the end of it
            for (at++; at < lines.length && !FENCE.test(lines[at]); at++) {
                code.push(lines[at]);
            }
            blocks.push({ kind: 'code', text: code.join('\n'), language: fence[1].trim() });
            continue;
        }

        if (!line.trim()) {
            endAll();
            continue;
        }

        const heading = HEADING.exec(line);
        if (heading) {
            endAll();
            // deeper than three reads like a normal line in a box this narrow
            blocks.push({ kind: 'heading', level: Math.min(heading[1].length, 3), text: heading[2].trim() });
            continue;
        }

        const quoted = QUOTE.exec(line);
        if (quoted) {
            endParagraph();
            endList();
            quote.push(quoted[1]);
            continue;
        }

        const bullet = BULLET.exec(line);
        const ordered = ORDERED.exec(line);
        if (bullet || ordered) {
            endParagraph();
            endQuote();
            if (!list || list.ordered !== !!ordered) {
                endList();
                list = { ordered: !!ordered, items: [] };
            }
            list.items.push((ordered ? ordered[1] : bullet![1]).trim());
            continue;
        }

        if (list && /^\s{2,}\S/.test(line)) {
            // an indented line under an item belongs to that item
            list.items[list.items.length - 1] += ` ${line.trim()}`;
            continue;
        }

        endList();
        endQuote();
        paragraph.push(line);
    }

    endAll();
    return blocks;
}
