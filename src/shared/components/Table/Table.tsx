import { memo } from 'react';

import { ThemeProvider, createTheme } from '@mui/material';
import { ruRU as coreRuRU } from '@mui/material/locale';
import { type DataGridProps, type GridColumnHeaderParams, ruRU } from '@mui/x-data-grid';
import { ruRU as pickersruRU } from '@mui/x-date-pickers/locales';

import style from './Table.module.scss';
import { CustomNoRowsOverlay, StyledDataGrid, getStyle } from './styledTable';

interface TableProps extends DataGridProps {
  styles?: string;
  testid?: string;
  pageSize?: number;
  pageNumber?: number;
  pointer?: boolean;
}
const theme = createTheme(
  {},
  ruRU, // x-data-grid translations
  pickersruRU, // x-date-pickers translations
  coreRuRU, // core translations
);

export const setTestIdsToHeaderColumns = (
  row: GridColumnHeaderParams<unknown, unknown, unknown>,
  testId: string,
) => {
  return <span data-testid={`${testId}_${row?.colDef?.field}`}>{row?.colDef?.headerName}</span>;
};

export const Table = memo(
  ({
    columns,
    pageSize = 25,
    pageNumber = 1,
    pointer,
    pageSizeOptions,
    styles,
    ...rest
  }: TableProps) => {
    const styledHeaders = columns.map((head) => {
      if (head?.type === 'actions') return { ...head };
      return { ...head, flex: 1 };
    });

    return (
      <div className={styles ? styles : style.table}>
        <ThemeProvider theme={theme}>
          <StyledDataGrid
            {...rest}
            sx={getStyle(pointer)}
            disableColumnMenu
            disableColumnFilter
            disableColumnSelector
            disableDensitySelector
            disableVirtualization
            disableEval
            columns={styledHeaders}
            getRowClassName={() => `super-app-theme`}
            slots={{
              noResultsOverlay: CustomNoRowsOverlay,
            }}
            initialState={{
              pagination: {
                paginationModel: { page: pageNumber, pageSize: pageSize },
              },
            }}
            pageSizeOptions={pageSizeOptions ? pageSizeOptions : [25, 50, 75, 100]}
          />
        </ThemeProvider>
      </div>
    );
  },
);

Table.displayName = 'Table';
