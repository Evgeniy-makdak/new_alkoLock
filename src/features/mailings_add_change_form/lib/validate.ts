import * as yup from 'yup';

import { ValidationMessages } from '@shared/validations/validation_messages';
import { ValidationRules } from '@shared/validations/validation_rules';

export interface Form {
  name?: string;
  eventTypes?: string[];
}

export interface TimeInterval {
  id: string;
  startTime: string;
  endTime: string;
}

export const schema = yup.object({
  name: yup
    .string()
    .required(ValidationMessages.required)
    .test('email', ValidationMessages.email, (value) => {
      if (!value) return false;
      const emailErrors = ValidationRules.emailValidation(value);
      return emailErrors.length === 0;
    }),
  eventTypes: yup.array().of(yup.string()).min(1, 'Выберите хотя бы один тип события'),
});
