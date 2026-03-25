import { useTranslation } from 'react-i18next';

import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import { IconButton, Tooltip } from '@mui/material';

import { useColorMode } from './ColorModeContext';

/**
 * Второстепенный контрол: фиксируется в области контента (см. App), не конкурирует с навигацией.
 */
export function ThemeToggleControl() {
  const { t } = useTranslation();
  const { mode, toggleColorMode } = useColorMode();

  return (
    <Tooltip title={t('nav.toggleColorMode')} placement="bottom-end">
      <IconButton color="inherit" onClick={toggleColorMode} aria-label={t('nav.toggleColorMode')}>
        {mode === 'dark' ? (
          <LightModeOutlined fontSize="small" />
        ) : (
          <DarkModeOutlined fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );
}
