import React from 'react';

import EditIcon from '@mui/icons-material/Edit';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';

type SettingsTableRowProps = {
  label: string;
  value: number;
  errors: string[];
  unit: 'мин' | string;
  onEditClick: () => void;
};

export const SettingsTableRow: React.FC<SettingsTableRowProps> = ({
  label,
  value,
  errors,
  unit,
  onEditClick,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid #e0e0e0',
      }}>
      <div>
        <Typography variant="subtitle1">{label}</Typography>
        <Typography variant="body2" color="textSecondary">
          Текущее значение: {value} {unit}
        </Typography>
        {errors.length > 0 && (
          <Typography variant="body2" color="error">
            {errors[0]}
          </Typography>
        )}
      </div>
      <Tooltip title="Редактировать">
        <IconButton
          onClick={onEditClick}
          color="default"
          aria-label="edit"
          sx={{
            '&:hover': {
              backgroundColor: 'primary',
            },
          }}>
          <EditIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
