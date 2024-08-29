import type { ReactNode } from 'react';

import style from './InputsColumnWrapper.module.scss';

export const InputsColumnWrapper = ({
  children,
  classN,
  ...rest
}: {
  children?: ReactNode;
  classN?: string;
}) => {
  return (
    <div className={`${style.inputsWrapper} ${classN}`} {...rest}>
      {children}
    </div>
  );
};
