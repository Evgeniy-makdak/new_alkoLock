/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Chip, LinearProgress, ThemeProvider, createTheme } from '@mui/material';
import { beBY as coreBeBY, enUS as coreEnUS, ruRU as coreRuRU } from '@mui/material/locale';
import { useTheme } from '@mui/material/styles';
import { type DataGridProps, type GridColumnHeaderParams, ruRU } from '@mui/x-data-grid';
import { enUS, beBY as gridBeBY } from '@mui/x-data-grid/locales';
import {
  beBY as pickersBeBY,
  enUS as pickersEnUS,
  ruRU as pickersruRU,
} from '@mui/x-date-pickers/locales';

import CustomPagination from '@shared/lib/CustomPagination';
import { ValuesHeader } from '@widgets/events_table/lib/getColumns';

import { getDataGridLocaleText } from '../../../i18n/dataGridLocales';
import { CustomLinearLoader } from './CustomLinearLoader';
import style from './Table.module.scss';
import { CustomNoRowsOverlay, StyledDataGrid, getStyle } from './styledTable';

interface TableProps extends DataGridProps {
  styles?: string;
  testid?: string;
  pageSize?: number;
  pageNumber?: number;
  pointer?: boolean;
  loadingColumnIndex?: number;
  chipColumns?: number[];
}

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
    chipColumns = [],
    ...rest
  }: TableProps) => {
    const { t, i18n } = useTranslation();
    const outerTheme = useTheme();
    const localeText = getDataGridLocaleText();
    const lang = (i18n.language || '').split('-')[0].toLowerCase();
    const isBe = lang === 'be';
    const useEnFamily = lang === 'en' || lang === 'kk' || lang === 'ky' || lang === 'uz';
    const gridLocale = isBe ? gridBeBY : useEnFamily ? enUS : ruRU;
    const pickersLocale = isBe ? pickersBeBY : useEnFamily ? pickersEnUS : pickersruRU;
    const coreLocale = isBe ? coreBeBY : useEnFamily ? coreEnUS : coreRuRU;
    const theme = createTheme(outerTheme, gridLocale, pickersLocale, coreLocale, {
      components: {
        MuiTablePagination: {
          defaultProps: {
            labelRowsPerPage: t('tables.rowsPerPage'),
            labelDisplayedRows: ({
              from,
              to,
              count,
            }: {
              from: number;
              to: number;
              count: number;
            }) => t('pagination.rowsOf', { from, to, count }),
          },
          styleOverrides: {
            displayedRows: {
              fontVariantNumeric: 'tabular-nums',
              minWidth: '15rem',
              display: 'inline-block',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            },
          },
        },
      },
    });
    const renderValue = (value: any) => {
      if (Array.isArray(value)) {
        return (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              width: '100%',
            }}>
            {value.map((item, i) => (
              <Chip
                key={i}
                label={item}
                size="small"
                variant="outlined"
                sx={{
                  maxWidth: '100%',
                  borderColor: 'text.inherit',
                  color: 'text.primary',
                  backgroundColor: 'transparent',
                  '& .MuiChip-label': {
                    px: 0.8,
                    py: 0.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                }}
              />
            ))}
          </Box>
        );
      }
      return <Box>{value}</Box>;
    };

    const styledHeaders = columns.map((head, index) => {
      if (head?.type === 'actions') {
        const originalRenderCell = head.renderCell;
        return {
          ...head,
          renderCell: (params: any) => {
            const content = originalRenderCell ? originalRenderCell(params) : null;
            if (params.row.isProcessing) {
              return (
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    overflow: 'hidden',
                  }}>
                  <Box sx={{ flex: 1 }}>{content}</Box>
                  <CustomLinearLoader />
                </Box>
              );
            }
            return content;
          },
        };
      }

      if (
        head.field === ValuesHeader.TYPE_OF_EVENT ||
        head.field === ValuesHeader.STATE ||
        head.field === ValuesHeader.EXPIRES
      ) {
        return {
          ...head,
          flex: 1,
        };
      }

      return {
        ...head,
        flex: 1,
        renderCell: (params: any) => {
          const useChip = chipColumns.includes(index);
          const value = useChip ? params.value : params.formattedValue;

          if (params.row.isProcessing) {
            return (
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}>
                <Box sx={{ flex: 1 }}>{renderValue(value)}</Box>
                <CustomLinearLoader />
              </Box>
            );
          }

          return (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                overflow: 'hidden',
              }}>
              {renderValue(value)}
            </Box>
          );
        },
      };
    });

    return (
      <Box
        className={styles ? styles : style.table}
        sx={{
          height: '100%',
          '& .MuiDataGrid-root': {
            '--DataGrid-rowHeight': '52px !important',
          },
        }}>
        <ThemeProvider theme={theme}>
          <StyledDataGrid
            key={i18n.language}
            {...rest}
            sx={{
              ...getStyle(pointer, outerTheme),
              '& .MuiDataGrid-row': {
                maxHeight: 'none !important',
                minHeight: 'var(--DataGrid-rowHeight) !important',
              },
              '& .MuiDataGrid-cell': {
                maxHeight: 'none !important',
                minHeight: 'var(--DataGrid-rowHeight) !important',
                display: 'flex',
                alignItems: 'center',
                py: 1,
                overflow: 'hidden !important',
              },
              // УБИРАЕМ КОНФЛИКТУЮЩИЕ СТИЛИ ДЛЯ ВЫДЕЛЕННЫХ СТРОК
              // Стили для чередующейся заливки строк по почтам (только для невыделенных)
              '& .email-group-even:not(.Mui-selected):not(.selected-group)': {
                backgroundColor: `${outerTheme.palette.background.paper} !important`,
                '&:hover': {
                  backgroundColor: `${outerTheme.palette.background.paper} !important`,
                },
              },
              '& .email-group-odd:not(.Mui-selected):not(.selected-group)': {
                backgroundColor: `${outerTheme.palette.background.paper} !important`,
                '&:hover': {
                  backgroundColor: `${outerTheme.palette.background.paper} !important`,
                },
              },
              // Внешние границы для групп - только первая и последняя строка группы (только для невыделенных)
              '& .email-group-first:not(.Mui-selected):not(.selected-group)': {
                borderTop: `1px solid ${outerTheme.palette.divider} !important`,
              },
              '& .email-group-last:not(.Mui-selected):not(.selected-group)': {
                borderBottom: `1px solid ${outerTheme.palette.divider} !important`,
              },
              // Усиленные серые границы для выделенных групп
              '& .selected-group.email-group-first': {
                borderTop: '2px solid #9e9e9e !important',
              },
              '& .selected-group.email-group-last': {
                borderBottom: '2px solid #9e9e9e !important',
              },
            }}
            disableColumnMenu
            disableColumnFilter
            disableColumnSelector
            disableDensitySelector
            disableVirtualization
            disableEval
            localeText={localeText}
            columns={styledHeaders}
            getRowClassName={(params) => {
              let className = 'super-app-theme';
              if (params.row.isDeleted) className += ' super-app-theme--deleted';
              if (params.row.isProcessing) className += ' super-app-theme--loading';

              // Добавляем класс для чередующейся заливки (четные/нечетные группы)
              // Используем существующее свойство _groupIndex из getRows.ts
              if (params.row._groupIndex !== undefined) {
                const alternatingClass =
                  params.row._groupIndex % 2 === 0 ? 'email-group-even' : 'email-group-odd';
                className += ` ${alternatingClass}`;

                // Добавляем классы для первой и последней строки группы
                if (params.row._isFirstRow) {
                  className += ' email-group-first';
                }
                if (params.row._rowIndex === params.row._rowCount - 1) {
                  className += ' email-group-last';
                }
              }

              // Добавляем класс для выделенной группы из пропсов
              if (rest.getRowClassName) {
                const additionalClass = rest.getRowClassName(params);
                if (additionalClass) {
                  className += ` ${additionalClass}`;
                }
              }

              return className;
            }}
            slots={{
              noResultsOverlay: CustomNoRowsOverlay,
              pagination: CustomPagination,
              loadingOverlay: () => (
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px' }}>
                  <LinearProgress color="primary" />
                </Box>
              ),
            }}
            initialState={{
              pagination: {
                paginationModel: { page: pageNumber, pageSize: pageSize },
              },
            }}
            pageSizeOptions={pageSizeOptions ? pageSizeOptions : [25, 50, 75, 100]}
          />
        </ThemeProvider>
      </Box>
    );
  },
);

Table.displayName = 'Table';
