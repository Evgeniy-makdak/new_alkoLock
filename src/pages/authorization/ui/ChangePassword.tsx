import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper/InputsColumnWrapper';
import { testids } from '@shared/const/testid';
import { InputPassword } from '@shared/ui/InputPassword/Input';
import { Loader } from '@shared/ui/loader';
import { Logo } from '@shared/ui/logo';

import { useChangePassword } from '../hooks/useChangePassword';
import style from './Authorization.module.scss';

export const ChangePassword = () => {
  const {
    isLoading,
    handleSubmit,
    register,
    control,
    errorPassword,
  } = useChangePassword();

  return (
    <div className={style.authorization}>
      <div className={style.logo}>
        <Logo />
      </div>
      <div className={style.wrapper}>
        <h1 className={style.title}>Смена пароля</h1>
        <p>
          Перед продолжением работы установите новый пароль. <br />
          После успешного обновления пароля вы будете перенаправлены на <br /> экран входа в
          систему.
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
                helperText={errorPassword}
                error={!!errorPassword}
                {...register('password')}
                name="password"
                control={control}
                autoComplete="off"
                fullWidth
                type={'pass'}
                variant={'outlined'}
                label="Текущий пароль"
              />
              <InputPassword
                helperText={errorPassword}
                error={!!errorPassword}
                {...register('password')}
                name="password"
                control={control}
                autoComplete="off"
                fullWidth
                type={'pass'}
                variant={'outlined'}
                label="Новый пароль"
              />
              <InputPassword
                helperText={errorPassword}
                error={!!errorPassword}
                {...register('password')}
                name="password"
                control={control}
                autoComplete="off"
                fullWidth
                type={'pass'}
                variant={'outlined'}
                label="Подтверждение пароля"
              />
              <input type="submit" style={{ display: 'none' }} />
            </InputsColumnWrapper>
            <button
              data-testid={testids.page_auth.AUTH_BUTTON_ENTER}
              className={style.button}
              disabled={isLoading}
              type="submit">
              Установить новый пароль
            </button>
          </form>
        </Loader>
      </div>
    </div>
  );
};
