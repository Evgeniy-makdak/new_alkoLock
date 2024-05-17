import * as yup from 'yup';

import type { UserDataLogin } from '@shared/types/BaseQueryTypes';
import { ValidationMessages } from '@shared/validations/validation_messages';
import { ValidationRules } from '@shared/validations/validation_rules';

export type Form = UserDataLogin;

export const schema: yup.ObjectSchema<Form> = yup.object({
  password: yup
    .string()
    .required(ValidationMessages.required)
    .min(4, ValidationMessages.notValidPasswordLength),
  username: yup
    .string()
    .required(ValidationMessages.required)
    .test({
      name: 'username',
      test: (value, ctx) => {
        if (value.length === 0) {
          return ctx.createError({ message: ValidationMessages.required });
        }
        if (ValidationRules.emailValidation(value).length > 0) {
          return ctx.createError({ message: ValidationMessages.notValidEmail });
        }
        return true;
      },
    }),
  rememberMe: yup.boolean().required(),
});
