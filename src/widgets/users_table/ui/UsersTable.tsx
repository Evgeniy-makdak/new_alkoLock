/* eslint-disable react-hooks/exhaustive-deps */
import { useMediaQuery } from '@mui/material';

import { UsersDesktopTable } from './UsersDesktopTable';
import { UsersMobileTable } from './UsersMobileTable';

interface UsersTableProps {
  onRowClick: (id: string | number, isActive: boolean) => void;
  handleCloseAside: () => void;
  onBranchChange: () => void;
  selectedUserId: string | number | null;
  onAddUser: () => void;
  onEditUser: (id: string | number) => void;
  onDeleteUser: (id: string | number, isActive: boolean) => void; // Добавляем isActive
}

export const UsersTable = ({
  onRowClick,
  handleCloseAside,
  onBranchChange,
  selectedUserId,
  onAddUser,
  onEditUser,
  onDeleteUser,
}: UsersTableProps) => {
  const isMobile = useMediaQuery('(max-width:768px)');

  if (isMobile) {
    return (
      <UsersMobileTable
        onRowClick={onRowClick}
        handleCloseAside={handleCloseAside}
        selectedUserId={selectedUserId}
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
    />
  );
};
