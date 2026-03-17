/* eslint-disable react-hooks/exhaustive-deps */
import { useMediaQuery } from '@mui/material';

import { EventsDesktopTable } from './EventsDesktopTable';
import { EventsMobileTable } from './EventsMobileTable';

interface EventsTableProps {
  handleClickRow: (id: string | number) => void;
  handleCloseInfo: () => void;
  prevBranch?: any;
  openDetailsPanel?: (params: { id: string | number; content: React.ReactNode }) => void;
}

export const EventsTable = ({ handleClickRow, handleCloseInfo, prevBranch }: EventsTableProps) => {
  const isMobile = useMediaQuery('(max-width:1024px)');

  if (isMobile) {
    return (
      <EventsMobileTable
        handleClickRow={handleClickRow}
        handleCloseInfo={handleCloseInfo}
        // prevBranch={prevBranch}
      />
    );
  }

  return (
    <EventsDesktopTable
      handleClickRow={handleClickRow}
      handleCloseInfo={handleCloseInfo}
      prevBranch={prevBranch}
    />
  );
};
