import { ReactNode } from 'react';

interface TableControlWrapperProps {
  children: ReactNode;
  style?: string;
}

export const TableControlWrapper = ({ children, style }: TableControlWrapperProps) => {
  return <div className={style}>{children}</div>;
};
