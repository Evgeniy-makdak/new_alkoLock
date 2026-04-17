import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { ID } from '@shared/types/BaseQueryTypes';

import { AlkolocksDesktopTable } from './AlkolocksDesktopTable';
import { AlkolocksMobileTable } from './AlkolocksMobileTable';

interface AlkolocksTableProps {
  handleClickRow: (id: ID) => void;
  handleCloseAside: () => void;
  selectedAlcolockId: ID | null;
  targetPageFromNavigation?: number | null;
  onTargetPageApplied?: () => void;
  onBranchChange?: () => void;
  prevBranch?: ID;
}

export const AlkolocksTable = ({
  handleClickRow,
  handleCloseAside,
  selectedAlcolockId,
  targetPageFromNavigation,
  onTargetPageApplied,
  onBranchChange,
  prevBranch,
}: AlkolocksTableProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });

  if (isMobile) {
    return (
      <AlkolocksMobileTable
        onClickRow={handleClickRow}
        handleCloseAside={handleCloseAside}
        selectedAlcolockId={selectedAlcolockId}
        targetPageFromNavigation={targetPageFromNavigation}
        onTargetPageApplied={onTargetPageApplied}
        onBranchChange={onBranchChange}
        prevBranch={prevBranch}
      />
    );
  }

  return (
    <AlkolocksDesktopTable
      handleClickRow={handleClickRow}
      handleCloseAside={handleCloseAside}
      selectedAlcolockId={selectedAlcolockId}
      targetPageFromNavigation={targetPageFromNavigation}
      onTargetPageApplied={onTargetPageApplied}
      prevBranch={prevBranch}
    />
  );
};
