import type { ReactNode } from 'react';

import style from './ButtonFormWrapper.module.scss';

interface ButtonFormWrapperProps {
  children: ReactNode;
}

export const ButtonFormWrapper = ({ children }: ButtonFormWrapperProps) => {
  return <div className={style.buttonWrapper}>{children}</div>;
};
