import * as yup from 'yup';

import type { ChangePassword } from '@shared/types/BaseQueryTypes';
import { ValidationMessages } from '@shared/validations/validation_messages';

export type Form = ChangePassword;

const validatePassword = (value: string, ctx: yup.TestContext<Form>) => {
  if (!value) return true;

  // Проверка длины
  if (value.length < 8) {
    return ctx.createError({ message: 'Минимальная длина пароля должна быть 8 символов' });
  }

  // Проверка содержимого
  if (
    !/^(?=.*[a-zA-Zа-яА-Я])(?=.*\d)[a-zA-Zа-яА-Я\d!"№;%:?*()_+\-=@#$%^&*{}[\]\\|",.'<>/?`~]+$/.test(
      value,
    )
  ) {
    return ctx.createError({
      message:
        'Пароль должен содержать буквы латинского и/или кириллического алфавитов, а также цифры. Допускаются спец.символы и знаки пунктуации',
    });
  }

  return true;
};
// @ts-expect-error: временное решение
export const schema: yup.ObjectSchema<Form> = yup.object({
  newPassword: yup
    .string()
    .required(ValidationMessages.required)
    .test({
      name: 'newPasswordValidation',
      // @ts-expect-error: временное решение
      test: (value, ctx) => validatePassword(value, ctx),
    }),
  repeatNewPassword: yup
    .string()
    .required(ValidationMessages.required)
    .test({
      name: 'repeatPasswordValidation',
      // @ts-expect-error: временное решение
      test: (value, ctx) => validatePassword(value, ctx),
    })
    .oneOf([yup.ref('newPassword'), null], ValidationMessages.passwordsNotMustMatch),
});
