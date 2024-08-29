import { useEffect, useState } from 'react';

import ReplayIcon from '@mui/icons-material/Replay';
import type { SvgIconProps } from '@mui/material';

import { debounce } from '@shared/lib/debounce';

import style from './Refetch.module.scss';

export const Refetch = ({
  testId,
  onClick,
  rest,
  styles,
}: {
  testId?: string;
  onClick?: () => void;
  rest?: SvgIconProps;
  styles?: string;
}) => {
  const [animate, setAnimate] = useState(null);

  const onClickAnimate = () => {
    setAnimate(style.click);
    onClick();
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimate(null);
    }, 500);
    return () => clearTimeout(timeout);
  }, [animate]);
  const debounced = debounce({ time: 800, eventHandler: onClickAnimate });
  return (
    <>
      <button
        data-testid={testId}
        className={`${style.button} ${styles}`}
        onClick={() => debounced()}>
        <ReplayIcon className={animate} {...rest} />
      </button>
    </>
  );
};
