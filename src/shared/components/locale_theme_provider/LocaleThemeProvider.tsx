import { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import CssBaseline from '@mui/material/CssBaseline';
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

import { useColorMode } from '@shared/theme/colorMode';

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
  const { mode } = useColorMode();
  const lang = (i18n.language || 'ru').split('-')[0].toLowerCase();

  const theme = useMemo(() => {
    const core = getCoreLocale(lang);
    const grid = getDataGridFragment(lang);
    let th = createTheme(
      {
        palette: {
          mode,
        },
      },
      core,
      grid,
    );

    const prev = th.components?.MuiDataGrid?.defaultProps?.localeText ?? {};
    th = createTheme(th, {
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body:
              mode === 'dark'
                ? {
                    backgroundColor: th.palette.background.default,
                    color: th.palette.text.primary,
                  }
                : {},
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
            },
          },
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              backgroundImage: 'none',
            },
          },
        },
        MuiPopover: {
          styleOverrides: {
            paper: {
              backgroundImage: 'none',
            },
          },
        },
        MuiMenu: {
          styleOverrides: {
            paper: {
              backgroundImage: 'none',
            },
          },
        },
        MuiDrawer: {
          styleOverrides: {
            paper: {
              backgroundImage: 'none',
            },
          },
        },
        MuiIconButton: {
          styleOverrides: {
            root: {
              color: mode === 'dark' ? th.palette.grey[200] : th.palette.action.active,
            },
          },
        },
        MuiCheckbox: {
          styleOverrides: {
            root: {
              color: mode === 'dark' ? th.palette.grey[400] : undefined,
            },
          },
        },
        MuiFormLabel: {
          styleOverrides: {
            root: {
              color: mode === 'dark' ? th.palette.text.secondary : undefined,
            },
          },
        },
        MuiFormControlLabel: {
          styleOverrides: {
            label: {
              color: mode === 'dark' ? th.palette.text.primary : undefined,
            },
          },
        },
        MuiInputLabel: {
          styleOverrides: {
            root:
              mode === 'dark'
                ? {
                    '&.MuiInputLabel-shrink': {
                      backgroundColor: th.palette.background.paper,
                      padding: '0 4px',
                      marginLeft: '-4px',
                    },
                  }
                : {},
          },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            notchedOutline:
              mode === 'dark'
                ? {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  }
                : {},
          },
        },
        MuiButton: {
          styleOverrides: {
            containedPrimary:
              mode === 'dark'
                ? {
                    color: th.palette.primary.contrastText,
                  }
                : {},
          },
        },
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
  }, [i18n, lang, mode]);

  const pickersLocaleText = useMemo(() => getPickersLocaleTextForLang(lang), [lang]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <LocalizationProvider localeText={pickersLocaleText}>{children}</LocalizationProvider>
    </ThemeProvider>
  );
}
