import { Outlet, useLocation } from 'react-router-dom';

import { CircularProgress, useMediaQuery } from '@mui/material';

import { isGhostPrankGloballyDisabled } from '@pages/events/config/eventsGhostPrankEnabled';
import { EventsGhostPrank } from '@pages/events/ui/EventsGhostPrank';
import { TableHeaderMobileTrailingProvider } from '@shared/components/table_header_wrapper/model/TableHeaderMobileTrailingContext';
import { pathHasInlineTableToolbar } from '@shared/config/pathHasInlineTableToolbar';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { DesktopUiOverlayCloser } from '@shared/components/desktop_ui_overlay_closer/DesktopUiOverlayCloser';
import { ThemeToggleControl, useColorMode } from '@shared/theme/colorMode';
import ChatFooter from '@widgets/chat/chatFooter/ChatFooter';
import { useSuppressMainChatFooterForPopup } from '@widgets/chat/chatPopup/useSuppressMainChatFooterForPopup';
import { NavBar } from '@widgets/nav_bar';
import { breakpoints } from '@widgets/nav_bar/breakpoints';
import { RoleChipStyles } from '@widgets/users_table/ui/RoleChipStyles';

import { useApp } from '../hooks/useApp';
import style from './app.module.scss';

export function App() {
  const { isLoading } = useApp();
  const { mode } = useColorMode();
  const location = useLocation();
  const isMobile = useMediaQuery(breakpoints.mobile, { noSsr: true });
  const isTablet = useMediaQuery(breakpoints.tablet, { noSsr: true });
  const isNarrowViewport = isMobile || isTablet;
  const hasInlineTableToolbar = pathHasInlineTableToolbar(location.pathname);
  const isMessagesRoute =
    location.pathname === RoutePaths.templates ||
    location.pathname.startsWith(`${RoutePaths.templates}/`);
  const isSettingsRoute =
    location.pathname === RoutePaths.settings ||
    location.pathname.startsWith(`${RoutePaths.settings}/`);
  const isOperatorChatPopupRoute = location.pathname === RoutePaths.operatorChatPopup;
  const suppressMainChatFooter = useSuppressMainChatFooterForPopup(isOperatorChatPopupRoute);
  const showChatFooter = isOperatorChatPopupRoute || !suppressMainChatFooter;
  const hideLanguageOnMap = location.pathname === RoutePaths.map;
  const themeSlotMapMobile = hideLanguageOnMap && isNarrowViewport;
  /** На широкой карте переключатель темы в MapControls, не в плавающем слоте */
  const themeInMapToolbar = hideLanguageOnMap && !isNarrowViewport;
  const needsMobileFloatingTheme =
    isMobile && hasInlineTableToolbar && !isMessagesRoute && !isSettingsRoute;
  const themeSlotPhoneInlineFlushRight = needsMobileFloatingTheme;
  const themeSlotPhoneInlineWithAdd = false;

  const showFloatingThemeSlot =
    !isOperatorChatPopupRoute &&
    ((!hasInlineTableToolbar && !themeInMapToolbar) || needsMobileFloatingTheme);

  return (
    <div
      className={`${style.app} ${mode === 'dark' ? style.appDark : ''} ${
        isOperatorChatPopupRoute ? style.appOperatorChatPopup : ''
      }`}>
      <DesktopUiOverlayCloser />
      {isLoading ? (
        <div className={style.loadingPage}>
          <CircularProgress />
        </div>
      ) : (
        <div className={`${style.main} ${isOperatorChatPopupRoute ? style.mainOperatorChatPopup : ''}`}>
          {!isOperatorChatPopupRoute ? <NavBar /> : null}
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
            {showChatFooter ? <ChatFooter /> : null}
          </div>
        </div>
      )}
    </div>
  );
}
