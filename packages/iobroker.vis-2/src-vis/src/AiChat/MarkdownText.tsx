import React from 'react';

import { Box, Link } from '@mui/material';

import { inlineSpans, markdownBlocks, type Block, type Span } from './markdown';

export interface MarkdownTextProps {
    /** The answer, as far as it has arrived */
    text: string;
}

/** A word in backticks, and a block of code: both stand out by their background, not by a frame */
const CODE_BACKGROUND = 'action.selected';

/** The size of a heading, by its level; a panel this narrow has no room for a third size above the text */
const HEADING_SIZE = [15.5, 14.5, 14];

/** The pieces of one line, as elements */
function renderSpans(text: string): React.ReactNode[] {
    return inlineSpans(text).map((span: Span, index: number) => {
        switch (span.kind) {
            case 'bold':
                return <strong key={index}>{span.text}</strong>;

            case 'italic':
                return <em key={index}>{span.text}</em>;

            case 'code':
                return (
                    <Box
                        key={index}
                        component="code"
                        sx={{
                            px: 0.5,
                            borderRadius: 0.75,
                            bgcolor: CODE_BACKGROUND,
                            fontFamily: 'monospace',
                            fontSize: '0.92em',
                        }}
                    >
                        {span.text}
                    </Box>
                );

            case 'link':
                return (
                    <Link
                        key={index}
                        href={span.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="inherit"
                        sx={{ textDecorationThickness: 1 }}
                    >
                        {span.text}
                    </Link>
                );

            default:
                return <React.Fragment key={index}>{span.text}</React.Fragment>;
        }
    });
}

/** One block, as an element */
function renderBlock(block: Block, index: number): React.JSX.Element {
    switch (block.kind) {
        case 'heading':
            return (
                <Box
                    key={index}
                    sx={{ fontSize: HEADING_SIZE[block.level - 1], fontWeight: 700, lineHeight: 1.3 }}
                >
                    {renderSpans(block.text)}
                </Box>
            );

        case 'list':
            return (
                <Box
                    key={index}
                    component={block.ordered ? 'ol' : 'ul'}
                    sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}
                >
                    {block.items.map((item, at) => (
                        <li key={at}>{renderSpans(item)}</li>
                    ))}
                </Box>
            );

        case 'code':
            return (
                <Box
                    key={index}
                    component="pre"
                    sx={{
                        m: 0,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: CODE_BACKGROUND,
                        // code is the one thing that must not be broken across lines to fit a narrow panel
                        overflowX: 'auto',
                        fontFamily: 'monospace',
                        fontSize: 12.5,
                        lineHeight: 1.4,
                    }}
                >
                    {block.text}
                </Box>
            );

        case 'quote':
            return (
                <Box
                    key={index}
                    sx={{
                        pl: 1,
                        borderLeft: 3,
                        borderColor: 'divider',
                        opacity: 0.85,
                        whiteSpace: 'pre-wrap',
                    }}
                >
                    {renderSpans(block.text)}
                </Box>
            );

        default:
            return (
                <Box
                    key={index}
                    sx={{ whiteSpace: 'pre-wrap' }}
                >
                    {renderSpans(block.text)}
                </Box>
            );
    }
}

/**
 * The answer of the assistant, as what it was written as.
 *
 * A model answers in Markdown whether it is asked to or not, and a chat that shows `**Schalter-Widget**` with
 * its asterisks makes the reader do the parsing. The parsing is in `markdown.ts`; this builds the elements -
 * no HTML string anywhere, so text from a model cannot become markup of its own.
 *
 * @param props - the answer, as far as it has arrived
 */
export default function MarkdownText(props: MarkdownTextProps): React.JSX.Element {
    // every token of a streamed answer parses it again, which for a page of text is nothing worth caching
    const blocks = markdownBlocks(props.text);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, wordBreak: 'break-word' }}>
            {blocks.map(renderBlock)}
        </Box>
    );
}
