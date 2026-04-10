import React from 'react';
import { useTranslation } from 'react-i18next';

import AutorenewIcon from '@mui/icons-material/Autorenew';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';

interface SettingRow {
  id: number;
  label: string;
  field: string;
  value: number;
  unit: string;
  minValue: number;
  maxValue: number;
  defaultValue: number;
}

interface SettingsMobileTableProps {
  loading: boolean;
  settingsRows: SettingRow[];
  page: number;
  rowsPerPage: number;
  getUnitDisplay: (unit: string, value: number) => string;
  handleEditClick: (row: SettingRow) => void;
  handleResetToDefault: (row: SettingRow) => void;
}

export const SettingsMobileTable: React.FC<SettingsMobileTableProps> = ({
  loading,
  settingsRows,
  page,
  rowsPerPage,
  getUnitDisplay,
  handleEditClick,
  handleResetToDefault,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  if (loading) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  const displayedRows = settingsRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
      {displayedRows.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="textSecondary">
            {t('settingsPage.noSettingsFound')}
          </Typography>
        </Box>
      ) : (
        displayedRows.map((row) => (
          <Paper
            key={row.id}
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              boxShadow:
                theme.palette.mode === 'dark'
                  ? '0 2px 12px rgba(0,0,0,0.45)'
                  : '0 2px 8px rgba(0,0,0,0.1)',
            }}>
            {/* Изменяемый параметр */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
                {t('tables.changeableParam')}:
              </Typography>
              <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                {row.label}
              </Typography>
            </Box>

            {/* Текущее значение */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
                {t('tables.currentValue')}:
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {row.value} {getUnitDisplay(row.unit, row.value)}
              </Typography>
            </Box>

            {/* Действия */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" color="textSecondary">
                {t('tables.actions')}:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title={t('common.edit')}>
                  <IconButton
                    onClick={() => handleEditClick(row)}
                    size="small"
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: 'text.primary' },
                    }}>
                    <ModeEditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('common.resetToDefault')}>
                  <IconButton
                    onClick={() => handleResetToDefault(row)}
                    size="small"
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: 'text.primary' },
                    }}>
                    <AutorenewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Paper>
        ))
      )}
    </Box>
  );
};
