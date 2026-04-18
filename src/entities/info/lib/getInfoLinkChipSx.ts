import type { SxProps, Theme } from '@mui/material/styles';

const chipLabelBase = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  px: 1.25,
} as const;

/** Чипы-ссылки в карточках «Инфо» (событие, ТС, алкозамок): светлая палитра; в тёмной теме — без «белых» плашек */
export function getInfoLinkChipSx(theme: Theme, _isMobileLayout: boolean): SxProps<Theme> {
  const baseSize = {
    flex: '1 1 auto',
    minWidth: 0,
    maxWidth: 'calc(100% - 28px)',
    height: '28px',
    borderRadius: '16px',
  } as const;

  if (theme.palette.mode === 'dark') {
    return {
      ...baseSize,
      backgroundColor: 'rgba(144, 202, 249, 0.14)',
      borderColor: 'rgba(144, 202, 249, 0.45)',
      '& .MuiChip-label': {
        ...chipLabelBase,
        color: 'rgba(255, 255, 255, 0.92)',
      },
      '&:hover': {
        backgroundColor: 'rgba(144, 202, 249, 0.22)',
        borderColor: 'rgba(144, 202, 249, 0.55)',
      },
    };
  }

  return {
    ...baseSize,
    backgroundColor: '#eef5ff',
    borderColor: '#b8d3ff',
    '& .MuiChip-label': { ...chipLabelBase },
  };
}
