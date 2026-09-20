import React from 'react';

export default function TbSquareLetterW(props: { style?: React.CSSProperties }): React.JSX.Element {
    return (
        <svg
            viewBox="0 0 24 24"
            style={props.style}
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                stroke="currentColor"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z"
            />
            <path
                stroke="currentColor"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 8l1 8l2 -5l2 5l1 -8"
            />
        </svg>
    );
}
