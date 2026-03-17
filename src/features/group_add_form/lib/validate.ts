import * as yup from 'yup';

import { ValidationMessages } from '@shared/validations/validation_messages';

export interface Form {
  name: string;
}

// 🔧 FIX: Добавляем валидацию для проверки пробелов в обязательных полях
const validateRequiredField = (value: string, context: yup.TestContext<Form>) => {
  if (!value || value.trim().length === 0) {
    return context.createError({ message: ValidationMessages.required });
  }

  if (value.match(/^\s+|\s+$/g)) {
    // return context.createError({ message: 'В строке есть пробелы' });
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
});
