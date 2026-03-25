import type { ReactNode } from 'react';

import { useMediaQuery } from '@mui/material';

import { ThemeToggleControl } from '@shared/theme/colorMode';
import { AppLanguageSelect } from '@shared/ui/app_language_select';

import style from './TableHeaderEndToolbar.module.scss';

/** Совпадает с мобильной шапкой таблицы и NavBar — тема/язык только в плавающем слоте App. */
const MAX_WIDTH_INLINE_THEME_LANG = 1024;

interface TableHeaderEndToolbarProps {
  children?: ReactNode;
}

/** Сброс фильтров, затем отступ и блок «тема + язык» (только широкий экран). */
export const TableHeaderEndToolbar = ({ children }: TableHeaderEndToolbarProps) => {
  const hideThemeAndLanguage = useMediaQuery(`(max-width: ${MAX_WIDTH_INLINE_THEME_LANG}px)`);
  const hasReset = children != null && children !== false;

  return (
    <div className={style.endToolbar}>
      {hasReset ? <div className={style.resetSlot}>{children}</div> : null}
      {!hideThemeAndLanguage ? (
        <div
          className={`${style.themeLangCluster} ${hasReset ? style.themeLangClusterSeparated : ''}`}>
          <ThemeToggleControl />
          <AppLanguageSelect appearance="toolbar" />
        </div>
      ) : null}
    </div>
  );
};
