import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { Box, Chip, type ChipOwnProps, IconButton, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { copyContent } from '@shared/lib/copyText';

interface ChipCopyTextIconProps extends ChipOwnProps {
  style?: string;
  copyText?: string | number;
  click?: () => void;
}

export const ChipCopyTextIcon = (props: ChipCopyTextIconProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { copyText, click, style, ...rest } = props;
  const [state, setState] = useState(false);
  const hasSemanticColor = Boolean(rest?.color && rest.color !== 'default');
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    if (!state) return;

    const timeout = setTimeout(() => {
      setState(false);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [state]);

  const onCopy = () => copyContent(`${copyText || props.label}`, setState);

  const baseChipSx = {
    flex: 1,
    minWidth: 0,
    width: '100%',
    maxWidth: '100%',
    height: '28px',
    borderRadius: '16px',
    justifyContent: 'flex-start',
    ...(hasSemanticColor
      ? {}
      : isDark
        ? {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            color: 'rgba(255, 255, 255, 0.92)',
          }
        : { backgroundColor: '#f5f5f5' }),
    '& .MuiChip-label': {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      px: 1.25,
      fontSize: '16px',
      fontWeight: 500,
      textAlign: 'left',
      display: 'block',
      width: '100%',
      ...(!hasSemanticColor && isDark ? { color: 'rgba(255, 255, 255, 0.92)' } : {}),
    },
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', maxWidth: '100%' }}>
      <Tooltip title={t('tooltips.copy')}>
        <IconButton
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onCopy();
          }}
          sx={{ p: '2px', flexShrink: 0 }}>
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
          ...baseChipSx,
          ...(rest.sx as object),
        }}
      />
    </Box>
  );
};
