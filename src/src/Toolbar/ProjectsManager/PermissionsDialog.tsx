import React from 'react';

import {
    Check as SaveIcon,
} from '@mui/icons-material';
import IODialog from '../../Components/IODialog';

interface PermissionsDialogProps {
    /** Function called when dialog is closed */
    onClose: () => void;
}

export default class PermissionsDialog extends React.Component<PermissionsDialogProps> {
    constructor(props: PermissionsDialogProps) {
        super(props);
    }

    render(): React.JSX.Element {
        return <IODialog
            title="Permissions"
            open={!0}
            onClose={() => this.props.onClose()}
            actionNoClose
            action={() => undefined}
            actionTitle="Save"
            ActionIcon={SaveIcon}
            actionDisabled={false}
            closeDisabled={false}
        >
        </IODialog>;
    }
}
