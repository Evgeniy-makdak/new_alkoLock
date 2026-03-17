import type { FC, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import 'dayjs/locale/en';
import 'dayjs/locale/kk';
import 'dayjs/locale/ky';
import 'dayjs/locale/ru';

import { ThemeProvider, createTheme } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { enUS, kzKZ, ruRU } from '@mui/x-date-pickers/locales';

const PICKERS_LOCALE_MAP: Record<
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
};

type MuiLocalizationProviderProps = {
  children: ReactNode;
};

export const MuiLocalizationProvider: FC<MuiLocalizationProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'ru';
  const { localeText, adapterLocale } = PICKERS_LOCALE_MAP[lang] ?? PICKERS_LOCALE_MAP.ru;

  const theme = createTheme({});

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
