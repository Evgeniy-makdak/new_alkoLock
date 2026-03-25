import { Outlet } from 'react-router-dom';

import { CircularProgress } from '@mui/material';

import { useColorMode } from '@shared/theme/colorMode';
import ChatFooter from '@widgets/chat/chatFooter/ChatFooter';
import { NavBar } from '@widgets/nav_bar';
import { RoleChipStyles } from '@widgets/users_table/ui/RoleChipStyles';

import { useApp } from '../hooks/useApp';
import style from './app.module.scss';

export function App() {
  const { isLoading } = useApp();
  const { mode } = useColorMode();

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
