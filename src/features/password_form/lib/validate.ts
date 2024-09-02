import * as yup from 'yup';

import type { ChangePasswordData } from '@shared/types/BaseQueryTypes';
import { ValidationMessages } from '@shared/validations/validation_messages';
import { ValidationRules } from '@shared/validations/validation_rules';

export type Form = ChangePasswordData;

export const schema: yup.ObjectSchema<Form> = yup
  .object({
    currentPassword: yup
      .string()
      .required(ValidationMessages.required)
      .test({
        name: '',
        test: (value, ctx) => {
          const errors = ValidationRules.minMaxValidation((value ?? '').length, 4, 100);
          if (errors.length > 0) {
            return ctx.createError({ message: ValidationMessages.notValidPasswordLength });
          }
          return true;
        },
      }),
    newPassword: yup
      .string()
      .required(ValidationMessages.required)
      .test({
        name: '',
        test: (value, ctx) => {
          const errors = ValidationRules.minMaxValidation((value ?? '').length, 4, 100);
          if (errors.length > 0) {
            return ctx.createError({ message: ValidationMessages.notValidPasswordLength });
          }
          return true;
        },
      }),
    confirmNewPassword: yup
      .string()
      .required(ValidationMessages.required)
      .oneOf([yup.ref('newPassword')], ValidationMessages.passwordsNotMustMatch)
      .test({
        name: '',
        test: (value, ctx) => {
          const errors = ValidationRules.minMaxValidation((value ?? '').length, 4, 100);
          if (errors.length > 0) {
            return ctx.createError({ message: ValidationMessages.notValidPasswordLength });
          }
          return true;
        },
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
