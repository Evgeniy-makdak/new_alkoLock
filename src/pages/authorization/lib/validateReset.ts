import * as yup from 'yup';

import { ValidationMessages } from '@shared/validations/validation_messages';

export type Form = {
  email: string;
};

export const schema: yup.ObjectSchema<any> = yup.object({
  email: yup.string().required(ValidationMessages.required).email(ValidationMessages.notValidEmail),
});
