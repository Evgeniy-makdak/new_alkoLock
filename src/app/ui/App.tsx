import { Outlet, useLocation } from 'react-router-dom';

import { CircularProgress, useMediaQuery } from '@mui/material';

import { pathHasInlineTableToolbar } from '@shared/config/pathHasInlineTableToolbar';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { ThemeToggleControl, useColorMode } from '@shared/theme/colorMode';
import { AppLanguageSelect } from '@shared/ui/app_language_select';
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
  const showFloatingThemeSlot = !pathHasInlineTableToolbar(location.pathname) || isNarrowViewport;

  /** Только «Шаблоны сообщений»: на телефоне тема/язык — второй ряд под полем поиска */
  const themeSlotBelowMobileSearch =
    isMobile && showFloatingThemeSlot && location.pathname === RoutePaths.messages;

  const hideLanguageOnMap = location.pathname === RoutePaths.map;
  /** Карта на desktop: тема рядом со сбросом фильтров в MapControls, не в плавающем слоте */
  const themeInMapToolbar = hideLanguageOnMap && !isNarrowViewport;
  const showThemeInFloatingSlot = !themeInMapToolbar;
  const showLangInFloatingSlot = !hideLanguageOnMap;

  return (
    <div className={`${style.app} ${mode === 'dark' ? style.appDark : ''}`}>
      {isLoading ? (
        <div className={style.loadingPage}>
          <CircularProgress />
        </div>
      ) : (
        <div className={style.main}>
          <NavBar />
          <div className={style.content}>
            {showFloatingThemeSlot && (showThemeInFloatingSlot || showLangInFloatingSlot) ? (
              <div
                className={`${style.themeToggleSlot} ${isNarrowViewport ? style.themeToggleSlotNarrow : ''} ${themeSlotBelowMobileSearch ? style.themeToggleSlotBelowSearchRow : ''}`}>
                {showThemeInFloatingSlot ? <ThemeToggleControl /> : null}
                {showLangInFloatingSlot ? <AppLanguageSelect appearance="toolbar" /> : null}
              </div>
            ) : null}
            <RoleChipStyles />
            <div className={style.contentWrapper}>
              <Outlet />
            </div>
            <ChatFooter />
          </div>
        </div>
      )}
    </div>
  );
}
