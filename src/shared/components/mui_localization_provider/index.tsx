import type { FC, ReactNode } from 'react';

import 'dayjs/locale/ru';

import { ThemeProvider, createTheme } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { ruRU } from '@mui/x-date-pickers/locales';

type MuiLocalizationProviderProps = {
  children: ReactNode;
};
const theme = createTheme(
  {},
  ruRU, // use 'de' locale for UI texts (start, next month, ...)
);

export const MuiLocalizationProvider: FC<MuiLocalizationProviderProps> = ({ children }) => {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={'ru'}>
        {children}
      </LocalizationProvider>
    </ThemeProvider>
  );
};
