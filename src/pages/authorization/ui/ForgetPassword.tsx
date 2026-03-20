import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper/InputsColumnWrapper';
import { testids } from '@shared/const/testid';
import { InputPassword } from '@shared/ui/InputPassword/Input';
import { AppLanguageSelect } from '@shared/ui/app_language_select';
import { Loader } from '@shared/ui/loader';
import { Logo } from '@shared/ui/logo';

import { useForgetPassword } from '../hooks/useForgetPassword';
import style from './Authorization.module.scss';

export const ForgetPassword = () => {
  const { t } = useTranslation();
  const { isLoading, handleSubmit, register, control, errorNewPassword, errorRepeatNewPassword } =
    useForgetPassword();

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
        <h1 className={style.title}>{t('auth.setPasswordTitle')}</h1>
        <p className={style.changePassword}>
          {t('auth.setPasswordLine1')} <br />
          {t('auth.setPasswordLine2')} <br />
          {t('auth.setPasswordLine3')}
        </p>
        <Loader
          isLoading={isLoading}
          props={{
            className: style.loader,
          }}>
          <form
            data-testid={testids.page_auth.AUTH_FORM}
            className={style.form}
            onSubmit={handleSubmit}>
            <InputsColumnWrapper>
              <InputPassword
                helperText={errorNewPassword as React.ReactNode}
                error={!!errorNewPassword}
                {...register('newPassword')}
                name="newPassword"
                //@ts-expect-error: временное решение
                control={control}
                autoComplete="off"
                fullWidth
                type="password"
                variant="outlined"
                label={t('passwordForm.newPassword')}
              />
              <InputPassword
                helperText={errorRepeatNewPassword as React.ReactNode}
                error={!!errorRepeatNewPassword}
                {...register('repeatNewPassword')}
                name="repeatNewPassword"
                //@ts-expect-error: временное решение
                control={control}
                autoComplete="off"
                fullWidth
                type="password"
                variant="outlined"
                label={t('auth.confirmNewPassword')}
              />
              <input type="submit" style={{ display: 'none' }} />
            </InputsColumnWrapper>
            <button
              data-testid={testids.page_auth.AUTH_BUTTON_ENTER}
              className={style.button}
              disabled={isLoading}
              type="submit">
              {t('auth.setNewPassword')}
            </button>
          </form>
        </Loader>
      </div>
    </div>
  );
};
