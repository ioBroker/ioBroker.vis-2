/** How full something stands, and what its surface looks like */
export interface Liquid {
    /** How full, from 0 to 100 */
    share: number;
    /** Which end it stands against: a tank fills from below, a blind covers from above */
    from?: 'bottom' | 'top';
    /** The surface is a wave, as that of a liquid is; a blind and a lamp have a straight edge */
    wave?: boolean;
}

/** How far the wave rises over its line, in hundredths of the box */
const AMPLITUDE = 2.6;

/**
 * How far the wave may swing at this level.
 *
 * A full tank whose surface waves has dark notches bitten out of its top, and an empty one a blue line
 * wriggling along its floor. So the swing is taken back towards both ends and the surface lies flat there,
 * which is also what a nearly full tank looks like.
 *
 * @param share - how full it stands, from 0 to 100
 */
function amplitudeAt(share: number): number {
    return AMPLITUDE * Math.min(1, share / 6, (100 - share) / 6);
}

/**
 * The outline of what fills a box, for an SVG of 100 by 100 drawn with `preserveAspectRatio="none"`.
 *
 * The box is 100 by 100 whatever shape the widget has, so one path serves a marker that was dragged tall,
 * one that was dragged wide and the bar of a card alike - the browser stretches it, and a wave that is
 * stretched is still a wave. Nothing here measures anything.
 *
 * @param liquid - how full it stands, against which end, and whether its surface is a wave
 * @returns the path, or an empty string where there is nothing to draw
 */
export function liquidPath(liquid: Liquid): string {
    const share = Math.max(0, Math.min(100, liquid.share));
    if (share <= 0) {
        return '';
    }

    const fromTop = liquid.from === 'top';
    // the surface, measured from the top of the box in both cases
    const y = fromTop ? share : 100 - share;
    const a = liquid.wave ? amplitudeAt(share) : 0;
    const at = (value: number): string => value.toFixed(1);

    // one full wave across the width: up, down, up, down
    const surface =
        `M0 ${at(y)} C 16.7 ${at(y - a)} 33.3 ${at(y + a)} 50 ${at(y)} ` +
        `C 66.7 ${at(y - a)} 83.3 ${at(y + a)} 100 ${at(y)}`;

    // and back around the end it stands against
    return fromTop ? `${surface} L100 0 L0 0 Z` : `${surface} L100 100 L0 100 Z`;
}
