import { TextField } from '@mui/material';

import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper/InputsColumnWrapper';
import { testids } from '@shared/const/testid';
import { Loader } from '@shared/ui/loader';
import { Logo } from '@shared/ui/logo';

import { useResetPassword } from '../hooks/useResetPassword';
import style from './Authorization.module.scss';

export const ResetPassword = () => {
  const { isLoading, handleSubmit, register, errorUsername } = useResetPassword();

  return (
    <div className={style.authorization}>
      <div className={style.logo}>
        <Logo />
      </div>
      <div className={style.wrapper}>
        <h1 className={style.title}>Восстановление пароля</h1>
        <p className={style.changePassword}>
          Введите email пользователя,
          <br />
          зарегистрированного в системе, для отправки
          <br />
          ссылки на восстановления пароля.
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
            </InputsColumnWrapper>
            <button
              data-testid={testids.page_auth.AUTH_BUTTON_ENTER}
              className={style.button_reset}
              disabled={isLoading}
              type="submit">
              Отправить
            </button>
          </form>
        </Loader>
      </div>
    </div>
  );
};
