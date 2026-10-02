import React from 'react';

import { type Liquid, liquidPath } from './liquid';

export interface LiquidFillProps extends Liquid {
    /** The colour of what fills the box */
    color: string;
    /** How much of it shows through; a marker lies on a picture and is kept light */
    opacity?: number;
}

/**
 * What fills a box up to a level: the liquid of a tank, the light of a dimmer, the slat of a blind.
 *
 * It lies over the whole box and is drawn to it, so whoever uses it only has to make that box the one that
 * should be filled - `position: relative` and `overflow: hidden`, and the corners of the box clip the level.
 *
 * @param props - how full it stands, in which colour, and whether its surface is a wave
 */
export default function LiquidFill(props: LiquidFillProps): React.JSX.Element | null {
    const path = liquidPath(props);
    if (!path) {
        return null;
    }

    return (
        <svg
            viewBox="0 0 100 100"
            // the level follows the box it is in, which is rarely square
            preserveAspectRatio="none"
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 0,
            }}
        >
            <path
                d={path}
                fill={props.color}
                opacity={props.opacity}
                // the level moves to where it now stands instead of jumping there
                style={{ transition: 'd 0.4s' }}
            />
        </svg>
    );
}
