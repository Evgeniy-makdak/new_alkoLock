import * as yup from 'yup';

import type { ChangePasswordData } from '@shared/types/BaseQueryTypes';
import { ValidationMessages } from '@shared/validations/validation_messages';

// import { ValidationRules } from '@shared/validations/validation_rules';

export type Form = ChangePasswordData;

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

export const schema: yup.ObjectSchema<Form> = yup
  .object({
    currentPassword: yup
      .string()
      .required(ValidationMessages.required)
      .test({
        name: 'currentPasswordValidation',
        // @ts-expect-error: временное решение
        test: (value, ctx) => validatePassword(value, ctx),
      }),
    newPassword: yup
      .string()
      .required(ValidationMessages.required)
      .test({
        name: 'newPasswordValidation',
        // @ts-expect-error: временное решение
        test: (value, ctx) => validatePassword(value, ctx),
      }),
    confirmNewPassword: yup
      .string()
      .required(ValidationMessages.required)
      .oneOf([yup.ref('newPassword')], ValidationMessages.passwordsNotMustMatch)
      .test({
        name: 'confirmPasswordValidation',
        // @ts-expect-error: временное решение
        test: (value, ctx) => validatePassword(value, ctx),
      }),
  })
  .test({
    name: 'passwordsNotEqual',
    test: function (value) {
      if (value.currentPassword === value.newPassword) {
        return this.createError({
          path: 'newPassword',
          message: ValidationMessages.passwordsMustMatch,
        });
      }
      return true;
    },
  });
