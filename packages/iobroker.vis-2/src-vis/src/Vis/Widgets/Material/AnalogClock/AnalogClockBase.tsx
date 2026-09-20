// Source: https://github.com/mukanov8/analog-clock/blob/main/src/components/AnalogClockBase.tsx
/*
MIT License

Copyright (c) 2022 Ayan Mukanov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

import React, { Component, type CSSProperties } from 'react';

const TIME_DEGREE_OFFSET = 90;
const calculateHourLabelDegree = (labelIndex: number): number => labelIndex * 30 - TIME_DEGREE_OFFSET;
const calculateTickLabelDegree = (labelIndex: number): number => labelIndex * 6;

export const HOUR_LABELS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const styles: Record<string, CSSProperties> = {
    analogClockBase: {
        borderRadius: '50%',
        borderStyle: 'solid',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    analogClockBaseCenter: {
        borderRadius: '50%',
        zIndex: 2,
    },
    tickLabel: {
        position: 'absolute',
        borderRadius: 2,
        transformOrigin: 'center',
    },
    hourLabel: {
        position: 'absolute',
        display: 'flex',
        transformOrigin: 'center',
    },
    hourLabelSpan: {
        fontWeight: 500,
    },
};

interface AnalogClockBaseProps {
    backgroundColor: string;
    ticksColor: string;
    showNumbers: boolean;
    size: number;
    withSeconds: boolean;
    secondHandColor: string;
    handsColor: string;
    children: React.ReactNode;
}

class AnalogClockBase extends Component<AnalogClockBaseProps> {
    render(): React.JSX.Element {
        const labelSize = Math.round(0.064 * this.props.size);
        const tickSize = Math.round(0.036 * this.props.size);

        return (
            <div
                style={{
                    ...styles.analogClockBase,
                    width: this.props.size,
                    height: this.props.size,
                    backgroundColor: this.props.backgroundColor,
                    borderColor: this.props.ticksColor,
                    borderWidth: this.props.size * 0.012,
                }}
            >
                <div
                    style={{
                        ...styles.analogClockBaseCenter,
                        backgroundColor: this.props.withSeconds ? this.props.secondHandColor : this.props.handsColor,
                        width: this.props.size * 0.05,
                        height: this.props.size * 0.05,
                    }}
                />
                {Array.from(Array(60)).map((_, index) => (
                    <div
                        style={{
                            ...styles.tickLabel,
                            width: index % 5 ? Math.round(tickSize / 2) : tickSize,
                            height: index % 5 ? Math.round(tickSize / 9) : Math.round(tickSize / 3),
                            backgroundColor: this.props.ticksColor,
                            transform: `rotate(${calculateTickLabelDegree(index)}deg) translateX(${this.props.size * 0.46}px)`,
                        }}
                        key={index.toString()}
                    />
                ))}

                {this.props.showNumbers &&
                    HOUR_LABELS.map((label, index) => (
                        <div
                            key={label.toString() + index.toString()}
                            style={{
                                ...styles.hourLabel,
                                color: this.props.ticksColor,
                                transform: `rotate(${calculateHourLabelDegree(index)}deg) translateX(${this.props.size * 0.4}px)`,
                            }}
                        >
                            <span
                                style={{
                                    ...styles.hourLabelSpan,
                                    transform: `rotate(${-1 * calculateHourLabelDegree(index)}deg)`,
                                    fontSize: labelSize,
                                }}
                            >
                                {label}
                            </span>
                        </div>
                    ))}
                {this.props.children}
            </div>
        );
    }
}

export default AnalogClockBase;
