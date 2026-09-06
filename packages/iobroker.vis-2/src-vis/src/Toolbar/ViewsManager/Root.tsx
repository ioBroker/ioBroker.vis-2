import { useDroppable } from '@dnd-kit/core';
import React, { useEffect } from 'react';

import { I18n } from '@iobroker/gui-components';
import { store } from '../../Store';
import { canDropInto, useDraggedItem, type ViewsDropData } from './viewsDnd';

interface RootProps {
    setIsOverRoot: (isOver: boolean) => void;
    isDragging: string;
}

const Root: React.FC<RootProps> = props => {
    const dragged = useDraggedItem();
    const canDrop = !!dragged && canDropInto(dragged, null, store.getState().visProject);

    const { isOver, setNodeRef } = useDroppable({
        id: 'views-root',
        disabled: !canDrop,
        data: { kind: 'viewsTarget', folder: null } satisfies ViewsDropData,
    });

    useEffect(() => {
        props.setIsOverRoot(isOver && canDrop);
    }, [isOver, canDrop]);

    return props.isDragging && canDrop ? (
        <div ref={setNodeRef}>
            <div style={{ height: 34, width: 'calc(100% - 7px)', opacity: 0.7 }}>
                {I18n.t('Drop here to add to root')}
            </div>
        </div>
    ) : null;
};

export default Root;
