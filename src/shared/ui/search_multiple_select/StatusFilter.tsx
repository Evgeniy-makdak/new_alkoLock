/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { MoreVert } from '@mui/icons-material';
import { IconButton, Menu, MenuItem, Tooltip, Typography } from '@mui/material';

import { useStatusFilter } from './StatusFilterContext';

type StatusFilterProps = {
  statusFilter: 'Все' | 'Активные' | 'Неактивные';
  onStatusChange: (newStatus: 'Все' | 'Активные' | 'Неактивные') => void;
};

const STATUS_OPTIONS = ['Все', 'Активные', 'Неактивные'] as const;
const STATUS_KEYS = {
  Все: 'status.all',
  Активные: 'status.active',
  Неактивные: 'status.inactive',
} as const;

export const StatusFilter: React.FC<StatusFilterProps> = () => {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { statusFilter, setStatusFilter } = useStatusFilter();

  const handleMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setIsMenuOpen(true);
  };

  const handleMenuClose = () => {
    setIsMenuOpen(false);
  };

  const handleStatusChange = (option: 'Все' | 'Активные' | 'Неактивные') => {
    setStatusFilter(option);
    handleMenuClose();
  };

  return (
    <div style={{ marginLeft: '10px', display: 'flex', alignItems: 'center' }}>
      <Typography variant="body2">{t(STATUS_KEYS[statusFilter])}</Typography>
      <Tooltip title={t('status.statusFilter')}>
        <IconButton
          size="small"
          onClick={handleMenuOpen}
          aria-label={t('status.filterStatus')}
          aria-controls={isMenuOpen ? 'status-menu' : undefined}
          aria-haspopup="true">
          <MoreVert />
        </IconButton>
      </Tooltip>
      <Menu
        id="status-menu"
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleMenuClose}
        PaperProps={{
          style: { maxHeight: 150, width: '200px' },
        }}>
        {STATUS_OPTIONS.map((option) => (
          <MenuItem
            key={option}
            selected={statusFilter === option}
            onClick={() => handleStatusChange(option as any)}>
            {t(STATUS_KEYS[option])}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
};
