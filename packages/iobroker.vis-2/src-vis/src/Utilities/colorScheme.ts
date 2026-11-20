/**
 * Keeps an Android WebView - the Fully Kiosk Browser - from darkening the page on its own.
 *
 * In the dark mode of the device or of the app, a WebView darkens every page that declares no dark color
 * scheme: a light grey button turns dark grey and the dark icon on it white. The vis-1 widgets (hqwidgets,
 * jqui-mfd) came out with swapped colors that way, while Chrome on the same tablet showed them right. In 2.15
 * MUI happened to prevent it: in the dark theme it declared `color-scheme: dark` on `:root`, and that went
 * with #661 in 2.20, because it made iframes opaque.
 *
 * `only light` forbids the darkening and paints exactly like no declaration otherwise, so an iframe stays
 * transparent in every browser. It must be a rule on `:root`:
 * - not the `style` of `<html>`: the view writes its background there and drops everything else (`VisView`);
 * - not `<meta name="color-scheme">`: an iframe with `color-scheme: normal` (index.css) takes the scheme of the
 *   meta then, and a darkening WebView paints an opaque backdrop behind the iframe again.
 *
 * Put first into `<head>`, so CSS of the project that sets a `color-scheme` on `:root` still wins.
 *
 * Not for a page in an iframe: its scheme has to match the one of the iframe element in the parent page, or the
 * browser paints an opaque backdrop behind it.
 */
export function preventForcedDarkening(): void {
    if (document.getElementById('vis-color-scheme')) {
        return;
    }
    const style = document.createElement('style');
    style.id = 'vis-color-scheme';
    style.textContent = ':root { color-scheme: only light; }';
    document.head.prepend(style);
}
