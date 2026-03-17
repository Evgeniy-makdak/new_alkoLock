import * as yup from 'yup';

import type { Value, Values } from '@shared/ui/search_multiple_select';
import { ValidationMessages } from '@shared/validations/validation_messages';

// import { ValidationRules } from '@shared/validations/validation_rules';

export interface Form {
  name: string;
  serialNumber: string | number;
  // uid?: string;
  tc: Values;
}

// 🔧 FIX: Добавляем валидацию для проверки пробелов в обязательных полях
const validateRequiredField = (value: string, context: yup.TestContext<Form>) => {
  if (!value || value.trim().length === 0) {
    return context.createError({ message: ValidationMessages.required });
  }

  if (value.match(/^\s+|\s+$/g)) {
    return context.createError({ message: 'В строке есть пробелы' });
  }

  return true;
};

export const schema: yup.ObjectSchema<Form> = yup.object({
  name: yup.string().test({
    name: 'name',
    test(value, context) {
      // @ts-expect-error временное решение
      return validateRequiredField(value, context);
    },
  }),
  serialNumber: yup
    .string()
    .test({
      name: 'serialNumber',
      test(value, context) {
        if (!value || value.trim().length === 0) {
          return context.createError({ message: 'Обязательное поле' });
        }

        if (value.match(/^\s+|\s+$/g)) {
          return context.createError({ message: 'В строке есть пробелы' });
        }

        if (value.length > 20) {
          return context.createError({ message: 'Максимальное количество символов 20' });
        }

        return true;
      },
    })
    .required(ValidationMessages.required),
  tc: yup.array<Value, Value>(),
});
