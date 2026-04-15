import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { SelectedBranchState } from '@shared/model/app_store/AppStore';
import { ID } from '@shared/types/BaseQueryTypes';

import { GroupDesktopTable } from './GroupDesktopTable';
import { GroupMobileTable } from './GroupMobileTable';

type GroupTableProps = {
  handleClickRow: (id: ID) => void;
  onCloseAside: () => void;
  onBranchChange: () => void;
  selectedGroupId: ID | null;
  setState: (data: { selectedBranchState?: SelectedBranchState }) => void;
};

export const GroupTable = ({
  handleClickRow,
  onCloseAside,
  onBranchChange,
  selectedGroupId,
  setState,
}: GroupTableProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });

  if (isMobile) {
    return (
      <GroupMobileTable
        onClickRow={handleClickRow}
        onCloseAside={onCloseAside}
        selectedGroupId={selectedGroupId}
        onBranchChange={onBranchChange}
        setState={setState}
      />
    );
  }

  return (
    <GroupDesktopTable
      handleClickRow={handleClickRow}
      onCloseAside={onCloseAside}
      onBranchChange={onBranchChange}
      selectedGroupId={selectedGroupId}
      setState={setState}
    />
  );
};
