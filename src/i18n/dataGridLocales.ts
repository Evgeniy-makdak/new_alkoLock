import { ruRU } from '@mui/x-data-grid';
import { beBY, enUS } from '@mui/x-data-grid/locales';

import i18n from './index';

const getBaseLocale = (locale: any) =>
  locale?.components?.MuiDataGrid?.defaultProps?.localeText ?? {};

export const getDataGridLocaleText = () => {
  const lang = (i18n.language || '').split('-')[0].toLowerCase();
  const t = (key: string, opts?: Record<string, string | number>) => i18n.t(key, opts);
  let base;
  if (lang === 'be') {
    base = getBaseLocale(beBY);
  } else if (lang === 'en' || lang === 'kk' || lang === 'ky' || lang === 'uz') {
    base = getBaseLocale(enUS);
  } else {
    base = getBaseLocale(ruRU);
  }

  const uzGridPatch =
    lang === 'uz'
      ? {
          filterOperatorContains: t('dataGrid.filterOperatorContains'),
          filterOperatorEquals: t('dataGrid.filterOperatorEquals'),
          filterOperatorStartsWith: t('dataGrid.filterOperatorStartsWith'),
          filterOperatorEndsWith: t('dataGrid.filterOperatorEndsWith'),
          toolbarFilters: t('dataGrid.toolbarFilters'),
          toolbarFiltersLabel: t('dataGrid.toolbarFiltersLabel'),
          filterPanelAddFilter: t('dataGrid.filterPanelAddFilter'),
          filterPanelColumns: t('dataGrid.filterPanelColumns'),
          filterPanelOperator: t('dataGrid.filterPanelOperator'),
          filterPanelInputLabel: t('dataGrid.filterPanelInputLabel'),
        }
      : {};

  return {
    ...base,
    ...uzGridPatch,
    labelRowsPerPage: t('tables.rowsPerPage'),
    labelDisplayedRows: ({ from, to, count }: { from: number; to: number; count: number }) =>
      t('pagination.rowsOf', { from, to, count }),
  };
};
