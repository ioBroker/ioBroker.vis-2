import React from 'react';
import { Button } from '@mui/material';
import { I18n } from '@iobroker/adapter-react-v5';

import { type MarketplaceDialogProps } from './MarketplaceDialog';

interface MarketplacePaletteProps {
    setMarketplaceDialog: (props: Partial<MarketplaceDialogProps>) => void;
}

const MarketplacePalette = (props: MarketplacePaletteProps): React.JSX.Element => (
    <Button
        variant="contained"
        color="primary"
        onClick={() => props.setMarketplaceDialog({})}
    >
        {I18n.t('Open widgeteria')}
    </Button>
);

export default MarketplacePalette;
