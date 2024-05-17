import { ReactNode } from 'react';

import style from './PageWrapper.module.scss';

interface PageWrapperProps {
  children?: ReactNode;
}

export const PageWrapper = ({ children }: PageWrapperProps) => {
  return <div className={style.page}>{children}</div>;
};
