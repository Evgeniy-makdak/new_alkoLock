import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { ID } from '@shared/types/BaseQueryTypes';

import { HistoryDesktopTable } from './HistoryDesktopTable';
import { HistoryMobileTable } from './HistoryMobileTable';

interface HistoryTableProps {
  prevBranch: ID;
}

export const HistoryTable = ({ prevBranch }: HistoryTableProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (isMobile) {
    return <HistoryMobileTable prevBranch={prevBranch} />;
  }

  return <HistoryDesktopTable prevBranch={prevBranch} />;
};
