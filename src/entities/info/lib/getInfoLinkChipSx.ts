import type { SxProps, Theme } from '@mui/material/styles';

const chipLabelBase = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  px: 1.25,
} as const;

/** Десктоп: обычные значения в «Инфо» (серый чип 16px, на всю ширину колонки). */
export function getInfoPlainValueChipSx(theme: Theme): SxProps<Theme> {
  const isDark = theme.palette.mode === 'dark';
  return {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
    width: '100%',
    height: '28px',
    borderRadius: '16px',
    justifyContent: 'flex-start',
    ...(isDark
      ? {
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          color: 'rgba(255, 255, 255, 0.92)',
        }
      : { backgroundColor: '#f5f5f5', border: 'none' }),
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
      ...(isDark ? { color: 'rgba(255, 255, 255, 0.92)' } : {}),
    },
  };
}

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
