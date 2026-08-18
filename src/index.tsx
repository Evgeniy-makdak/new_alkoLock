/* eslint-disable prettier/prettier */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { SnackbarProvider, closeSnackbar } from 'notistack';

import CloseIcon from '@mui/icons-material/Close';
import { CircularProgress } from '@mui/material';
import StyledEngineProvider from '@mui/material/StyledEngineProvider';

import { ServiceModeProvider } from '@features/alkozamki_service_mode/hooks/ServiceModeContext';
import { ErrorBoundary } from '@layout/error_boundary';
import { UserProvider } from '@pages/users/UserContext';
import { LocaleThemeProvider } from '@shared/components/locale_theme_provider';
import { routers } from '@shared/config/routers';
import { AuthSessionSync } from '@shared/ui/auth_session_sync/AuthSessionSync';
import { ColorModeProvider } from '@shared/theme/colorMode';
import { UserStatusProvider } from '@shared/ui/refetch/UserStatusContext';
import { StatusFilterProvider } from '@shared/ui/search_multiple_select/StatusFilterContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeviceStatusProvider } from '@widgets/alkozamki_info/DeviceStatusContext';
import { AutoServiceInfoProvider } from '@widgets/auto_service_info/AutoServiceInfoContext';
import { installOperatorChatPopupResizeObserverErrorGuard } from '@widgets/chat/chatPopup/suppressResizeObserverLoopError';
import { primeElectronOperatorChatPopupAuth } from '@widgets/chat/chatPopup/electronPopupAuth';
import {
  ensureElectronPopupBearerCookie,
  syncElectronPopupBranchFromStorage,
} from '@widgets/chat/chatPopup/electronPopupSessionBootstrap';
import { SocketProvider } from '@widgets/chat/contexts/SocketContext';
import { CountProvider } from '@widgets/nav_bar/api/CountContext';
import { UserContextProvider } from '@widgets/users_info/UserContext';
import { AlkoContextProvider } from '@widgets/vehicles_info/lib/AlkoContext';

import { configLoader } from './config/configLoader';
import './i18n';
import './index.scss';
import * as serviceWorker from './serviceWorker';

if (typeof window !== 'undefined' && window.location.pathname.includes('/operator-chat-popup')) {
  installOperatorChatPopupResizeObserverErrorGuard();
  primeElectronOperatorChatPopupAuth();
  ensureElectronPopupBearerCookie();
  syncElectronPopupBranchFromStorage();
}

const queryClient = new QueryClient();

const AppContent = (
  <>
    <ErrorBoundary>
      <UserProvider>
        <QueryClientProvider client={queryClient}>
          <StyledEngineProvider injectFirst>
            <ColorModeProvider>
              <LocaleThemeProvider>
                <AutoServiceInfoProvider>
                  <UserStatusProvider>
                    <ServiceModeProvider>
                      <UserContextProvider>
                        <CountProvider>
                          <AlkoContextProvider>
                            <StatusFilterProvider>
                              <DeviceStatusProvider>
                                <SocketProvider stompConnect={false}>
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
                                    <AuthSessionSync />
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
              </LocaleThemeProvider>
            </ColorModeProvider>
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
    // eslint-disable-next-line no-console
    console.error(e);
  }

  root.render(
    <React.StrictMode>
      {configLoader.isLoaded() ? (
        AppContent
      ) : (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
          }}>
          <CircularProgress />
        </div>
      )}
    </React.StrictMode>,
  );
}

bootstrap();

serviceWorker.unregister();
