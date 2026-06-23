import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import { Autocomplete, TextField } from '@mui/material';

import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper/InputsColumnWrapper';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { testids } from '@shared/const/testid';
import { ThemeToggleControl } from '@shared/theme/colorMode';
import { InputPassword } from '@shared/ui/InputPassword/Input';
import { AppLanguageSelect } from '@shared/ui/app_language_select';
import { FormCheckbox } from '@shared/ui/form_checkbox';
import { Loader } from '@shared/ui/loader';
import { Logo } from '@shared/ui/logo';

import { useAuthorization } from '../hooks/useAuthorization';
import style from './Authorization.module.scss';

export const Authorization = () => {
  const { t } = useTranslation();
  const {
    isLoading,
    handleSubmit,
    register,
    control,
    errorPassword,
    errorUsername,
    rememberMe,
    handleChangeRemember,
    rememberedUsernames,
    handleUsernameChange,
    usernameValue,
  } = useAuthorization();

  const navigate = useNavigate();

  const handleResetPassword = () => {
    navigate(RoutePaths.resetPassword);
  };

  return (
    <div className={style.authorization}>
      <div className={style.topRight}>
        <div className={style.themeToggle}>
          <ThemeToggleControl />
        </div>
        <AppLanguageSelect
          className={style.languageSwitcher}
          formControlClassName={style.authLangSelect}
        />
      </div>
      <div className={style.logo}>
        <Link to="/authorization">
          <Logo />
        </Link>
      </div>
      <div className={style.wrapper}>
        <h1 className={style.title}>
          {t('auth.title')} <br /> {t('auth.titleProduct')}
        </h1>

        <Loader
          isLoading={isLoading}
          props={{
            className: style.loader,
          }}>
          <form
            data-testid={testids.page_auth.AUTH_FORM}
            className={style.form}
            autoComplete="on"
            onSubmit={handleSubmit}>
            <InputsColumnWrapper>
              <Autocomplete
                freeSolo
                openOnFocus
                clearOnBlur={false}
                options={rememberedUsernames}
                filterOptions={(options) => options}
                value={usernameValue}
                onChange={(_event, value) => handleUsernameChange(typeof value === 'string' ? value : '')}
                onInputChange={(_event, value, reason) => {
                  if (reason === 'input' || reason === 'clear' || reason === 'reset') {
                    handleUsernameChange(value ?? '');
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    name="username"
                    helperText={errorUsername}
                    error={!!errorUsername}
                    autoComplete="username"
                    fullWidth
                    type="text"
                    variant="outlined"
                    label={t('auth.login')}
                  />
                )}
              />
              <InputPassword
                helperText={errorPassword}
                error={!!errorPassword}
                {...register('password')}
                name="password"
                control={control}
                autoComplete="current-password"
                fullWidth
                type={'password'}
                variant={'outlined'}
                label={t('auth.password')}
              />
              <FormCheckbox
                checkBox={{
                  onChange: (_e, val) => handleChangeRemember(val),
                  checked: rememberMe,
                }}
                label={t('auth.rememberMe')}
              />
              <input type="submit" style={{ display: 'none' }} />
            </InputsColumnWrapper>
            <button
              data-testid={testids.page_auth.AUTH_BUTTON_ENTER}
              className={style.button}
              disabled={isLoading}
              type="submit">
              {t('auth.enter')}
            </button>
            <button
              data-testid={testids.page_auth.AUTH_BUTTON_ENTER}
              className={style.buttonForget}
              disabled={isLoading}
              type="button"
              onClick={handleResetPassword}>
              {t('auth.resetPassword')}
            </button>
          </form>
        </Loader>

        <div className={style.copyright}>
          {t('auth.copyright', { year: new Date().getFullYear() })}
        </div>
      </div>
    </div>
  );
};
