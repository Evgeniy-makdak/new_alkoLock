import type { ReactNode } from 'react';

import style from './TableHeaderWrapper.module.scss';

interface TableHeaderWrapperProps {
  children: ReactNode;
}

export const TableHeaderWrapper = ({ children }: TableHeaderWrapperProps) => {
  return <div className={style.wrapper}>{children}</div>;
};
