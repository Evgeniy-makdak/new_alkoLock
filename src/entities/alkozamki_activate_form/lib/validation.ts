import * as yup from 'yup';

import { ValidationMessages } from '@shared/validations/validation_messages';

export interface Form {
  duration: number;
}

export const schema: yup.ObjectSchema<Form> = yup
  .object({
    duration: yup
      .number()
      .transform((val) => (Number.isNaN(val) ? null : val))
      .nullable('значение должно быть числом')
      .positive('значение должно быть больше 0')
      .integer('значение должно быть числом')
      .required(ValidationMessages.required)
      .min(1, 'значение должно быть больше 0'),
  })
  .required(ValidationMessages.required);
