import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { ID } from '@shared/types/BaseQueryTypes';

import { RoleDesktopTable } from './RoleDesktopTable';
import { RoleMobileTable } from './RoleMobileTable';

interface RolesTableProps {
  prevBranch?: string | number;
  onRoleClick?: (id: ID) => void;
  selectedRoleId?: ID | null;
}

export const RolesTable_new = ({ prevBranch, onRoleClick, selectedRoleId }: RolesTableProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (isMobile) {
    return <RoleMobileTable onRoleClick={onRoleClick} selectedRoleId={selectedRoleId} />;
  }

  return <RoleDesktopTable prevBranch={prevBranch} />;
};
