import React from 'react';
import { useTranslation } from 'react-i18next';

import { Paper, TablePagination } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material';
import { beBY as coreBeBY, enUS as coreEnUS, ruRU as coreRuRU } from '@mui/material/locale';

import { CustomPaginationActions } from './CustomPaginationActions';

interface PaginationControlsProps {
  totalCount: number;
  rowsPerPage: number;
  page: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  totalCount,
  rowsPerPage,
  page,
  onPageChange,
  onRowsPerPageChange,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || i18n.language;
  const theme = createTheme(
    {},
    lang === 'be'
      ? coreBeBY
      : lang === 'en' || lang === 'kk' || lang === 'ky' || lang === 'uz'
        ? coreEnUS
        : coreRuRU,
  );

  if (!totalCount || !rowsPerPage) return null;

  return (
    <ThemeProvider theme={theme}>
      <Paper
        sx={{
          position: 'sticky',
          bottom: 0,
          width: '100%',
          borderTop: '1px solid #ccc',
          backgroundColor: 'white',
          zIndex: 10,
        }}>
        <TablePagination
          sx={{ marginTop: 'auto', backgroundColor: 'transparent', borderTop: 'none' }}
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
