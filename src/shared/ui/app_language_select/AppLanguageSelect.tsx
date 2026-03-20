import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';

import { APP_LANGUAGES, type AppLanguageCode } from '@shared/config/appLanguages';

import { setStoredLanguage } from '../../../i18n';

type AppLanguageSelectProps = {
  /** Обертка (например, для позиционирования на auth-странице). */
  className?: string;
  /** Класс для FormControl (ширина, шрифт в навбаре). */
  formControlClassName?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
};

export function AppLanguageSelect({
  className,
  formControlClassName,
  size = 'small',
  fullWidth = true,
}: AppLanguageSelectProps) {
  const { t, i18n } = useTranslation();
  const labelId = useId();

  const langBase = (i18n.language || 'ru').split('-')[0].toLowerCase();
  const current: AppLanguageCode = APP_LANGUAGES.some((l) => l.code === langBase)
    ? (langBase as AppLanguageCode)
    : 'ru';

  return (
    <div className={className}>
      <FormControl size={size} fullWidth={fullWidth} className={formControlClassName}>
        <InputLabel id={labelId}>{t('common.language')}</InputLabel>
        <Select
          labelId={labelId}
          label={t('common.language')}
          value={current}
          onChange={(e) => {
            const code = e.target.value as string;
            i18n.changeLanguage(code);
            setStoredLanguage(code);
          }}
          MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}>
          {APP_LANGUAGES.map(({ code, label }) => (
            <MenuItem key={code} value={code}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
}
