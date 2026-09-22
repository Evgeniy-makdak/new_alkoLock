import * as yup from 'yup';

import type { ChangePassword } from '@shared/types/BaseQueryTypes';

import i18n from '../../../i18n';

export type Form = ChangePassword;

const PASSWORD_COMPLEXITY =
  /^(?=.*[a-zA-Zа-яА-Я])(?=.*\d)[a-zA-Zа-яА-Я\d!"№;%:?*()_+\-=@#$%^&*{}[\]\\|",.'<>/?`~]+$/;

const validatePassword = (
  value: string | undefined,
  ctx: yup.TestContext,
): true | yup.ValidationError => {
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

// Схема как раньше (только new/repeat); неполная относительно Form — через приведение типа.
export const schema = yup.object({
  newPassword: yup
    .string()
    .required(() => i18n.t('validation.required'))
    .test({
      name: 'newPasswordValidation',
      test: (value, ctx) => validatePassword(value, ctx),
    }),
  repeatNewPassword: yup
    .string()
    .required(() => i18n.t('validation.required'))
    .test({
      name: 'repeatPasswordValidation',
      test: (value, ctx) => validatePassword(value, ctx),
    })
    .oneOf([yup.ref('newPassword'), null], () => i18n.t('validation.passwordsNotMustMatch')),
}) as yup.ObjectSchema<Form>;
