/* eslint-disable react-hooks/exhaustive-deps */
import { useMediaQuery } from '@mui/material';

import { EventsDesktopTable } from './EventsDesktopTable';
import { EventsMobileTable } from './EventsMobileTable';

interface EventsTableProps {
  handleClickRow: (id: string | number) => void;
  handleCloseInfo: () => void;
  selectedEventId?: string | number | null;
  prevBranch?: any;
  openDetailsPanel?: (params: { id: string | number; content: React.ReactNode }) => void;
}

export const EventsTable = ({
  handleClickRow,
  handleCloseInfo,
  selectedEventId,
  prevBranch,
}: EventsTableProps) => {
  const isMobile = useMediaQuery('(max-width:1024px)');

  if (isMobile) {
    return (
      <EventsMobileTable
        handleClickRow={handleClickRow}
        handleCloseInfo={handleCloseInfo}
        selectedEventId={selectedEventId}
        // prevBranch={prevBranch}
      />
    );
  }

  return (
    <EventsDesktopTable
      handleClickRow={handleClickRow}
      handleCloseInfo={handleCloseInfo}
      selectedEventId={selectedEventId}
      prevBranch={prevBranch}
    />
  );
};
