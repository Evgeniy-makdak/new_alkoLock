import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ReplayIcon from '@mui/icons-material/Replay';
import { type SvgIconProps, Tooltip } from '@mui/material';

import { debounce } from '@shared/lib/debounce';

import style from './Refetch.module.scss';

export const Refetch = ({
  testId,
  onClick,
  disabled,
  rest,
  styles,
}: {
  testId?: string;
  onClick?: () => void;
  disabled?: boolean;
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
    <Tooltip title={t('common.refreshList')}>
      <button
        type="button"
        data-testid={testId}
        className={`${style.button} ${styles}`}
        disabled={disabled}
        onClick={() => debounced()}>
        <ReplayIcon className={animate || ''} {...rest} />
      </button>
    </Tooltip>
  );
};
