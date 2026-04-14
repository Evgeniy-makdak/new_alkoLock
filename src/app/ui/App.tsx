import { Outlet, useLocation } from 'react-router-dom';

import { CircularProgress, useMediaQuery } from '@mui/material';

import { isGhostPrankGloballyDisabled } from '@pages/events/config/eventsGhostPrankEnabled';
import { EventsGhostPrank } from '@pages/events/ui/EventsGhostPrank';
import { GlobalReportProgress } from '@pages/reports/ui/GlobalReportProgress';
import { TableHeaderMobileTrailingProvider } from '@shared/components/table_header_wrapper/model/TableHeaderMobileTrailingContext';
import { pathHasInlineTableToolbar } from '@shared/config/pathHasInlineTableToolbar';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { ThemeToggleControl, useColorMode } from '@shared/theme/colorMode';
import ChatFooter from '@widgets/chat/chatFooter/ChatFooter';
import { NavBar } from '@widgets/nav_bar';
import { breakpoints } from '@widgets/nav_bar/breakpoints';
import { RoleChipStyles } from '@widgets/users_table/ui/RoleChipStyles';

import { useApp } from '../hooks/useApp';
import style from './app.module.scss';

export function App() {
  const { isLoading } = useApp();
  const { mode } = useColorMode();
  const location = useLocation();
  const isMobile = useMediaQuery(breakpoints.mobile);
  const isTablet = useMediaQuery(breakpoints.tablet);
  const isNarrowViewport = isMobile || isTablet;
  const hasInlineTableToolbar = pathHasInlineTableToolbar(location.pathname);
  const hideLanguageOnMap = location.pathname === RoutePaths.map;
  const themeSlotMapMobile = hideLanguageOnMap && isNarrowViewport;
  /** На широкой карте переключатель темы в MapControls, не в плавающем слоте */
  const themeInMapToolbar = hideLanguageOnMap && !isNarrowViewport;
  const isMessagesRoute =
    location.pathname === RoutePaths.messages ||
    location.pathname.startsWith(`${RoutePaths.messages}/`);
  const isSettingsRoute =
    location.pathname === RoutePaths.settings ||
    location.pathname.startsWith(`${RoutePaths.settings}/`);
  const needsMobileFloatingTheme =
    isMobile && hasInlineTableToolbar && !isMessagesRoute && !isSettingsRoute;
  const noAddMobileThemeRoutePrefixes = [
    RoutePaths.events,
    RoutePaths.reports,
    RoutePaths.autoService,
    RoutePaths.historyAutoService,
  ] as const;
  const themeSlotPhoneInlineFlushRight =
    needsMobileFloatingTheme &&
    noAddMobileThemeRoutePrefixes.some(
      (base) => location.pathname === base || location.pathname.startsWith(`${base}/`),
    );
  const themeSlotPhoneInlineWithAdd = needsMobileFloatingTheme && !themeSlotPhoneInlineFlushRight;

  const showFloatingThemeSlot =
    (!hasInlineTableToolbar && !themeInMapToolbar) || needsMobileFloatingTheme;

  return (
    <div className={`${style.app} ${mode === 'dark' ? style.appDark : ''}`}>
      <GlobalReportProgress />
      {isLoading ? (
        <div className={style.loadingPage}>
          <CircularProgress />
        </div>
      ) : (
        <div className={style.main}>
          <NavBar />
          <div className={style.content}>
            {showFloatingThemeSlot ? (
              <div
                className={`${style.themeToggleSlot} ${isNarrowViewport && !themeSlotMapMobile ? style.themeToggleSlotNarrow : ''} ${themeSlotMapMobile ? style.themeToggleSlotMapMobile : ''} ${themeSlotPhoneInlineWithAdd ? style.themeToggleSlotPhoneInlineWithAdd : ''} ${themeSlotPhoneInlineFlushRight ? style.themeToggleSlotPhoneInlineFlushRight : ''}`}>
                <ThemeToggleControl variant="toolbarCircle" />
              </div>
            ) : null}
            <RoleChipStyles />
            <TableHeaderMobileTrailingProvider>
              <div className={style.contentWrapper}>
                <Outlet />
                {isGhostPrankGloballyDisabled() ? null : <EventsGhostPrank />}
              </div>
            </TableHeaderMobileTrailingProvider>
            <ChatFooter />
          </div>
        </div>
      )}
    </div>
  );
}
