import * as yup from 'yup';

import type { UserDataLogin } from '@shared/types/BaseQueryTypes';
import { ValidationRules } from '@shared/validations/validation_rules';

import i18n from '../../../i18n';

export type Form = UserDataLogin;

const PASSWORD_COMPLEXITY =
  /^(?=.*[a-zA-Zа-яА-Я])(?=.*\d)[a-zA-Zа-яА-Я\d!"№;%:?*()_+\-=@#$%^&*{}[\]\\|",.'<>/?`~]+$/;

const validatePassword = (value: string, ctx: yup.TestContext<Form>) => {
  if (!value) return true;

  if (value.length < 8) {
    return ctx.createError({ message: i18n.t('validation.notValidPasswordLength') });
  }

  if (!PASSWORD_COMPLEXITY.test(value)) {
    return ctx.createError({
      message: i18n.t('validation.passwordCharsetRule'),
    });
  }

  return true;
};

export const schema: yup.ObjectSchema<Form> = yup.object({
  detail: yup.string().optional(),
  password: yup
    .string()
    .required(() => i18n.t('validation.required'))
    .test({
      name: 'passwordValidation',
      // @ts-expect-error: временное решение
      test: (value, ctx) => validatePassword(value, ctx),
    }),
  username: yup
    .string()
    .required(() => i18n.t('validation.required'))
    .test({
      name: 'emailValidation',
      test: (value, ctx) => {
        if (value.length === 0) {
          return ctx.createError({ message: i18n.t('validation.required') });
        }
        const errors = ValidationRules.emailValidation(value);
        if (errors.length > 0) {
          return ctx.createError({ message: i18n.t('validation.notValidEmail') });
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
        return ctx.createError({ message: i18n.t('validation.notValidEmail') });
      }
      return true;
    },
  }),
});
