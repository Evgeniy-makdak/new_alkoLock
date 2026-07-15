import { useMediaQuery } from '@mui/material';

import { MpoConfigDesktopTable } from './MpoConfigDesktopTable';
import { MpoConfigMobileTable } from './MpoConfigMobileTable';

export const MpoConfigTable = () => {
  const isMobile = useMediaQuery('(max-width:768px)', { noSsr: true });

  if (isMobile) {
    return <MpoConfigMobileTable />;
  }

  return <MpoConfigDesktopTable />;
};
