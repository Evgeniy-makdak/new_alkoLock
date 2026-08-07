import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, TablePagination, useTheme } from '@mui/material';
import { beBY as coreBeBY, enUS as coreEnUS, ruRU as coreRuRU } from '@mui/material/locale';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import { CustomPaginationActions } from './CustomPaginationActions';

interface PaginationControlsProps {
  totalCount: number;
  rowsPerPage: number;
  page: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** @deprecated Всегда без верхней линии — как у DataGrid footerContainer */
  hideTopBorder?: boolean;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  totalCount,
  rowsPerPage,
  page,
  onPageChange,
  onRowsPerPageChange,
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
      {/* Box вместо Paper — без elevation/тени, как футер DataGrid */}
      <Box
        sx={{
          width: '100%',
          border: 'none !important',
          borderTop: 'none !important',
          boxShadow: 'none !important',
          bgcolor: 'background.paper',
          color: 'text.primary',
        }}>
        <TablePagination
          sx={{
            marginTop: 'auto',
            color: 'text.primary',
            backgroundColor: 'transparent',
            border: 'none !important',
            borderTop: 'none !important',
            borderBottom: 'none !important',
            overflow: 'visible',
            '&:last-child': {
              padding: 0,
              border: 'none !important',
            },
            '& .MuiToolbar-root': {
              border: 'none !important',
              borderTop: 'none !important',
            },
            '& .MuiTablePagination-toolbar': {
              flexWrap: 'nowrap',
              gap: 0,
              minHeight: 52,
              boxSizing: 'border-box',
              border: 'none !important',
              borderTop: 'none !important',
            },
            // Интервал между «1–N из N» и блоком страницы/стрелок — как у CustomPagination
            '& .MuiTablePagination-actions': {
              marginLeft: (theme) => theme.spacing(2),
            },
            '& .MuiTablePagination-displayedRows': {
              marginRight: 0,
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
      </Box>
    </ThemeProvider>
  );
};

export default PaginationControls;
