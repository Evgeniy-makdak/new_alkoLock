import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { Box, Chip, type ChipOwnProps, IconButton, Tooltip } from '@mui/material';

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
  const hasSemanticColor = Boolean(rest?.color && rest.color !== 'default');

  useEffect(() => {
    if (!state) return;

    const timeout = setTimeout(() => {
      setState(false);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [state]);

  const onCopy = () => copyContent(`${copyText || props.label}`, setState);

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', maxWidth: '100%' }}>
      <Tooltip title={t('tooltips.copy')}>
        <IconButton
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onCopy();
          }}
          sx={{ p: '2px' }}>
          {!state ? (
            <ContentCopyIcon fontSize="inherit" color="inherit" />
          ) : (
            <DoneAllIcon fontSize="inherit" color="inherit" />
          )}
        </IconButton>
      </Tooltip>
      <Chip
        {...rest}
        className={style}
        onClick={click}
        clickable={Boolean(click)}
        sx={{
          maxWidth: '100%',
          height: '28px',
          borderRadius: '16px',
          ...(hasSemanticColor ? {} : { backgroundColor: '#f5f5f5' }),
          '& .MuiChip-label': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            px: 1.25,
          },
          ...(rest.sx as object),
        }}
      />
    </Box>
  );
};
