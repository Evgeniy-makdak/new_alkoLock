import { ReactNode } from 'react';

import style from './FilterPanel.module.scss';

interface FilterPanelProps {
  children: ReactNode;
}

export const FilterPanel = ({ children }: FilterPanelProps) => {
  return <div className={style.wrapper}>{children}</div>;
};
