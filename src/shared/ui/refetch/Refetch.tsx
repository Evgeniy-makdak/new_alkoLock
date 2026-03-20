import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ReplayIcon from '@mui/icons-material/Replay';
import { type SvgIconProps, Tooltip } from '@mui/material';

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
  const { t } = useTranslation();
  const [animate, setAnimate] = useState<string | null>(null);

  const onClickAnimate = async () => {
    setAnimate(style.click);
    onClick?.();
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimate(null);
    }, 500);
    return () => clearTimeout(timeout);
  }, [animate]);

  const debounced = debounce({ time: 800, eventHandler: onClickAnimate });

  return (
    <button
      data-testid={testId}
      className={`${style.button} ${styles}`}
      onClick={() => debounced()}>
      <Tooltip title={t('common.refreshList')}>
        <ReplayIcon className={animate || ''} {...rest} />
      </Tooltip>
    </button>
  );
};
