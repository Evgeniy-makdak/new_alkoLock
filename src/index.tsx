/* eslint-disable prettier/prettier */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { SnackbarProvider, closeSnackbar } from 'notistack';

import CloseIcon from '@mui/icons-material/Close';
import { CircularProgress } from '@mui/material';
import StyledEngineProvider from '@mui/material/StyledEngineProvider';
import { ruRU as coreRuRU } from '@mui/material/locale';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ruRU as dataGridRuRU } from '@mui/x-data-grid/locales';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { ruRU as pickersRuRU } from '@mui/x-date-pickers/locales';

import { ServiceModeProvider } from '@features/alkozamki_service_mode/hooks/ServiceModeContext';
import { ErrorBoundary } from '@layout/error_boundary';
import { UserProvider } from '@pages/users/UserContext';
import { routers } from '@shared/config/routers';
import { UserStatusProvider } from '@shared/ui/refetch/UserStatusContext';
import { StatusFilterProvider } from '@shared/ui/search_multiple_select/StatusFilterContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeviceStatusProvider } from '@widgets/alkozamki_info/DeviceStatusContext';
import { AutoServiceInfoProvider } from '@widgets/auto_service_info/AutoServiceInfoContext';
import { SocketProvider } from '@widgets/chat/contexts/SocketContext';
import { CountProvider } from '@widgets/nav_bar/api/CountContext';
import { UserContextProvider } from '@widgets/users_info/UserContext';
import { AlkoContextProvider } from '@widgets/vehicles_info/lib/AlkoContext';

import { configLoader } from './config/configLoader';
import './i18n';
import './index.scss';
import * as serviceWorker from './serviceWorker';

const queryClient = new QueryClient();

// Создаём тему с русской локализацией
const theme = createTheme(coreRuRU, pickersRuRU, dataGridRuRU);

const AppContent = (
  <>
    <ErrorBoundary>
      <UserProvider>
        <QueryClientProvider client={queryClient}>
          <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
              <LocalizationProvider
                localeText={pickersRuRU.components.MuiLocalizationProvider.defaultProps.localeText}>
                <AutoServiceInfoProvider>
                  <UserStatusProvider>
                    <ServiceModeProvider>
                      <UserContextProvider>
                        <CountProvider>
                          <AlkoContextProvider>
                            <StatusFilterProvider>
                              <DeviceStatusProvider>
                                <SocketProvider>
                                  <SnackbarProvider
                                    action={(snackbarId) => (
                                      <CloseIcon
                                        className="CloseIcon"
                                        onClick={() => closeSnackbar(snackbarId)}
                                      />
                                    )}
                                    maxSnack={3}
                                    anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
                                    autoHideDuration={null}>
                                    <RouterProvider router={routers} />
                                  </SnackbarProvider>
                                </SocketProvider>
                              </DeviceStatusProvider>
                            </StatusFilterProvider>
                          </AlkoContextProvider>
                        </CountProvider>
                      </UserContextProvider>
                    </ServiceModeProvider>
                  </UserStatusProvider>
                </AutoServiceInfoProvider>
              </LocalizationProvider>
            </ThemeProvider>
          </StyledEngineProvider>
        </QueryClientProvider>
      </UserProvider>
    </ErrorBoundary>
  </>
);

const root = ReactDOM.createRoot(document.getElementById('root'));

async function bootstrap() {
  try {
    configLoader.reset();
    await configLoader.loadConfig();
  } catch (e) {
    console.error('Ошибка загрузки конфигурации:', e);
  }
  root.render(AppContent);
}

root.render(
  <div
    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
    <CircularProgress />
  </div>,
);

bootstrap();

// Регистрируем сервис-воркер
serviceWorker.register();
