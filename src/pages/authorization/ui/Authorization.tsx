import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import { IconButton, TextField, Tooltip } from '@mui/material';

import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper/InputsColumnWrapper';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { testids } from '@shared/const/testid';
import { useColorMode } from '@shared/theme/colorMode';
import { InputPassword } from '@shared/ui/InputPassword/Input';
import { AppLanguageSelect } from '@shared/ui/app_language_select';
import { FormCheckbox } from '@shared/ui/form_checkbox';
import { Loader } from '@shared/ui/loader';
import { Logo } from '@shared/ui/logo';

import { useAuthorization } from '../hooks/useAuthorization';
import style from './Authorization.module.scss';

export const Authorization = () => {
  const { t } = useTranslation();
  const { mode, toggleColorMode } = useColorMode();
  const {
    isLoading,
    handleSubmit,
    register,
    control,
    errorPassword,
    errorUsername,
    rememberMe,
    handleChangeRemember,
  } = useAuthorization();

  const navigate = useNavigate();

  const handleResetPassword = () => {
    navigate(RoutePaths.resetPassword);
  };

  return (
    <div className={style.authorization}>
      <div className={style.topRight}>
        <Tooltip title={t('nav.toggleColorMode')} placement="bottom">
          <IconButton
            size="small"
            color="inherit"
            onClick={toggleColorMode}
            className={style.themeToggle}
            aria-label={t('nav.toggleColorMode')}>
            {mode === 'dark' ? <LightModeOutlined /> : <DarkModeOutlined />}
          </IconButton>
        </Tooltip>
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
            onSubmit={handleSubmit}>
            <InputsColumnWrapper>
              <TextField
                {...register('username')}
                name="username"
                helperText={errorUsername}
                error={!!errorUsername}
                autoComplete="off"
                fullWidth
                type={'text'}
                variant={'outlined'}
                label={t('auth.login')}
              />
              <InputPassword
                helperText={errorPassword}
                error={!!errorPassword}
                {...register('password')}
                name="password"
                control={control}
                autoComplete="off"
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
              className={style.button_forget}
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
