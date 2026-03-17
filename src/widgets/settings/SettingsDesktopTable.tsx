import React from 'react';
import { useTranslation } from 'react-i18next';

import AutorenewIcon from '@mui/icons-material/Autorenew';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import {
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
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

interface SettingsDesktopTableProps {
  loading: boolean;
  settingsRows: SettingRow[];
  page: number;
  rowsPerPage: number;
  getUnitDisplay: (unit: string, value: number) => string;
  handleEditClick: (row: SettingRow) => void;
  handleResetToDefault: (row: SettingRow) => void;
}

export const SettingsDesktopTable: React.FC<SettingsDesktopTableProps> = ({
  loading,
  settingsRows,
  page,
  rowsPerPage,
  getUnitDisplay,
  handleEditClick,
  handleResetToDefault,
}) => {
  const { t } = useTranslation();
  return (
    <TableContainer
      component={Paper}
      sx={{
        flexGrow: 1,
        maxHeight: '96vh',
        overflow: 'auto',
        marginTop: 0,
        outline: 'none',
        border: 'none',
        boxShadow: 'none',
      }}>
      <Table
        size="small"
        stickyHeader
        sx={{
          tableLayout: 'fixed',
          minWidth: '1000px',
          border: 'none',
          borderCollapse: 'separate',
          borderSpacing: 0,
        }}>
        <TableHead sx={{ height: '54px' }}>
          <TableRow
            sx={{
              backgroundColor: '#dad8d8',
              position: 'sticky',
              top: 0,
              zIndex: 2,
              border: 'none',
            }}>
            <TableCell
              sx={{
                fontWeight: 'bold',
                backgroundColor: '#dad8d8',
                width: '60%',
                border: 'none',
                borderBottom: 'none',
              }}>
              {t('tables.changeableParam')}
            </TableCell>
            <TableCell
              sx={{
                fontWeight: 'bold',
                backgroundColor: '#dad8d8',
                width: '20%',
                border: 'none',
                borderBottom: 'none',
              }}>
              {t('tables.currentValue')}
            </TableCell>
            <TableCell
              sx={{
                width: '20%',
                textAlign: 'center',
                fontWeight: 'bold',
                backgroundColor: '#dad8d8',
                border: 'none',
                borderBottom: 'none',
              }}>
              {t('tables.actions')}
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={3} align="center" sx={{ border: 'none', borderBottom: 'none' }}>
                <CircularProgress />
              </TableCell>
            </TableRow>
          ) : (
            settingsRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => (
              <TableRow key={row.id} hover sx={{ border: 'none', borderBottom: 'none' }}>
                <TableCell sx={{ border: 'none', borderBottom: 'none' }}>{row.label}</TableCell>
                <TableCell sx={{ border: 'none', borderBottom: 'none' }}>
                  {row.value} {getUnitDisplay(row.unit, row.value)}
                </TableCell>
                <TableCell
                  sx={{
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    border: 'none',
                    borderBottom: 'none',
                  }}>
                  <Tooltip title="Редактировать">
                    <IconButton onClick={() => handleEditClick(row)}>
                      <ModeEditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Восстановить значение по умолчанию">
                    <IconButton onClick={() => handleResetToDefault(row)}>
                      <AutorenewIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
