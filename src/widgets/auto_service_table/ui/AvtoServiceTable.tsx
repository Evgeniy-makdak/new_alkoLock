/* eslint-disable react-hooks/exhaustive-deps */
import { useMediaQuery } from '@mui/material';

import { AvtoServiceDesktopTable } from './AvtoServiceDesktopTable';
import { AvtoServiceMobileTable } from './AvtoServiceMobileTable';

interface AvtoServiceTableProps {
  handleClickRow: (id: string | number, idDevice: string | number) => void;
  onBranchChange: () => void;
  handleCloseAside: () => void;
}

export const AvtoServiceTable = ({
  handleClickRow,
  onBranchChange,
  handleCloseAside,
}: AvtoServiceTableProps) => {
  const isMobile = useMediaQuery('(max-width:768px)');

  if (isMobile) {
    return (
      <AvtoServiceMobileTable handleClickRow={handleClickRow} handleCloseAside={handleCloseAside} />
    );
  }

  return (
    <AvtoServiceDesktopTable
      handleClickRow={handleClickRow}
      onBranchChange={onBranchChange}
      handleCloseAside={handleCloseAside}
    />
  );
};
