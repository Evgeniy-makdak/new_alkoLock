import type { ReactNode } from 'react';

import { ThemeToggleControl } from '@shared/theme/colorMode';
import { AppLanguageSelect } from '@shared/ui/app_language_select';

import style from './TableHeaderEndToolbar.module.scss';

interface TableHeaderEndToolbarProps {
  children?: ReactNode;
}

/** Тема → язык → сброс фильтров одним компактным блоком у правого края шапки таблицы. */
export const TableHeaderEndToolbar = ({ children }: TableHeaderEndToolbarProps) => {
  return (
    <div className={style.endToolbar}>
      <ThemeToggleControl />
      <AppLanguageSelect appearance="toolbar" />
      {children}
    </div>
  );
};
