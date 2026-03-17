/* eslint-disable no-console */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper/InputsColumnWrapper';
import { testids } from '@shared/const/testid';
import { InputPassword } from '@shared/ui/InputPassword/Input';
import { Loader } from '@shared/ui/loader';
import { Logo } from '@shared/ui/logo';

import { useConfirmPassword } from '../hooks/useConfirmPassword';
import style from './Authorization.module.scss';

export const ConfirmPassword = () => {
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

  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!codeExpiration) return;

    const interval = setInterval(() => {
      try {
        const expirationDate = new Date(codeExpiration);
        const now = new Date();
        const diffMs = expirationDate.getTime() - now.getTime();

        if (diffMs <= 0) {
          setTimeLeft('Код больше не действителен');
          clearInterval(interval);
          return;
        }

        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);

        const minsText = diffMins > 0 ? `${diffMins} ${getMinutesText(diffMins)}` : '';
        const secsText = diffSecs > 0 ? `${diffSecs} ${getSecondsText(diffSecs)}` : '';

        setTimeLeft(`${minsText}${minsText && secsText ? ' ' : ''}${secsText}`);
      } catch (e) {
        console.error('Error parsing date:', e);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [codeExpiration]);

  const getMinutesText = (mins: number) => {
    if (mins % 10 === 1 && mins % 100 !== 11) return 'минуты';
    if ([2, 3, 4].includes(mins % 10) && ![12, 13, 14].includes(mins % 100)) return 'минут';
    return 'минут';
  };

  const getSecondsText = (secs: number) => {
    if (secs % 10 === 1 && secs % 100 !== 11) return 'секунды';
    if ([2, 3, 4].includes(secs % 10) && ![12, 13, 14].includes(secs % 100)) return 'секунд';
    return 'секунд';
  };

  return (
    <div className={style.authorization}>
      <div className={style.logo}>
        <Link to="/authorization">
          <Logo />
        </Link>
      </div>
      <div className={style.wrapper}>
        <p className={style.changePassword}>
          Введите 6-значный код, полученный в письме, отправленном на Ваш электронный адрес.
          <br />
          {timeLeft && (
            <>
              Код действителен в течение <strong>{timeLeft}</strong>
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
                label="Код подтверждения"
                inputProps={{
                  maxLength: 6,
                  onPaste: (e) => {
                    const pastedText = e.clipboardData.getData('text');
                    const cleaned = pastedText.trim().replace(/\s/g, '');
                    e.preventDefault();
                    document.execCommand('insertText', false, cleaned);
                  },
                  onKeyPress: (e) => {
                    // Блокируем ввод пробела
                    if (e.key === ' ') {
                      e.preventDefault();
                    }
                  },
                  onChange: (e) => {
                    // Автоматически удаляем пробелы при ручном вводе
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
              Отправить
            </button>
            <button
              data-testid={testids.page_auth.AUTH_BUTTON_ENTER}
              className={style.button}
              disabled={isResendDisabled}
              onClick={handleResendCode}
              type="button">
              Выслать проверочный код повторно {isResendDisabled && `(${secondsLeft} сек)`}
            </button>
          </form>
        </Loader>
      </div>
    </div>
  );
};
