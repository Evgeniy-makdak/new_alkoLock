import type { FC, ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import 'dayjs/locale/be';
import 'dayjs/locale/en';
import 'dayjs/locale/kk';
import 'dayjs/locale/ky';
import 'dayjs/locale/ru';
import 'dayjs/locale/uz-latn';

import { ThemeProvider, createTheme } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { beBY, enUS, kzKZ, ruRU } from '@mui/x-date-pickers/locales';

export const PICKERS_LOCALE_MAP: Record<
  string,
  {
    localeText: typeof ruRU.components.MuiLocalizationProvider.defaultProps.localeText;
    adapterLocale: string;
  }
> = {
  ru: {
    localeText: ruRU.components.MuiLocalizationProvider.defaultProps.localeText,
    adapterLocale: 'ru',
  },
  en: {
    localeText: enUS.components.MuiLocalizationProvider.defaultProps.localeText,
    adapterLocale: 'en',
  },
  kk: {
    localeText: kzKZ.components.MuiLocalizationProvider.defaultProps.localeText,
    adapterLocale: 'kk',
  },
  ky: {
    localeText: ruRU.components.MuiLocalizationProvider.defaultProps.localeText,
    adapterLocale: 'ky',
  },
  be: {
    localeText: beBY.components.MuiLocalizationProvider.defaultProps.localeText,
    adapterLocale: 'be',
  },
  uz: {
    localeText: enUS.components.MuiLocalizationProvider.defaultProps.localeText,
    adapterLocale: 'uz-latn',
  },
};

/** localeText для корневого LocalizationProvider (без Adapter — см. MuiLocalizationProvider в формах). */
export function getPickersLocaleTextForLang(lang: string | undefined) {
  const base = (lang || 'ru').split('-')[0].toLowerCase();
  return (PICKERS_LOCALE_MAP[base] ?? PICKERS_LOCALE_MAP.ru).localeText;
}

type MuiLocalizationProviderProps = {
  children: ReactNode;
};

export const MuiLocalizationProvider: FC<MuiLocalizationProviderProps> = ({ children }) => {
  const outerTheme = useTheme();
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'ru';
  const { localeText, adapterLocale } = PICKERS_LOCALE_MAP[lang] ?? PICKERS_LOCALE_MAP.ru;

  const theme = useMemo(() => createTheme(outerTheme, {}), [outerTheme]);

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider
        dateAdapter={AdapterDayjs}
        adapterLocale={adapterLocale}
        localeText={localeText}>
        {children}
      </LocalizationProvider>
    </ThemeProvider>
  );
};
