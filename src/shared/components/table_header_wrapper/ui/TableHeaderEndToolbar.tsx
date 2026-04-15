import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { useMediaQuery } from '@mui/material';

import { pathHasInlineTableToolbar } from '@shared/config/pathHasInlineTableToolbar';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { ThemeToggleControl } from '@shared/theme/colorMode';

import { useTableHeaderMobileTrailing } from '../model/TableHeaderMobileTrailingContext';
import style from './TableHeaderEndToolbar.module.scss';

const MAX_WIDTH_INLINE_THEME_LANG = 1024;

interface TableHeaderEndToolbarProps {
  children?: ReactNode;
}

/**
 * Сброс фильтров, затем переключатель темы (язык — только на экране авторизации).
 * На узком экране для inline-таблиц — компактный ряд в шапке (вместе с «+» из контекста), без плавающего слота App.
 */
export const TableHeaderEndToolbar = ({ children }: TableHeaderEndToolbarProps) => {
  const location = useLocation();
  const hideThemeAndLanguage = useMediaQuery(`(max-width: ${MAX_WIDTH_INLINE_THEME_LANG}px)`);
  const hasInlineToolbarRoute = pathHasInlineTableToolbar(location.pathname);
  const showThemeLangCluster = !hideThemeAndLanguage || hasInlineToolbarRoute;
  const compactMobileRow = hideThemeAndLanguage && hasInlineToolbarRoute;
  const { trailing } = useTableHeaderMobileTrailing() ?? { trailing: null };
  const isSettingsRoute =
    location.pathname === RoutePaths.settings ||
    location.pathname.startsWith(`${RoutePaths.settings}/`);
  const showTrailing = !!trailing && !isSettingsRoute;
  const hasReset = children != null && children !== false;

  return (
    <div className={style.endToolbar}>
      {hasReset ? <div className={style.resetSlot}>{children}</div> : null}
      {showThemeLangCluster ? (
        <div
          className={`${style.themeLangCluster} ${hasReset ? style.themeLangClusterSeparated : ''} ${compactMobileRow ? style.themeLangClusterCompact : ''} ${showTrailing && compactMobileRow ? style.themeLangClusterWithTrailing : ''}`}>
          {showTrailing ? <div className={style.mobileTrailingSlot}>{trailing}</div> : null}
          <ThemeToggleControl variant="toolbarCircle" />
        </div>
      ) : null}
    </div>
  );
};
