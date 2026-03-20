import * as yup from 'yup';

import type { ChangePasswordData } from '@shared/types/BaseQueryTypes';

import i18n from '../../../i18n';

export type Form = ChangePasswordData;

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

export const schema: yup.ObjectSchema<Form> = yup
  .object({
    currentPassword: yup
      .string()
      .required(() => i18n.t('validation.required'))
      .test({
        name: 'currentPasswordValidation',
        // @ts-expect-error: временное решение
        test: (value, ctx) => validatePassword(value, ctx),
      }),
    newPassword: yup
      .string()
      .required(() => i18n.t('validation.required'))
      .test({
        name: 'newPasswordValidation',
        // @ts-expect-error: временное решение
        test: (value, ctx) => validatePassword(value, ctx),
      }),
    confirmNewPassword: yup
      .string()
      .required(() => i18n.t('validation.required'))
      .oneOf([yup.ref('newPassword')], () => i18n.t('validation.passwordsNotMustMatch'))
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
          message: i18n.t('validation.newPasswordMustDifferFromCurrent'),
        });
      }
      return true;
    },
  });
