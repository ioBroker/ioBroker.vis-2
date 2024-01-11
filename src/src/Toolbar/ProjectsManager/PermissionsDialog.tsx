import React from 'react';

import {
    Check as SaveIcon,
} from '@mui/icons-material';
import type { Connection } from '@iobroker/adapter-react-v5';
import IODialog from '../../Components/IODialog';

interface PermissionsDialogProps {
    /** Function called when dialog is closed */
    onClose: () => void;
    /** The socket connection */
    socket: Connection;
}

export default class PermissionsDialog extends React.Component<PermissionsDialogProps> {
    /**
     * Contains
     */
    users: string[] = [];

    /**
     * Lifecycle hook called when component is mounted
     */
    async componentDidMount(): Promise<void> {
        const userView: Record<string, ioBroker.UserObject> = await this.props.socket.getObjectViewSystem('user', 'system.user.', 'system.user.\u9999');
        this.users = Object.keys(userView);

        console.info(`Existing users: ${this.users.join(', ')}`);
    }

    /**
     * Render the actual component
     */
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
