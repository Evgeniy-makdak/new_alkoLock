import * as yup from 'yup';

import type { ChangePassword } from '@shared/types/BaseQueryTypes';

import i18n from '../../../i18n';

export type Form = ChangePassword;

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

// @ts-expect-error: временное решение
export const schema: yup.ObjectSchema<Form> = yup.object({
  newPassword: yup
    .string()
    .required(() => i18n.t('validation.required'))
    .test({
      name: 'newPasswordValidation',
      // @ts-expect-error: временное решение
      test: (value, ctx) => validatePassword(value, ctx),
    }),
  repeatNewPassword: yup
    .string()
    .required(() => i18n.t('validation.required'))
    .test({
      name: 'repeatPasswordValidation',
      // @ts-expect-error: временное решение
      test: (value, ctx) => validatePassword(value, ctx),
    })
    .oneOf([yup.ref('newPassword'), null], () => i18n.t('validation.passwordsNotMustMatch')),
});
