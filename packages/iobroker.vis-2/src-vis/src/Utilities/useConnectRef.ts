import { useCallback } from 'react';
import type { ConnectDragSource, ConnectDropTarget } from 'react-dnd';

/**
 * Makes a connector of react-dnd usable as a `ref` under react 19.
 *
 * React 19 takes whatever a ref callback returns as its cleanup function. The connectors of react-dnd return the
 * react element they were handed, so react would keep that element and try to call it when the component
 * unmounts. Wrapping the connector so that it returns nothing is what turns it back into a valid ref.
 *
 * The wrapper is memoized on the connector instead of being written inline at the call site: an inline arrow is a
 * new function on every render, which makes react detach the ref and attach it again - and every detach hands the
 * connector a `null`, which disconnects the drag source in the middle of a drag.
 *
 * @param connector - `dragRef` or `drop` as returned by `useDrag()` / `useDrop()`
 * @returns A ref callback that returns nothing
 */
export default function useConnectRef<T extends Element>(
    connector: ConnectDragSource | ConnectDropTarget,
): (node: T | null) => void {
    return useCallback(
        (node: T | null): void => {
            connector(node);
        },
        [connector],
    );
}
