import * as yup from 'yup';
import { ValidationMessages } from '@shared/validations/validation_messages';
import type { ChangePassword } from '@shared/types/BaseQueryTypes';

export type Form = ChangePassword;

export const schema: yup.ObjectSchema<any> = yup.object({
  newPassword: yup
    .string()
    .required(ValidationMessages.required)
    .min(4, ValidationMessages.notValidPasswordLength),
  repeatNewPassword: yup
    .string()
    .required(ValidationMessages.required)
    .oneOf([yup.ref('newPassword'), null], ValidationMessages.passwordsMustMatch),
});
