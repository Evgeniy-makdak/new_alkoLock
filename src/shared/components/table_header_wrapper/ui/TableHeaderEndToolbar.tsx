import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { useMediaQuery } from '@mui/material';

import { pathHasInlineTableToolbar } from '@shared/config/pathHasInlineTableToolbar';
import { ThemeToggleControl } from '@shared/theme/colorMode';
import { AppLanguageSelect } from '@shared/ui/app_language_select';

import { useTableHeaderMobileTrailing } from '../model/TableHeaderMobileTrailingContext';
import style from './TableHeaderEndToolbar.module.scss';

const MAX_WIDTH_INLINE_THEME_LANG = 1024;

interface TableHeaderEndToolbarProps {
  children?: ReactNode;
}

/**
 * Сброс фильтров, затем «тема + язык».
 * На узком экране для inline-таблиц — компактный ряд в шапке (вместе с «+» из контекста), без плавающего слота App.
 */
export const TableHeaderEndToolbar = ({ children }: TableHeaderEndToolbarProps) => {
  const location = useLocation();
  const hideThemeAndLanguage = useMediaQuery(`(max-width: ${MAX_WIDTH_INLINE_THEME_LANG}px)`);
  const hasInlineToolbarRoute = pathHasInlineTableToolbar(location.pathname);
  const showThemeLangCluster = !hideThemeAndLanguage || hasInlineToolbarRoute;
  const compactMobileRow = hideThemeAndLanguage && hasInlineToolbarRoute;
  const hasReset = children != null && children !== false;
  const { trailing } = useTableHeaderMobileTrailing() ?? { trailing: null };

  return (
    <div className={style.endToolbar}>
      {hasReset ? <div className={style.resetSlot}>{children}</div> : null}
      {showThemeLangCluster ? (
        <div
          className={`${style.themeLangCluster} ${hasReset ? style.themeLangClusterSeparated : ''} ${compactMobileRow ? style.themeLangClusterCompact : ''}`}>
          <ThemeToggleControl />
          <AppLanguageSelect appearance="toolbar" size={compactMobileRow ? 'small' : 'medium'} />
          {compactMobileRow && trailing ? (
            <div className={style.mobileTrailingSlot}>{trailing}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
