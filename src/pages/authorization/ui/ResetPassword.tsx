import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { TextField } from '@mui/material';

import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper/InputsColumnWrapper';
import { testids } from '@shared/const/testid';
import { AppLanguageSelect } from '@shared/ui/app_language_select';
import { Loader } from '@shared/ui/loader';
import { Logo } from '@shared/ui/logo';

import { useResetPassword } from '../hooks/useResetPassword';
import style from './Authorization.module.scss';

export const ResetPassword = () => {
  const { t } = useTranslation();
  const { isLoading, handleSubmit, register, errorUsername } = useResetPassword();

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
        <h1 className={style.title}>{t('auth.resetPasswordTitle')}</h1>
        <p className={style.changePassword}>{t('auth.resetPasswordDescription')}</p>
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
              <TextField
                {...register('email')}
                name="email"
                helperText={typeof errorUsername === 'string' ? errorUsername : ''}
                error={!!errorUsername}
                autoComplete="off"
                fullWidth
                type="text"
                variant="outlined"
                label={t('tables.email')}
              />
            </InputsColumnWrapper>
            <button
              data-testid={testids.page_auth.AUTH_BUTTON_ENTER}
              className={style.button}
              disabled={isLoading}
              type="submit">
              {t('auth.send')}
            </button>
          </form>
        </Loader>
      </div>
    </div>
  );
};
