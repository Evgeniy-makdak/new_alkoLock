import type { SxProps, Theme } from '@mui/material/styles';

/** Обычные значения в «Инфо» (серый чип 16px, на всю ширину колонки). */
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

/** Кликабельные чипы с переходом: размеры как у plain, светло-голубой фон. */
export function getInfoClickableValueChipSx(theme: Theme): SxProps<Theme> {
  const isDark = theme.palette.mode === 'dark';
  const labelSx = {
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
  } as const;

  if (isDark) {
    return {
      flex: 1,
      minWidth: 0,
      maxWidth: '100%',
      width: '100%',
      height: '28px',
      borderRadius: '16px',
      justifyContent: 'flex-start',
      backgroundColor: 'rgba(144, 202, 249, 0.14)',
      border: '1px solid rgba(144, 202, 249, 0.45)',
      '& .MuiChip-label': labelSx,
      '&:hover': {
        backgroundColor: 'rgba(144, 202, 249, 0.22)',
        borderColor: 'rgba(144, 202, 249, 0.55)',
      },
    };
  }

  return {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
    width: '100%',
    height: '28px',
    borderRadius: '16px',
    justifyContent: 'flex-start',
    backgroundColor: '#eef5ff',
    border: '1px solid #b8d3ff',
    '& .MuiChip-label': labelSx,
    '&:hover': {
      backgroundColor: '#e3efff',
      borderColor: '#9fc4ff',
    },
  };
}

/** Компактный чип координат в таблице отчётов — размер шрифта как у ячеек DataGrid. */
export function getReportTableCoordinateChipSx(theme: Theme): SxProps<Theme> {
  const isDark = theme.palette.mode === 'dark';
  const labelSx = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    px: 0.75,
    py: 0,
    fontSize: '0.8125rem',
    fontWeight: 400,
    lineHeight: 1.43,
    textAlign: 'left',
    display: 'block',
    maxWidth: '100%',
    ...(isDark ? { color: 'rgba(255, 255, 255, 0.92)' } : {}),
  } as const;

  if (isDark) {
    return {
      flex: '0 1 auto',
      minWidth: 0,
      maxWidth: '100%',
      width: 'auto',
      height: 24,
      borderRadius: '12px',
      justifyContent: 'flex-start',
      backgroundColor: 'rgba(144, 202, 249, 0.14)',
      border: '1px solid rgba(144, 202, 249, 0.45)',
      '& .MuiChip-label': labelSx,
      '&:hover': {
        backgroundColor: 'rgba(144, 202, 249, 0.22)',
        borderColor: 'rgba(144, 202, 249, 0.55)',
      },
    };
  }

  return {
    flex: '0 1 auto',
    minWidth: 0,
    maxWidth: '100%',
    width: 'auto',
    height: 24,
    borderRadius: '12px',
    justifyContent: 'flex-start',
    backgroundColor: '#eef5ff',
    border: '1px solid #b8d3ff',
    '& .MuiChip-label': labelSx,
    '&:hover': {
      backgroundColor: '#e3efff',
      borderColor: '#9fc4ff',
    },
  };
}