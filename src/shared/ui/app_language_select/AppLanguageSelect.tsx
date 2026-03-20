import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import CloseIcon from '@mui/icons-material/Close';
import { Dialog, DialogContent, DialogTitle, IconButton, Tooltip } from '@mui/material';

import { APP_LANGUAGES, type AppLanguageCode } from '@shared/config/appLanguages';

import { setStoredLanguage } from '../../../i18n';
import style from './AppLanguageSelect.module.scss';
import { APP_LANGUAGE_FLAG_SRC } from './languageFlagAssets';

type AppLanguageSelectProps = {
  /** Обертка (например, для позиционирования на auth-странице). */
  className?: string;
  /** Доп. класс для кнопки-триггера (раньше — FormControl в навбаре). */
  formControlClassName?: string;
  size?: 'small' | 'medium';
  /** Оставлено для совместимости; модалка сама по ширине контента. */
  fullWidth?: boolean;
  /** Показать название текущего языка справа от флага (как в тултипе). */
  showLanguageName?: boolean;
};

export function AppLanguageSelect({
  className,
  formControlClassName,
  size = 'medium',
  showLanguageName = false,
}: AppLanguageSelectProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const langBase = (i18n.language || 'ru').split('-')[0].toLowerCase();
  const current: AppLanguageCode = APP_LANGUAGES.some((l) => l.code === langBase)
    ? (langBase as AppLanguageCode)
    : 'ru';

  const selectLanguage = (code: AppLanguageCode) => {
    i18n.changeLanguage(code);
    setStoredLanguage(code);
    setOpen(false);
  };

  const triggerClass = [style.trigger, size === 'small' && style.triggerSmall, formControlClassName]
    .filter(Boolean)
    .join(' ');

  const triggerFlagClass = [style.triggerFlag, size === 'small' && style.triggerFlagSmall]
    .filter(Boolean)
    .join(' ');

  const currentLanguageLabel = t(`common.languageName.${current}`);

  const trigger = (
    <Tooltip title={currentLanguageLabel}>
      <button
        type="button"
        className={triggerClass}
        aria-label={currentLanguageLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}>
        <img
          src={APP_LANGUAGE_FLAG_SRC[current]}
          alt=""
          className={triggerFlagClass}
          draggable={false}
        />
      </button>
    </Tooltip>
  );

  return (
    <div className={className}>
      {showLanguageName ? (
        <div className={style.triggerRow}>
          {trigger}
          <span className={style.inlineLanguageName}>{currentLanguageLabel}</span>
        </div>
      ) : (
        trigger
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth={false}
        PaperProps={{ className: style.dialogPaper }}>
        <DialogTitle className={style.dialogTitle} component="div">
          <span>{t('common.language')}</span>
          <Tooltip title={t('common.close')} describeChild>
            <IconButton
              className={style.closeButton}
              aria-label={t('common.close')}
              onClick={() => setOpen(false)}
              size="small">
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </DialogTitle>
        <DialogContent className={style.dialogContent} sx={{ pt: 0 }}>
          <div className={style.grid}>
            {APP_LANGUAGES.map((lang) => {
              const isActive = lang.code === current;
              const label = t(`common.languageName.${lang.code}`);
              return (
                <button
                  key={lang.code}
                  type="button"
                  className={`${style.langItem} ${isActive ? style.langItemActive : ''}`}
                  aria-label={label}
                  onClick={() => selectLanguage(lang.code)}>
                  <span className={style.langFlagCircle}>
                    <img
                      src={APP_LANGUAGE_FLAG_SRC[lang.code]}
                      alt=""
                      className={style.langFlagImg}
                      draggable={false}
                    />
                  </span>
                  <span className={style.langName}>{label}</span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
