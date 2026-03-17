import * as yup from 'yup';

import type { UserDataLogin } from '@shared/types/BaseQueryTypes';
import { ValidationMessages } from '@shared/validations/validation_messages';
import { ValidationRules } from '@shared/validations/validation_rules';

export type Form = UserDataLogin;

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

export const schema: yup.ObjectSchema<Form> = yup.object({
  detail: yup.string().optional(),
  password: yup
    .string()
    .required(ValidationMessages.required)
    .test({
      name: 'passwordValidation',
      // @ts-expect-error% временное решение
      test: (value, ctx) => validatePassword(value, ctx),
    }),
  username: yup
    .string()
    .required(ValidationMessages.required)
    .test({
      name: 'emailValidation',
      test: (value, ctx) => {
        if (value.length === 0) {
          return ctx.createError({ message: ValidationMessages.required });
        }
        const errors = ValidationRules.emailValidation(value);
        if (errors.length > 0) {
          return ctx.createError({ message: ValidationMessages.notValidEmail });
        }
        return true;
      },
    }),
  rememberMe: yup.boolean().required(),
  email: yup.string().test({
    name: 'emailValidation',
    test: (value, ctx) => {
      if (!value) return true;
      const errors = ValidationRules.emailValidation(value);
      if (errors.length > 0) {
        return ctx.createError({ message: ValidationMessages.notValidEmail });
      }
      return true;
    },
  }),
});
