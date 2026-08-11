/* eslint-disable react-hooks/exhaustive-deps */
import { useMediaQuery } from '@mui/material';

import { UsersDesktopTable } from './UsersDesktopTable';
import { UsersMobileTable } from './UsersMobileTable';

interface UsersTableProps {
  onRowClick: (id: string | number, isActive: boolean) => void;
  handleCloseAside: () => void;
  onBranchChange: () => void;
  selectedUserId: string | number | null;
  targetPageFromNavigation?: number | null;
  onTargetPageApplied?: () => void;
  /** Не авто-закрывать aside при возврате с карты по координатам. */
  preserveAsideFromMapReturn?: boolean;
  onAddUser: () => void;
  onEditUser: (id: string | number) => void;
  onDeleteUser: (id: string | number, isActive: boolean) => void; // Добавляем isActive
}

export const UsersTable = ({
  onRowClick,
  handleCloseAside,
  onBranchChange,
  selectedUserId,
  targetPageFromNavigation,
  onTargetPageApplied,
  preserveAsideFromMapReturn = false,
  onAddUser,
  onEditUser,
  onDeleteUser,
}: UsersTableProps) => {
  const isMobile = useMediaQuery('(max-width:768px)', { noSsr: true });

  if (isMobile) {
    return (
      <UsersMobileTable
        onRowClick={onRowClick}
        handleCloseAside={handleCloseAside}
        selectedUserId={selectedUserId}
        targetPageFromNavigation={targetPageFromNavigation}
        onTargetPageApplied={onTargetPageApplied}
        preserveAsideFromMapReturn={preserveAsideFromMapReturn}
        onAddUser={onAddUser}
        onEditUser={onEditUser}
        onDeleteUser={onDeleteUser}
      />
    );
  }

  return (
    <UsersDesktopTable
      onRowClick={onRowClick}
      handleCloseAside={handleCloseAside}
      onBranchChange={onBranchChange}
      selectedUserId={selectedUserId}
      targetPageFromNavigation={targetPageFromNavigation}
      onTargetPageApplied={onTargetPageApplied}
      preserveAsideFromMapReturn={preserveAsideFromMapReturn}
    />
  );
};
