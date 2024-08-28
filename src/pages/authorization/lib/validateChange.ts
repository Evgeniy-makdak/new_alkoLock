import * as yup from 'yup';

// import type { UserChangePassword } from '@shared/types/BaseQueryTypes';
import { ValidationMessages } from '@shared/validations/validation_messages';
// import { ValidationRules } from '@shared/validations/validation_rules';

// export type Form = UserDataLogin;

export const schema: yup.ObjectSchema<any> = yup.object({
  detail: yup.string().optional(),
  oldPassword: yup
    .string()
    .required(ValidationMessages.required)
    .min(4, ValidationMessages.notValidPasswordLength),
  newPassword: yup
    .string()
    .required(ValidationMessages.required)
    .min(4, ValidationMessages.notValidPasswordLength),
  repeatNewPassword: yup
    .string()
    .required(ValidationMessages.required)
    .when('newPassword', (password, schema) => {
      return schema.test({
        test: (repeatNewPassword) => {
          
          
        return  repeatNewPassword === password[0]},

        message: 'Пароли не совпадают',
      });
    }),
  // .test({

  // name: 'repeatNewPassword',
  // test: (value, ctx) => {
  //   if (value.length === 0) {
  //     return ctx.createError({ message: ValidationMessages.required });
  //   }
  //   if (ValidationRules.emailValidation(value).length > 0) {
  //     return ctx.createError({ message: ValidationMessages.notValidEmail });
  //   }
  //   return true;
  // },
  // }),
});
