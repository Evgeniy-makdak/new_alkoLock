import { TextField } from '@mui/material';

import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper/InputsColumnWrapper';
import { testids } from '@shared/const/testid';
import { InputPassword } from '@shared/ui/InputPassword/Input';
import { FormCheckbox } from '@shared/ui/form_checkbox';
import { Loader } from '@shared/ui/loader';
import { Logo } from '@shared/ui/logo';

import { useAuthorization } from '../hooks/useAuthorization';
import style from './Authorization.module.scss';
import { useNavigate } from 'react-router-dom';
import { RoutePaths } from '@shared/config/routePathsEnum';

export const Authorization = () => {
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
      <div className={style.logo}>
        <Logo />
      </div>
      <div className={style.wrapper}>
        <h1 className={style.title}>
          Информационная система <br /> «Алкозамок»
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
                label="Логин"
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
                label="Пароль"
              />
              <FormCheckbox
                checkBox={{
                  onChange: (_e, val) => handleChangeRemember(val),
                  checked: rememberMe,
                }}
                label={'Запомнить меня'}
              />
              <input type="submit" style={{ display: 'none' }} />
            </InputsColumnWrapper>
            <button
              data-testid={testids.page_auth.AUTH_BUTTON_ENTER}
              className={style.button}
              disabled={isLoading}
              type="submit">
              Вход
            </button>
            <button
              data-testid={testids.page_auth.AUTH_BUTTON_ENTER}
              className={style.button_forget}
              disabled={isLoading}
              type="button"
              onClick={handleResetPassword}>
              Восстановить пароль
            </button>
          </form>
        </Loader>
      </div>
    </div>
  );
};
