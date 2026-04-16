import { useTranslation } from 'react-i18next';

import BrightnessAutoOutlined from '@mui/icons-material/BrightnessAutoOutlined';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import { IconButton, Tooltip } from '@mui/material';

import { useColorMode } from './ColorModeContext';
import style from './ThemeToggleControl.module.scss';

export type ThemeToggleVariant = 'default' | 'toolbarCircle';

type ThemeToggleControlProps = {
  /** toolbarCircle — круг с обводкой как у кнопки «+» в шапках таблиц */
  variant?: ThemeToggleVariant;
};

/**
 * Второстепенный контрол: фиксируется в области контента (см. App), не конкурирует с навигацией.
 */
export function ThemeToggleControl({ variant = 'default' }: ThemeToggleControlProps) {
  const { t } = useTranslation();
  const { mode, preference, toggleColorMode } = useColorMode();
  const circle = variant === 'toolbarCircle';
  const iconSx = circle ? { fontSize: '1.125rem' } : undefined;
  const nextPreference = preference === 'light' ? 'dark' : preference === 'dark' ? 'auto' : 'light';

  const tooltipTitle =
    preference === 'auto'
      ? `${t('nav.toggleColorMode')} (${t('nav.themeAutoBySystem')}: ${mode})`
      : `${t('nav.toggleColorMode')} (${preference})`;

  return (
    <Tooltip title={tooltipTitle} placement="bottom-end">
      <IconButton
        color="inherit"
        onClick={toggleColorMode}
        aria-label={`${t('nav.toggleColorMode')}. Next: ${nextPreference}`}
        className={circle ? style.toolbarCircle : undefined}
        size={circle ? 'medium' : 'medium'}
        sx={
          circle
            ? {
                '&.MuiIconButton-root': {
                  borderRadius: '50%',
                },
              }
            : undefined
        }>
        {preference === 'auto' ? (
          <BrightnessAutoOutlined fontSize={circle ? 'small' : 'small'} sx={iconSx} />
        ) : mode === 'dark' ? (
          <LightModeOutlined fontSize={circle ? 'small' : 'small'} sx={iconSx} />
        ) : (
          <DarkModeOutlined fontSize={circle ? 'small' : 'small'} sx={iconSx} />
        )}
      </IconButton>
    </Tooltip>
  );
}
