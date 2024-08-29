import { ReactNode } from 'react';
import LoadingOverlay, { type LoadingOverLayProps } from 'react-loading-overlay-ts';

import CircularProgress from '@mui/material/CircularProgress';

import style from './Loader.module.scss';

interface LoaderProps extends LoadingOverLayProps {
  children: ReactNode;
  styles?: React.CSSProperties;
  isLoading?: boolean;
  testid?: string;
  props?: LoadingOverLayProps;
}

export const Loader = ({
  children,
  isLoading = false,
  styles = {},
  testid,
  props,
}: LoaderProps) => {
  return (
    <LoadingOverlay
      {...props}
      data-testid={testid}
      active={isLoading}
      spinner={<CircularProgress />}
      className={`${props?.className} ${style.loader}`}
      styles={{
        overlay: (base: React.CSSProperties) => ({
          ...base,
          backdropFilter: 'blur(1px)',
          background: 'rgba(255, 255, 255, 0.65)',
          ...styles,
        }),
      }}
      fadeSpeed={100}>
      {children}
    </LoadingOverlay>
  );
};
