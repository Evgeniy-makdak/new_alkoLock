import { Outlet, useLocation } from 'react-router-dom';

import { CircularProgress } from '@mui/material';

import { pathHasInlineTableToolbar } from '@shared/config/pathHasInlineTableToolbar';
import { ThemeToggleControl, useColorMode } from '@shared/theme/colorMode';
import { AppLanguageSelect } from '@shared/ui/app_language_select';
import ChatFooter from '@widgets/chat/chatFooter/ChatFooter';
import { NavBar } from '@widgets/nav_bar';
import { RoleChipStyles } from '@widgets/users_table/ui/RoleChipStyles';

import { useApp } from '../hooks/useApp';
import style from './app.module.scss';

export function App() {
  const { isLoading } = useApp();
  const { mode } = useColorMode();
  const location = useLocation();
  const showFloatingThemeSlot = !pathHasInlineTableToolbar(location.pathname);

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
            {showFloatingThemeSlot ? (
              <div className={style.themeToggleSlot}>
                <ThemeToggleControl />
                <AppLanguageSelect appearance="toolbar" />
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
