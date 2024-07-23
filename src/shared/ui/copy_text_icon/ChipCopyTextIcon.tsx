import { useEffect, useState } from 'react';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { Chip, type ChipOwnProps } from '@mui/material';

import { copyContent } from '@shared/lib/copyText';

interface ChipCopyTextIconProps extends ChipOwnProps {
  style?: string;
  copyText?: string | number;
  click?: () => void;
}

export const ChipCopyTextIcon = (props: ChipCopyTextIconProps) => {
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
      icon={<>{!state ? <ContentCopyIcon color="inherit" /> : <DoneAllIcon color="inherit" />}</>}
    />
  );
};
