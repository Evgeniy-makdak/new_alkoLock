import type { Theme } from '@mui/material/styles';

/** Единый стиль круглой кнопки «+» / темы в шапках таблиц (как на «Шаблоны сообщений»). */
export function getToolbarCircleIconButtonSx(theme: Theme) {
  const isDark = theme.palette.mode === 'dark';
  return {
    width: 40,
    height: 40,
    padding: 0,
    flexShrink: 0,
    borderRadius: '50%',
    backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
    border: `1px solid ${isDark ? '#424242' : '#e0e0e0'}`,
    color: isDark ? 'rgba(255, 255, 255, 0.78)' : 'rgba(0, 0, 0, 0.54)',
    '&:hover': {
      backgroundColor: isDark ? '#333' : '#e0e0e0',
    },
  } as const;
}

/** Текстовая кнопка в шапке — те же фон/обводка, что у ThemeToggleControl (toolbarCircle). */
export function getToolbarSecondaryButtonSx(theme: Theme) {
  const isDark = theme.palette.mode === 'dark';
  return {
    textTransform: 'capitalize',
    fontWeight: 500,
    fontSize: '14px',
    letterSpacing: '0.1px',
    borderRadius: '10px',
    height: '30px',
    minWidth: '160px',
    boxShadow: 'none',
    backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
    border: `1px solid ${isDark ? '#424242' : '#e0e0e0'}`,
    color: isDark ? 'rgba(255, 255, 255, 0.87)' : 'rgba(0, 0, 0, 0.87)',
    '&:hover': {
      backgroundColor: isDark ? '#333' : '#e0e0e0',
      boxShadow: 'none',
    },
    '&.Mui-disabled': {
      backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
      color: isDark ? 'rgba(255, 255, 255, 0.38)' : 'rgba(0, 0, 0, 0.38)',
      borderColor: isDark ? '#424242' : '#e0e0e0',
    },
    '& .MuiButton-startIcon': {
      color: 'inherit',
    },
  } as const;
}
