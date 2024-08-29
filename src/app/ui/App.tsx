import { Outlet } from 'react-router-dom';

import { CircularProgress } from '@mui/material';

import { NavBar } from '@widgets/nav_bar';

import { useApp } from '../hooks/useApp';
import style from './app.module.scss';

export function App() {
  const { isLoading } = useApp();

  return (
    <div className={style.app}>
      {isLoading ? (
        <div className={style.loadingPage}>
          <CircularProgress />
        </div>
      ) : (
        <div className={style.main}>
          <NavBar />
          <div className={style.content}>
            <div className={style.contentWrapper}>
              <Outlet />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
