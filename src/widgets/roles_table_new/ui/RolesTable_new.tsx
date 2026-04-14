import { useMediaQuery } from '@mui/material';

import { ID } from '@shared/types/BaseQueryTypes';

import { RoleDesktopTable } from './RoleDesktopTable';
import { RoleMobileTable } from './RoleMobileTable';

interface RolesTableProps {
  prevBranch?: string | number;
  onRoleClick?: (id: ID) => void;
  selectedRoleId?: ID | null;
}

export const RolesTable_new = ({ prevBranch, onRoleClick, selectedRoleId }: RolesTableProps) => {
  const isMobile = useMediaQuery('(max-width:768px)');

  if (isMobile) {
    return <RoleMobileTable onRoleClick={onRoleClick} selectedRoleId={selectedRoleId} />;
  }

  return <RoleDesktopTable prevBranch={prevBranch} />;
};
