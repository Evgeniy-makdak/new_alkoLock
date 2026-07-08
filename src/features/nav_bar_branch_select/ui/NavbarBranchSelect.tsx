import type { FC } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import { Chip, Popover, Tooltip, type TooltipProps, useMediaQuery } from '@mui/material';

import { BranchSelect } from '@entities/branch_select';
import { testids } from '@shared/const/testid';

import { useNavbarBranchSelect } from '../hooks/useNavbarBranchSelect';

type NavbarBranchSelectProps = {
  isCollops?: boolean;
  allowCustomEvents?: boolean;
  tooltipProps?: Omit<TooltipProps, 'title' | 'children'>;
};

export const NavbarBranchSelect: FC<NavbarBranchSelectProps> = ({
  isCollops = false,
  tooltipProps,
  allowCustomEvents = true,
}) => {
  const { t } = useTranslation();
  const label = t('nav.branch');
  const { isGlobalAdmin, onChangeBranch, value } = useNavbarBranchSelect();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const showIconPicker = isMobile || isTablet || isCollops;
  const isDesktopCollapsed = isCollops && !isMobile && !isTablet;
  const branchLabel = value[0]?.label ?? '';

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!showIconPicker || !isGlobalAdmin) return;
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChangeBranch: typeof onChangeBranch = (type, nextValue) => {
    onChangeBranch(type, nextValue);
    handleClose();
  };

  const open = Boolean(anchorEl);

  if (showIconPicker) {
    return (
      <>
        <Tooltip {...tooltipProps} title={branchLabel}>
          <Chip
            icon={<ApartmentOutlinedIcon />}
            onClick={handleClick}
            clickable={isGlobalAdmin}
            variant="filled"
          />
        </Tooltip>
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={
            isDesktopCollapsed
              ? { vertical: 'top', horizontal: 'right' }
              : { vertical: 'bottom', horizontal: 'left' }
          }
          transformOrigin={
            isDesktopCollapsed
              ? { vertical: 'top', horizontal: 'left' }
              : { vertical: 'top', horizontal: 'left' }
          }
          PaperProps={{
            sx: {
              width: '280px',
              maxHeight: '400px',
              overflow: 'auto',
            },
          }}>
          <div style={{ padding: '16px' }}>
            <BranchSelect
              value={value}
              disabled={!isGlobalAdmin}
              setValueStore={handleChangeBranch}
              allowCustomEvents={allowCustomEvents}
              label={label}
              name={
                isMobile || isTablet ? 'navbarBranchSelectMobile' : 'navbarBranchSelectCollapsed'
              }
              testid={testids.widget_navbar.NAVBAR_INPUT_CHOOSE_FILIAL_OPEN_LIST_ITEM}
            />
          </div>
        </Popover>
      </>
    );
  }

  return (
    <BranchSelect
      value={value}
      disabled={!isGlobalAdmin}
      setValueStore={onChangeBranch}
      allowCustomEvents={allowCustomEvents}
      label={''}
      name="navbarBranchSelect"
      overflowTooltip
      testid={testids.widget_navbar.NAVBAR_INPUT_CHOOSE_FILIAL_OPEN_LIST_ITEM}
    />
  );
};
