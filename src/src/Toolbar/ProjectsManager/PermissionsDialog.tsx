import React from 'react';

import {
    Check as SaveIcon,
} from '@mui/icons-material';
import {
    Checkbox,
} from '@mui/material';
import { type Connection, I18n } from '@iobroker/adapter-react-v5';
import type { Permissions } from '@/types';
import { store } from '@/Store';
import IODialog from '../../Components/IODialog';

interface PermissionsDialogProps {
    /** Function called when dialog is closed */
    onClose: () => void;
    /** The socket connection */
    socket: Connection;
}

interface PermissionsDialogState {
    /** Contains all existing users */
    users: string[];
    /** Permissions for each user for the current project */
    projectPermissions: Map<string, Permissions>;
}

export default class PermissionsDialog extends React.Component<PermissionsDialogProps, PermissionsDialogState> {
    constructor(props: PermissionsDialogProps) {
        super(props);

        this.state = {
            users: [],
            projectPermissions: new Map(),
        };
    }

    /**
     * Lifecycle hook called when component is mounted
     */
    async componentDidMount(): Promise<void> {
        const userView: Record<string, ioBroker.UserObject> = await this.props.socket.getObjectViewSystem('user', 'system.user.', 'system.user.\u9999');
        const { visProject } = store.getState();
        const projectPermissions = new Map<string, Permissions>();

        for (const user of Object.keys(userView)) {
            projectPermissions.set(user, visProject.___settings.permissions?.[user] ?? { read: true, write: true });
        }

        this.setState({ users: Object.keys(userView), projectPermissions });
    }

    /**
     * On save temporary values are set to the store
     */
    onSave(): void {
        // TODO: call changeProject with the modified project
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
            {this.state.users.map(user => <div>
                {`${user}:`}
                <Checkbox
                    checked={this.state.projectPermissions.get(user)?.read}
                    onClick={() => {
                        const newState = this.state;
                        const currVal = this.state.projectPermissions.get(user);

                        newState.projectPermissions.set(user, { read: !currVal?.read, write: !!currVal?.write });
                        this.setState(newState);
                    }}
                />
                {I18n.t('Read')}
                <Checkbox
                    checked={this.state.projectPermissions.get(user)?.write}
                    onClick={() => {
                        const newState = this.state;
                        const currVal = this.state.projectPermissions.get(user);

                        newState.projectPermissions.set(user, { read: !!currVal?.read, write: !currVal?.write });
                        this.setState(newState);
                    }}
                />
                {I18n.t('Write')}
            </div>)}
        </IODialog>;
    }
}
