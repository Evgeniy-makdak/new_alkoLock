import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { ID } from '@shared/types/BaseQueryTypes';

import { VehiclesDesktopTable } from './VehiclesDesktopTable';
import { VehiclesMobileTable } from './VehiclesMobileTable';

interface VehiclesTableProps {
  onClickRow: (id: ID) => void;
  handleCloseAside: () => void;
  selectedCarId: ID | null;
  onBranchChange?: () => void;
  prevBranch?: ID;
}

export const VehiclesTable = ({
  onClickRow,
  handleCloseAside,
  selectedCarId,
  onBranchChange,
  prevBranch,
}: VehiclesTableProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (isMobile) {
    return (
      <VehiclesMobileTable
        onClickRow={onClickRow}
        handleCloseAside={handleCloseAside}
        selectedCarId={selectedCarId}
        onBranchChange={onBranchChange}
        prevBranch={prevBranch}
      />
    );
  }

  return (
    <VehiclesDesktopTable
      onClickRow={onClickRow}
      handleCloseAside={handleCloseAside}
      selectedCarId={selectedCarId}
      onBranchChange={onBranchChange}
      prevBranch={prevBranch}
    />
  );
};
