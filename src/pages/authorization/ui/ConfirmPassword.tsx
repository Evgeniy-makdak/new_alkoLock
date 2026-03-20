/* eslint-disable no-console */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper/InputsColumnWrapper';
import { testids } from '@shared/const/testid';
import { InputPassword } from '@shared/ui/InputPassword/Input';
import { AppLanguageSelect } from '@shared/ui/app_language_select';
import { Loader } from '@shared/ui/loader';
import { Logo } from '@shared/ui/logo';

import { useConfirmPassword } from '../hooks/useConfirmPassword';
import style from './Authorization.module.scss';

function formatRemainingMmSs(diffMs: number): string {
  const totalSec = Math.max(0, Math.floor(diffMs / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return `${mm}:${ss}`;
}

export const ConfirmPassword = () => {
  const { t } = useTranslation();
  const {
    isLoading,
    handleSubmit,
    register,
    control,
    errorVerificationCode,
    handleResendCode,
    isResendDisabled,
    secondsLeft,
    codeExpiration,
  } = useConfirmPassword();

  const [countdown, setCountdown] = useState<'expired' | { mmss: string } | null>(null);

  useEffect(() => {
    if (!codeExpiration) return;

    const tick = () => {
      try {
        const expirationDate = new Date(codeExpiration);
        const now = new Date();
        const diffMs = expirationDate.getTime() - now.getTime();
        if (diffMs <= 0) {
          setCountdown('expired');
        } else {
          setCountdown({ mmss: formatRemainingMmSs(diffMs) });
        }
      } catch (e) {
        console.error('Error parsing date:', e);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [codeExpiration]);

  return (
    <div className={style.authorization}>
      <AppLanguageSelect
        className={style.languageSwitcher}
        formControlClassName={style.authLangSelect}
      />
      <div className={style.logo}>
        <Link to="/authorization">
          <Logo />
        </Link>
      </div>
      <div className={style.wrapper}>
        <p className={style.changePassword}>
          {t('auth.confirmCodeIntro')}
          {countdown === 'expired' && (
            <>
              <br />
              <strong>{t('auth.confirmCodeExpired')}</strong>
            </>
          )}
          {countdown && countdown !== 'expired' && (
            <>
              <br />
              {t('auth.confirmCodeValidFor')} <strong>{countdown.mmss}</strong>
            </>
          )}
        </p>
        <Loader isLoading={isLoading} props={{ className: style.loader }}>
          <form
            data-testid={testids.page_auth.AUTH_FORM}
            className={style.form}
            onSubmit={handleSubmit}>
            <InputsColumnWrapper>
              <InputPassword
                helperText={errorVerificationCode}
                {...register('verificationCode', {
                  setValueAs: (value) => value.trim().replace(/\s/g, ''),
                })}
                name="verificationCode"
                control={control}
                autoComplete="off"
                fullWidth
                type="text"
                variant="outlined"
                label={t('auth.confirmCodeLabel')}
                inputProps={{
                  maxLength: 6,
                  onPaste: (e) => {
                    const pastedText = e.clipboardData.getData('text');
                    const cleaned = pastedText.trim().replace(/\s/g, '');
                    e.preventDefault();
                    document.execCommand('insertText', false, cleaned);
                  },
                  onKeyPress: (e) => {
                    if (e.key === ' ') {
                      e.preventDefault();
                    }
                  },
                  onChange: (e) => {
                    const target = e.target as HTMLInputElement;
                    target.value = target.value.replace(/\s/g, '');
                  },
                }}
              />
              <input type="submit" style={{ display: 'none' }} />
            </InputsColumnWrapper>
            <button
              data-testid={testids.page_auth.AUTH_BUTTON_ENTER}
              className={style.button}
              disabled={isLoading}
              type="submit">
              {t('auth.send')}
            </button>
            <button
              data-testid={testids.page_auth.AUTH_BUTTON_ENTER}
              className={style.button}
              disabled={isResendDisabled}
              onClick={handleResendCode}
              type="button">
              {t('auth.resendCode')}
              {isResendDisabled && ` ${t('auth.resendCodeWait', { seconds: secondsLeft })}`}
            </button>
          </form>
        </Loader>
      </div>
    </div>
  );
};
