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
