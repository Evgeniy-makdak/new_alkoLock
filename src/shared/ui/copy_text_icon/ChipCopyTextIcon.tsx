import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { Chip, type ChipOwnProps, Tooltip } from '@mui/material';

import { copyContent } from '@shared/lib/copyText';

interface ChipCopyTextIconProps extends ChipOwnProps {
  style?: string;
  copyText?: string | number;
  click?: () => void;
}

export const ChipCopyTextIcon = (props: ChipCopyTextIconProps) => {
  const { t } = useTranslation();
  const { copyText, click, style, ...rest } = props;
  const [state, setState] = useState(false);

  useEffect(() => {
    if (!state) return;

    const timeout = setTimeout(() => {
      setState(false);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [state]);

  return (
    <Chip
      {...rest}
      className={style}
      onClick={() => (copyContent(`${copyText || props.label}`, setState), click && click())}
      clickable
      icon={
        <Tooltip title={t('tooltips.copy')}>
          {!state ? <ContentCopyIcon color="inherit" /> : <DoneAllIcon color="inherit" />}
        </Tooltip>
      }
    />
  );
};
