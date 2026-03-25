import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Paper, TablePagination, useTheme } from '@mui/material';
import { beBY as coreBeBY, enUS as coreEnUS, ruRU as coreRuRU } from '@mui/material/locale';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import { CustomPaginationActions } from './CustomPaginationActions';

interface PaginationControlsProps {
  totalCount: number;
  rowsPerPage: number;
  page: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Убрать верхнюю линию у панели (напр. «Шаблоны сообщений» — как у вкладок с DataGrid) */
  hideTopBorder?: boolean;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  totalCount,
  rowsPerPage,
  page,
  onPageChange,
  onRowsPerPageChange,
  hideTopBorder = false,
}) => {
  const { t, i18n } = useTranslation();
  const outerTheme = useTheme();
  const lang = i18n.language?.split('-')[0] || i18n.language;
  const theme = useMemo(
    () =>
      createTheme(
        outerTheme,
        lang === 'be'
          ? coreBeBY
          : lang === 'en' || lang === 'kk' || lang === 'ky' || lang === 'uz'
            ? coreEnUS
            : coreRuRU,
      ),
    [outerTheme, lang],
  );

  if (!totalCount || !rowsPerPage) return null;

  return (
    <ThemeProvider theme={theme}>
      <Paper
        elevation={hideTopBorder ? 0 : undefined}
        sx={{
          position: 'sticky',
          bottom: 0,
          width: '100%',
          borderTop: hideTopBorder ? 'none' : `1px solid ${outerTheme.palette.divider}`,
          bgcolor: 'background.paper',
          color: 'text.primary',
          zIndex: 10,
          boxShadow: hideTopBorder ? 'none' : undefined,
        }}>
        <TablePagination
          sx={{
            marginTop: 'auto',
            color: 'text.primary',
            backgroundColor: 'transparent',
            borderTop: 'none',
            '& .MuiTablePagination-toolbar': {
              flexWrap: 'nowrap',
              gap: 1,
              minHeight: 48,
              boxSizing: 'border-box',
            },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              color: 'text.primary',
            },
            '& .MuiTablePagination-selectIcon': {
              color: 'text.secondary',
            },
            '& .MuiInputBase-root': {
              color: 'text.primary',
            },
          }}
          rowsPerPageOptions={[25, 50, 75, 100]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
          ActionsComponent={CustomPaginationActions}
          labelRowsPerPage={t('tables.rowsPerPage')}
          labelDisplayedRows={({ from, to, count }) => t('pagination.rowsOf', { from, to, count })}
        />
      </Paper>
    </ThemeProvider>
  );
};

export default PaginationControls;
