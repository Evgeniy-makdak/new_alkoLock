import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper/InputsColumnWrapper';
import { testids } from '@shared/const/testid';
import { InputPassword } from '@shared/ui/InputPassword/Input';
import { Loader } from '@shared/ui/loader';
import { Logo } from '@shared/ui/logo';

import { useResetPassword } from '../hooks/useResetPassword';
import style from './Authorization.module.scss';

export const ResetPassword = () => {
  const {
    isLoading,
    handleSubmit,
    register,
    control,
    errorNewPassword,
  } = useResetPassword();

  return (
    <div className={style.authorization}>
      <div className={style.logo}>
        <Logo />
      </div>
      <div className={style.wrapper}>
        <h1 className={style.title}>Восстановление пароля</h1>
        <p className={style.changePassword}>
          Введите e-mail зарегистрированный в системе
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
                control={control}
                autoComplete="off"
                fullWidth
                type="text"
                variant="outlined"
                label="e-mail"
              />
            </InputsColumnWrapper>
            <button
              data-testid={testids.page_auth.AUTH_BUTTON_ENTER}
              className={style.button_reset}
              disabled={isLoading}
              type="submit">
              Отправить ссылку для восстановления пароля на электронную почту
            </button>
          </form>
        </Loader>
      </div>
    </div>
  );
};
