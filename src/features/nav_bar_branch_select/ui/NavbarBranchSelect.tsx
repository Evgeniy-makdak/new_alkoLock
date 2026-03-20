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

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (isMobile || isTablet) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  if (isMobile || isTablet) {
    return (
      <>
        <Tooltip {...tooltipProps} title={value[0].label}>
          <Chip icon={<ApartmentOutlinedIcon />} onClick={handleClick} clickable variant="filled" />
        </Tooltip>
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
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
              setValueStore={onChangeBranch}
              allowCustomEvents={allowCustomEvents}
              label={label}
              name="navbarBranchSelectMobile"
              testid={testids.widget_navbar.NAVBAR_INPUT_CHOOSE_FILIAL_OPEN_LIST_ITEM}
            />
          </div>
        </Popover>
      </>
    );
  }

  return (
    <>
      {isCollops ? (
        <Tooltip {...tooltipProps} title={value[0].label}>
          <Chip icon={<ApartmentOutlinedIcon />} variant="filled" />
        </Tooltip>
      ) : (
        <BranchSelect
          value={value}
          disabled={!isGlobalAdmin}
          setValueStore={onChangeBranch}
          allowCustomEvents={allowCustomEvents}
          label={''}
          name="navbarBranchSelect"
          testid={testids.widget_navbar.NAVBAR_INPUT_CHOOSE_FILIAL_OPEN_LIST_ITEM}
        />
      )}
    </>
  );
};
