import * as yup from 'yup';

import type { Value, Values } from '@shared/ui/search_multiple_select';
import { ValidationMessages } from '@shared/validations/validation_messages';
import { ValidationRules } from '@shared/validations/validation_rules';

export interface Form {
  name: string;
  serialNumber: string | number;
  uid: string;
  tc: Values;
}

export const schema: yup.ObjectSchema<Form> = yup.object({
  name: yup.string().required(ValidationMessages.required),
  serialNumber: yup
    .string()
    .min(1, 'Минимальное количество символов 1')
    .max(20, 'Максимальное количество символов 20')
    .required(ValidationMessages.required),
  uid: yup
    .string()
    .test({
      name: 'uid',
      test(value, ctx) {
        if (value.length === 0) {
          return ctx.createError({ message: ValidationMessages.required });
        }
        if (ValidationRules.UUID4Validation(value).length > 0) {
          return ctx.createError({ message: 'Некорректный uuid4' });
        }
        return true;
      },
    })
    .required(ValidationMessages.required),
  tc: yup.array<Value, Value>(),
});
