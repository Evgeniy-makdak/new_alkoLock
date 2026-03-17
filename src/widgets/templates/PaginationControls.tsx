import React from 'react';

import { Paper, TablePagination } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material';
import { ruRU as coreRuRU } from '@mui/material/locale';
import { ruRU as dataGridRuRU } from '@mui/x-data-grid';

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
  const theme = createTheme({}, coreRuRU, dataGridRuRU);

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
        />
      </Paper>
    </ThemeProvider>
  );
};

export default PaginationControls;
