import { ruRU } from '@mui/x-data-grid';
import { enUS } from '@mui/x-data-grid/locales';

import i18n from './index';

const getBaseLocale = (locale: any) =>
  locale?.components?.MuiDataGrid?.defaultProps?.localeText ?? {};

export const getDataGridLocaleText = () => {
  const lang = (i18n.language || '').split('-')[0].toLowerCase();
  const t = (key: string, opts?: Record<string, string | number>) => i18n.t(key, opts);
  const base = lang === 'en' || lang === 'kk' ? getBaseLocale(enUS) : getBaseLocale(ruRU);
  return {
    ...base,
    labelRowsPerPage: t('tables.rowsPerPage'),
    labelDisplayedRows: ({ from, to, count }: { from: number; to: number; count: number }) =>
      t('pagination.rowsOf', { from, to, count }),
  };
};
