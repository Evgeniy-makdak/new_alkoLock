import { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  beBY as coreBeBY,
  enUS as coreEnUS,
  kkKZ as coreKkKZ,
  ruRU as coreRuRU,
} from '@mui/material/locale';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  beBY as dataGridBeBY,
  enUS as dataGridEnUS,
  ruRU as dataGridRuRU,
} from '@mui/x-data-grid/locales';
import '@mui/x-data-grid/themeAugmentation';
import { LocalizationProvider } from '@mui/x-date-pickers';

import { getPickersLocaleTextForLang } from '../mui_localization_provider';

function getCoreLocale(lang: string) {
  switch (lang) {
    case 'en':
    case 'uz':
      return coreEnUS;
    case 'be':
      return coreBeBY;
    case 'kk':
      return coreKkKZ;
    case 'ky':
      return coreRuRU;
    default:
      return coreRuRU;
  }
}

function getDataGridFragment(lang: string) {
  switch (lang) {
    case 'en':
    case 'uz':
      return dataGridEnUS;
    case 'be':
      return dataGridBeBY;
    case 'kk':
    case 'ky':
      return dataGridEnUS;
    default:
      return dataGridRuRU;
  }
}

type LocaleThemeProviderProps = {
  children: ReactNode;
};

/**
 * Тема MUI + тексты DataGrid и date-pickers под текущий язык i18n
 * (стрелки сортировки, меню колонок и т.д.).
 */
export function LocaleThemeProvider({ children }: LocaleThemeProviderProps) {
  const { i18n } = useTranslation();
  const lang = (i18n.language || 'ru').split('-')[0].toLowerCase();

  const theme = useMemo(() => {
    const core = getCoreLocale(lang);
    const grid = getDataGridFragment(lang);
    let th = createTheme(core, grid);

    const prev = th.components?.MuiDataGrid?.defaultProps?.localeText ?? {};
    th = createTheme(th, {
      components: {
        MuiDataGrid: {
          defaultProps: {
            localeText: {
              ...prev,
              columnHeaderSortIconLabel: i18n.t('tables.dataGrid.columnHeaderSortIconLabel'),
              columnMenuSortAsc: i18n.t('tables.dataGrid.columnMenuSortAsc'),
              columnMenuSortDesc: i18n.t('tables.dataGrid.columnMenuSortDesc'),
              columnMenuUnsort: i18n.t('tables.dataGrid.columnMenuUnsort'),
            },
          },
        },
      },
    });

    return th;
  }, [i18n, lang]);

  const pickersLocaleText = useMemo(() => getPickersLocaleTextForLang(lang), [lang]);

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider localeText={pickersLocaleText}>{children}</LocalizationProvider>
    </ThemeProvider>
  );
}
