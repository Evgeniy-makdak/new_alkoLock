import type { FC } from 'react';

import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import { Chip, Tooltip, type TooltipProps } from '@mui/material';

import { BranchSelect } from '@entities/branch_select';
import { testids } from '@shared/const/testid';

import { useNavbarBranchSelect } from '../hooks/useNavbarBranchSelect';

/**
 * @prop isCollops - при схлопывании меню этот флаг говорит о том,
 *       что нужно показывать только иконку и при наведении на нее tooltip с выбранным филиалом
 * @prop tooltipProps - все стандартные пропсы tooltip кроме title - он уже использован и даже если передать
 * его то он не будет использован. Тоже самое с children - он уже есть у tooltip
 */
type NavbarBranchSelectProps = {
  isCollops?: boolean;
  tooltipProps?: Omit<TooltipProps, 'title' | 'children'>;
};
const LABEL = 'Филиал';
export const NavbarBranchSelect: FC<NavbarBranchSelectProps> = ({
  isCollops = false,
  tooltipProps,
}) => {
  const { isGlobalAdmin, onChangeBranch, value } = useNavbarBranchSelect();

  return (
    <>
      {isCollops ? (
        <Tooltip {...tooltipProps} title={value[0].label}>
          <Chip label={<ApartmentOutlinedIcon />} variant="filled" />
        </Tooltip>
      ) : (
        <BranchSelect
          value={value}
          disabled={!isGlobalAdmin}
          setValueStore={onChangeBranch}
          label={LABEL}
          name="navbarBranchSelect"
          testid={testids.widget_navbar.NAVBAR_INPUT_CHOOSE_FILIAL_OPEN_LIST_ITEM}
        />
      )}
    </>
  );
};
