import * as yup from 'yup';

import { ValidationMessages } from '@shared/validations/validation_messages';

export type Form = {
  email: string; // email обязателен
};

export const schema: yup.ObjectSchema<Form> = yup.object({
  email: yup
    .string()
    .required(ValidationMessages.required)
    .email(ValidationMessages.notValidEmail)
    .matches(
      /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      ValidationMessages.notValidEmail,
    ) as yup.StringSchema<string>, // Явное указание типа
});
